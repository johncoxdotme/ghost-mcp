import GhostAdminAPI from "@tryghost/admin-api";
import dotenv from "dotenv";

dotenv.config();

const { GHOST_URL, GHOST_ADMIN_API_KEY } = process.env;

if (!GHOST_URL || !GHOST_ADMIN_API_KEY) {
  throw new Error(
    "Missing required env vars: GHOST_URL and GHOST_ADMIN_API_KEY"
  );
}

export const ghost = new GhostAdminAPI({
  url: GHOST_URL,
  key: GHOST_ADMIN_API_KEY,
  version: "v5.0",
});

// ── Types ──────────────────────────────────────────────────────────────────

export interface GhostPost {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "scheduled";
  html?: string;
  lexical?: string;
  excerpt?: string;
  tags?: { name: string; slug: string }[];
  authors?: { name: string; email: string }[];
  published_at?: string;
  created_at?: string;
  updated_at?: string;
  url?: string;
}

export interface GhostTag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  count?: { posts: number };
}

export interface GhostMember {
  id: string;
  name?: string;
  email: string;
  status: "free" | "paid" | "comped";
  created_at?: string;
  labels?: { name: string }[];
}

// ── Post helpers ───────────────────────────────────────────────────────────

export async function listPosts(opts: {
  limit?: number;
  status?: string;
  tag?: string;
  page?: number;
}): Promise<GhostPost[]> {
  const filter = [
    opts.status ? `status:${opts.status}` : "status:[draft,published,scheduled]",
    opts.tag ? `tag:${opts.tag}` : null,
  ]
    .filter(Boolean)
    .join("+");

  return ghost.posts.browse({
    limit: opts.limit ?? 15,
    page: opts.page ?? 1,
    filter,
    include: ["tags", "authors"],
    fields: ["id", "title", "slug", "status", "excerpt", "published_at", "url"],
  }) as Promise<GhostPost[]>;
}

export async function getPost(idOrSlug: string): Promise<GhostPost> {
  // Try by ID first, fall back to slug
  const isId = /^[a-f0-9]{24}$/.test(idOrSlug);
  if (isId) {
    return ghost.posts.read({ id: idOrSlug }, { include: ["tags", "authors"] }) as Promise<GhostPost>;
  }
  return ghost.posts.read({ slug: idOrSlug }, { include: ["tags", "authors"] }) as Promise<GhostPost>;
}

export async function createPost(opts: {
  title: string;
  html?: string;
  status?: "draft" | "published";
  tags?: string[];
  excerpt?: string;
  published_at?: string;
}): Promise<GhostPost> {
  const tags = opts.tags?.map((t) => ({ name: t }));
  return ghost.posts.add(
    {
      title: opts.title,
      html: opts.html ?? "",
      status: opts.status ?? "draft",
      tags,
      custom_excerpt: opts.excerpt,
      published_at: opts.published_at,
    },
    { source: "html" }
  ) as Promise<GhostPost>;
}

export async function updatePost(
  id: string,
  fields: Partial<{
    title: string;
    html: string;
    status: "draft" | "published" | "scheduled";
    tags: string[];
    excerpt: string;
    published_at: string;
  }>
): Promise<GhostPost> {
  const current = await ghost.posts.read({ id }) as GhostPost & { updated_at: string };
  const tags = fields.tags?.map((t) => ({ name: t }));
  return ghost.posts.edit(
    {
      id,
      updated_at: current.updated_at,
      ...(fields.title && { title: fields.title }),
      ...(fields.html !== undefined && { html: fields.html }),
      ...(fields.status && { status: fields.status }),
      ...(tags && { tags }),
      ...(fields.excerpt && { custom_excerpt: fields.excerpt }),
      ...(fields.published_at && { published_at: fields.published_at }),
    },
    { source: "html" }
  ) as Promise<GhostPost>;
}

export async function publishPost(id: string): Promise<GhostPost> {
  return updatePost(id, { status: "published" });
}

export async function deletePost(id: string): Promise<void> {
  await ghost.posts.delete({ id });
}

// ── Tag helpers ────────────────────────────────────────────────────────────

export async function listTags(limit = 50): Promise<GhostTag[]> {
  return ghost.tags.browse({
    limit,
    include: ["count.posts"],
  }) as Promise<GhostTag[]>;
}

// ── Member helpers ─────────────────────────────────────────────────────────

export async function listMembers(opts: {
  limit?: number;
  status?: string;
  page?: number;
}): Promise<GhostMember[]> {
  const filter = opts.status ? `status:${opts.status}` : undefined;
  return ghost.members.browse({
    limit: opts.limit ?? 20,
    page: opts.page ?? 1,
    ...(filter && { filter }),
  }) as Promise<GhostMember[]>;
}

// ── Site settings ──────────────────────────────────────────────────────────

export async function getSiteSettings(): Promise<Record<string, unknown>> {
  return ghost.settings.browse() as Promise<Record<string, unknown>>;
}

// ── Image upload ───────────────────────────────────────────────────────────

export async function uploadImage(
  filePath: string,
  purpose: "image" | "icon" | "logo" = "image"
): Promise<{ url: string }> {
  return ghost.images.upload({ file: filePath, purpose }) as Promise<{ url: string }>;
}