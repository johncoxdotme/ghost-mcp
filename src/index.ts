#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { tools, toolMap } from "./tools.js";

// ── Server setup ───────────────────────────────────────────────────────────

const server = new Server(
  {
    name: "ghost-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ── List tools ─────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(t.inputSchema),
  })),
}));

// ── Call tool ──────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const tool = toolMap.get(name);

  if (!tool) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  // Validate input
  const parsed = tool.inputSchema.safeParse(args ?? {});
  if (!parsed.success) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid input for ${name}: ${parsed.error.message}`
    );
  }

  try {
    const result = await tool.handler(parsed.data);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new McpError(ErrorCode.InternalError, `Ghost API error: ${msg}`);
  }
});

// ── Minimal Zod → JSON Schema converter ───────────────────────────────────
// (Avoids pulling in zod-to-json-schema; handles the shapes we actually use)

function zodToJsonSchema(schema: import("zod").ZodTypeAny): object {
  const def = schema._def;

  if (def.typeName === "ZodObject") {
    const shape = def.shape();
    const properties: Record<string, object> = {};
    const required: string[] = [];

    for (const [key, val] of Object.entries(shape)) {
      const fieldSchema = val as import("zod").ZodTypeAny;
      properties[key] = zodToJsonSchema(fieldSchema);
      if (!fieldSchema.isOptional()) required.push(key);
    }

    return { type: "object", properties, required };
  }

  if (def.typeName === "ZodString")
    return { type: "string", description: def.description ?? "" };
  if (def.typeName === "ZodNumber")
    return {
      type: "number",
      description: def.description ?? "",
      ...(def.checks?.find((c: { kind: string }) => c.kind === "min") && {
        minimum: def.checks.find((c: { kind: string }) => c.kind === "min").value,
      }),
      ...(def.checks?.find((c: { kind: string }) => c.kind === "max") && {
        maximum: def.checks.find((c: { kind: string }) => c.kind === "max").value,
      }),
    };
  if (def.typeName === "ZodEnum")
    return { type: "string", enum: def.values, description: def.description ?? "" };
  if (def.typeName === "ZodArray")
    return { type: "array", items: zodToJsonSchema(def.type), description: def.description ?? "" };
  if (def.typeName === "ZodOptional")
    return zodToJsonSchema(def.innerType);
  if (def.typeName === "ZodDefault")
    return { ...zodToJsonSchema(def.innerType), default: def.defaultValue() };

  return {};
}

// ── Start ──────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Ghost MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});