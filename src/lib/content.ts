import { promises as fs } from "node:fs";
import path from "node:path";
import { Marked } from "marked";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");
const POST_ASSETS_DIR = path.join(process.cwd(), "public", "posts");
const POST_EXTENSIONS = new Set([".md", ".mdx"]);
const DOWNLOADABLE_EXTENSIONS = new Set([".pdf", ".ppt", ".pptx"]);

export type PostAttachment = {
  name: string;
  kind: "pdf" | "ppt" | "pptx";
  url: string;
};

export type Post = {
  title: string;
  slug: string;
  description: string;
  excerpt: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  tags: string[];
  originalUrl?: string;
  coverImage?: string;
  draft: boolean;
  extension: "md" | "mdx";
  body: string;
  html: string;
  attachments: PostAttachment[];
};

type ParsedFrontmatter = Omit<Post, "body" | "html" | "attachments" | "extension">;

const markdown = new Marked({
  async: false,
  gfm: true,
  breaks: true,
  renderer: {
    html() {
      return "";
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);

      if (!href || !isSafeLink(href)) {
        return text;
      }

      const safeHref = escapeAttribute(href);
      const safeTitle = title ? ` title="${escapeAttribute(title)}"` : "";

      return `<a href="${safeHref}"${safeTitle} rel="noopener noreferrer">${text}</a>`;
    },
    image({ href, title, text }) {
      if (!href || !isSafeAsset(href)) {
        return escapeHtml(text);
      }

      const safeHref = escapeAttribute(href);
      const safeAlt = escapeHtml(text);
      const safeTitle = title ? ` title="${escapeAttribute(title)}"` : "";

      return `<img src="${safeHref}" alt="${safeAlt}" loading="lazy"${safeTitle} />`;
    },
  },
});

export async function getAllPosts(): Promise<Post[]> {
  const fileNames = await fs.readdir(POSTS_DIR);
  const posts = await Promise.all(
    fileNames
      .filter(
        (fileName) =>
          POST_EXTENSIONS.has(path.extname(fileName)) && path.basename(fileName, path.extname(fileName)).toLowerCase() !== "readme",
      )
      .map((fileName) => readPostFile(fileName)),
  );

  return posts.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts.filter((post) => !post.draft);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const posts = await getAllPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

async function readPostFile(fileName: string): Promise<Post> {
  const fullPath = path.join(POSTS_DIR, fileName);
  const fileContent = await fs.readFile(fullPath, "utf8");
  const slugFromFileName = path.basename(fileName, path.extname(fileName));
  const extension = path.extname(fileName).slice(1) as Post["extension"];
  const { frontmatter, body } = parseFrontmatter(fileContent, slugFromFileName);
  const attachments = await readAttachments(frontmatter.slug);

  return {
    ...frontmatter,
    extension,
    body,
    html: renderMarkdown(body),
    attachments,
  };
}

function parseFrontmatter(source: string, slugFromFileName: string): {
  frontmatter: ParsedFrontmatter;
  body: string;
} {
  const frontmatterMatch = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!frontmatterMatch) {
    throw new Error(`Missing frontmatter block in post: ${slugFromFileName}`);
  }

  const [, frontmatterBlock, body] = frontmatterMatch;
  const rawFrontmatter = parseYamlLikeFrontmatter(frontmatterBlock);

  const title = requireString(rawFrontmatter.title, "title", slugFromFileName);
  const slug = requireString(rawFrontmatter.slug, "slug", slugFromFileName);
  const description = requireString(rawFrontmatter.description, "description", slugFromFileName);
  const excerpt = requireString(rawFrontmatter.excerpt, "excerpt", slugFromFileName);
  const publishedAt = requireString(rawFrontmatter.publishedAt, "publishedAt", slugFromFileName);
  const author = requireString(rawFrontmatter.author, "author", slugFromFileName);
  const tags = requireStringArray(rawFrontmatter.tags, "tags", slugFromFileName);
  const draft = rawFrontmatter.draft === true;
  const updatedAt = optionalString(rawFrontmatter.updatedAt);
  const originalUrl = optionalString(rawFrontmatter.originalUrl);
  const coverImage = optionalString(rawFrontmatter.coverImage);

  if (slug !== slugFromFileName) {
    throw new Error(`Frontmatter slug mismatch in ${slugFromFileName}: expected ${slugFromFileName}, received ${slug}`);
  }

  return {
    frontmatter: {
      title,
      slug,
      description,
      excerpt,
      publishedAt,
      updatedAt,
      author,
      tags,
      originalUrl,
      coverImage,
      draft,
    },
    body: body.trim(),
  };
}

function parseYamlLikeFrontmatter(block: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = block.split("\n");
  let currentArrayKey: string | null = null;

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const arrayItemMatch = line.match(/^\s*-\s+(.*)$/);

    if (arrayItemMatch && currentArrayKey) {
      const list = result[currentArrayKey];

      if (!Array.isArray(list)) {
        throw new Error(`Invalid array frontmatter entry for ${currentArrayKey}`);
      }

      list.push(parseScalar(arrayItemMatch[1]));
      continue;
    }

    currentArrayKey = null;
    const keyValueMatch = line.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/);

    if (!keyValueMatch) {
      throw new Error(`Invalid frontmatter line: ${line}`);
    }

    const [, key, rawValue] = keyValueMatch;

    if (!rawValue.trim()) {
      result[key] = [];
      currentArrayKey = key;
      continue;
    }

    result[key] = parseScalar(rawValue);
  }

  return result;
}

function parseScalar(rawValue: string): unknown {
  const trimmed = rawValue.trim();

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  return trimmed;
}

function requireString(value: unknown, field: string, slug: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing or invalid ${field} in post: ${slug}`);
  }

  return value;
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  return value;
}

function requireStringArray(value: unknown, field: string, slug: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`Missing or invalid ${field} array in post: ${slug}`);
  }

  return value;
}

async function readAttachments(slug: string): Promise<PostAttachment[]> {
  const assetDirectory = path.join(POST_ASSETS_DIR, slug);

  try {
    const files = await fs.readdir(assetDirectory);

    return files
      .filter((fileName) => DOWNLOADABLE_EXTENSIONS.has(path.extname(fileName).toLowerCase()))
      .map((fileName) => ({
        name: fileName,
        kind: path.extname(fileName).slice(1).toLowerCase() as PostAttachment["kind"],
        url: `/posts/${slug}/${fileName}`,
      }));
  } catch (error) {
    if (isMissingDirectory(error)) {
      return [];
    }

    throw error;
  }
}

function renderMarkdown(source: string): string {
  return markdown.parse(source, { async: false });
}

function isMissingDirectory(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isSafeLink(href: string): boolean {
  return /^(https?:|mailto:|\/|#)/i.test(href);
}

function isSafeAsset(href: string): boolean {
  return /^(https?:|\/)/i.test(href);
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
