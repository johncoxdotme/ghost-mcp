import { z } from "zod";
import {
  listPosts, getPost, createPost, updatePost,
  publishPost, deletePost, listTags, listMembers,
  getSiteSettings, uploadImage,
} from "./ghost-client.js";

// ── Tool registry type ─────────────────────────────────────────────────────

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  handler: (input: unknown) => Promise<unknown>;
}

// ── Tool definitions ───────────────────────────────────────────────────────

export const tools: ToolDef[] = [
  // LIST POSTS
  {
    name: "list_posts",
    description:
      "List Ghost blog posts. Filter by status (draft/published/scheduled) and/or tag. Returns id, title, slug, status, excerpt, url.",
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).default(15).describe("Number of posts to return (default 15)"),
      page: z.number().int().min(1).default(1).describe("Page number for pagination"),
      status: z.enum(["draft", "published", "scheduled"]).optional().describe("Filter by post status"),
      tag: z.string().optional().describe("Filter by tag slug"),
    }),
    handler: async (input) => {
      const i = input as { limit: number; page: number; status?: string; tag?: string };
      return listPosts(i);
    },
  },

  // GET POST
  {
    name: "get_post",
    description:
      "Retrieve a single Ghost post by its ID or slug, including full HTML content, tags, and authors.",
    inputSchema: z.object({
      id_or_slug: z.string().describe("Post ID (24-char hex) or slug (e.g. 'my-post-title')"),
    }),
    handler: async (input) => {
      const { id_or_slug } = input as { id_or_slug: string };
      return getPost(id_or_slug);
    },
  },

  // CREATE POST
  {
    name: "create_post",
    description:
      "Create a new Ghost post. Defaults to draft status. HTML content is accepted directly.",
    inputSchema: z.object({
      title: z.string().min(1).describe("Post title"),
      html: z.string().optional().describe("Post body as HTML"),
      status: z.enum(["draft", "published"]).default("draft").describe("Publish immediately or save as draft"),
      tags: z.array(z.string()).optional().describe("List of tag names to apply"),
      excerpt: z.string().optional().describe("Short custom excerpt shown in listings"),
      published_at: z.string().optional().describe("ISO 8601 datetime to schedule publishing"),
    }),
    handler: async (input) => {
      return createPost(input as Parameters<typeof createPost>[0]);
    },
  },

  // UPDATE POST
  {
    name: "update_post",
    description:
      "Update an existing Ghost post by ID. Only supply fields you want to change.",
    inputSchema: z.object({
      id: z.string().describe("Post ID (24-char hex)"),
      title: z.string().optional().describe("New title"),
      html: z.string().optional().describe("New HTML body content"),
      status: z.enum(["draft", "published", "scheduled"]).optional().describe("Change post status"),
      tags: z.array(z.string()).optional().describe("Replace tag list with these names"),
      excerpt: z.string().optional().describe("New custom excerpt"),
      published_at: z.string().optional().describe("New scheduled publish datetime (ISO 8601)"),
    }),
    handler: async (input) => {
      const { id, ...fields } = input as { id: string } & Parameters<typeof updatePost>[1];
      return updatePost(id, fields);
    },
  },

  // PUBLISH POST
  {
    name: "publish_post",
    description: "Immediately publish a draft Ghost post by ID.",
    inputSchema: z.object({
      id: z.string().describe("Post ID of the draft to publish"),
    }),
    handler: async (input) => {
      const { id } = input as { id: string };
      return publishPost(id);
    },
  },

  // DELETE POST
  {
    name: "delete_post",
    description: "Permanently delete a Ghost post by ID. This cannot be undone.",
    inputSchema: z.object({
      id: z.string().describe("Post ID to delete"),
    }),
    handler: async (input) => {
      const { id } = input as { id: string };
      await deletePost(id);
      return { success: true, deleted_id: id };
    },
  },

  // LIST TAGS
  {
    name: "list_tags",
    description: "List all tags on the Ghost site, including post counts.",
    inputSchema: z.object({
      limit: z.number().int().min(1).max(300).default(50).describe("Max tags to return"),
    }),
    handler: async (input) => {
      const { limit } = input as { limit: number };
      return listTags(limit);
    },
  },

  // LIST MEMBERS
  {
    name: "list_members",
    description: "List Ghost site members/subscribers. Filter by status (free/paid/comped).",
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).default(20).describe("Number of members to return"),
      page: z.number().int().min(1).default(1).describe("Page number for pagination"),
      status: z.enum(["free", "paid", "comped"]).optional().describe("Filter by membership tier"),
    }),
    handler: async (input) => {
      return listMembers(input as Parameters<typeof listMembers>[0]);
    },
  },

  // GET SITE SETTINGS
  {
    name: "get_site_settings",
    description: "Retrieve Ghost site settings including title, description, timezone, and feature flags.",
    inputSchema: z.object({}),
    handler: async () => {
      return getSiteSettings();
    },
  },

  // UPLOAD IMAGE
  {
    name: "upload_image",
    description: "Upload an image file to Ghost media storage. Returns the CDN URL.",
    inputSchema: z.object({
      file_path: z.string().describe("Absolute local path to the image file"),
      purpose: z.enum(["image", "icon", "logo"]).default("image").describe("Image purpose"),
    }),
    handler: async (input) => {
      const { file_path, purpose } = input as { file_path: string; purpose: "image" | "icon" | "logo" };
      return uploadImage(file_path, purpose);
    },
  },
];

// Lookup map for fast dispatch
export const toolMap = new Map(tools.map((t) => [t.name, t]));