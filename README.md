# Ghost MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server for the [Ghost](https://ghost.org) blogging platform. Connect Claude and other MCP-compatible AI clients directly to your Ghost blog.

Works with **self-hosted Ghost** and **Ghost(Pro)**.

---

## Features

| Tool | Description |
|---|---|
| `list_posts` | List posts filtered by status and/or tag |
| `get_post` | Fetch a single post by ID or slug |
| `create_post` | Create a draft or published post |
| `update_post` | Edit any fields of an existing post |
| `publish_post` | Publish a draft immediately |
| `delete_post` | Permanently delete a post |
| `list_tags` | List all tags with post counts |
| `list_members` | List subscribers by tier |
| `get_site_settings` | Fetch site name, timezone, feature flags |
| `upload_image` | Upload an image and get back a CDN URL |

---

## Requirements

- Node.js 18+
- A Ghost site (self-hosted v5+ or Ghost Pro)
- A Ghost Admin API key

---

## Setup

### 1. Get your Ghost Admin API Key

1. Go to your Ghost Admin panel
2. Navigate to **Settings → Integrations**
3. Click **Add custom integration**
4. Name it (e.g. `Claude MCP`)
5. Copy the **Admin API Key**

### 2. Install

```bash
git clone https://github.com/johncoxdotme/ghost-mcp.git
cd ghost-mcp
npm install
```

### 3. Configure

```bash
cp .env.example .env
```

Edit `.env`:

```
GHOST_URL=https://yourblog.com
GHOST_ADMIN_API_KEY=your_key_here
```

### 4. Build

```bash
npm run build
```

### 5. Connect to Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "ghost": {
      "command": "node",
      "args": ["/absolute/path/to/ghost-mcp-server/dist/index.js"],
      "env": {
        "GHOST_URL": "https://yourblog.com",
        "GHOST_ADMIN_API_KEY": "your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. You should see the Ghost tools available.

---

## Development

```bash
npm run dev   # tsx watch mode — auto-reloads on save
```

---

## Adding New Tools

1. Add your Ghost API helper to `src/ghost-client.ts`
2. Add a new `ToolDef` entry to the `tools` array in `src/tools.ts`
3. Rebuild with `npm run build`

That's it — no changes needed to `index.ts`.

---

## Project Structure

```
ghost-mcp-server/
├── src/
│   ├── index.ts          # MCP server, request handlers
│   ├── tools.ts          # Tool definitions + dispatch
│   └── ghost-client.ts   # Ghost Admin API wrapper
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## License

MIT — contributions welcome!# ghost-mcp

A Model Context Protocol (MCP) server for [Ghost](https://ghost.org) — the open source publishing platform.
