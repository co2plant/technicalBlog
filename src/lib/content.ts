import { promises as fs } from "node:fs";
import path from "node:path";
import { Marked } from "marked";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");
const POST_ASSETS_DIR = path.join(process.cwd(), "public", "posts");
const POST_EXTENSIONS = new Set([".md", ".mdx"]);
const DOWNLOADABLE_EXTENSIONS = new Set([".pdf", ".ppt", ".pptx"]);
const UNCATEGORIZED_POST_CATEGORY = "uncategorized";

type PostFile = {
  category: string;
  fullPath: string;
  fileName: string;
};

export type PostAttachment = {
  name: string;
  kind: "pdf" | "ppt" | "pptx";
  url: string;
};

export type Post = {
  title: string;
  slug: string;
  category: string;
  description: string;
  excerpt: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  tags: string[];
  originalUrl?: string;
  coverImage?: string;
  embeddedPdf?: string;
  allowPdfDownload: boolean;
  draft: boolean;
  extension: "md" | "mdx";
  body: string;
  html: string;
  attachments: PostAttachment[];
};

export type ParsedFrontmatter = Omit<Post, "body" | "html" | "attachments" | "category" | "extension">;

const UNSUPPORTED_MDX_PATTERNS = [
  {
    pattern: /^\s*import\s.+from\s+['"][^'"]+['"];?\s*$/m,
    message: "import statements are not supported",
  },
  {
    pattern: /^\s*export\s+(?:const|function|class|default)\b/m,
    message: "export statements are not supported",
  },
  {
    pattern: /<\/?[A-Za-z][A-Za-z0-9.-]*(?:\s[^>]*)?\/?>(?:\s*<\/\s*[A-Za-z][A-Za-z0-9.-]*\s*>)?/m,
    message: "HTML or JSX-style tags are not supported",
  },
  {
    pattern: /(^|\n)\s*\{[^\n{}][^\n]*\}\s*(?=\n|$)/m,
    message: "inline expressions are not supported",
  },
] as const;

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
  const postFiles = await collectPostFiles(POSTS_DIR);
  const posts = await Promise.all(postFiles.map((postFile) => readPostFile(postFile)));

  return posts.sort(comparePostsByPublishedAtDescending);
}

export async function getPublishedPosts(): Promise<Post[]> {
  return (await getAllPosts()).filter((post) => !post.draft);
}

export async function getPublishedPortfolioPosts(): Promise<Post[]> {
  return (await getPublishedPosts()).filter((post) => post.category === "portfolio");
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const posts = await getAllPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

async function readPostFile({ category, fullPath, fileName }: PostFile): Promise<Post> {
  const fileContent = await fs.readFile(fullPath, "utf8");
  const slugFromFileName = path.basename(fileName, path.extname(fileName));
  const extension = path.extname(fileName).slice(1) as Post["extension"];
  const { frontmatter, body } = parseFrontmatter(fileContent, slugFromFileName);
  assertSupportedPostSyntax(body, extension, slugFromFileName);
  const attachments = await readAttachments(frontmatter.slug);

  return {
    ...frontmatter,
    category,
    extension,
    body,
    html: renderMarkdown(body),
    attachments,
  };
}

async function collectPostFiles(directory: string): Promise<PostFile[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const postFiles = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectPostFiles(fullPath);
      }

      if (!entry.isFile() || !isPostFileName(entry.name)) {
        return [];
      }

      return [
        {
          category: getPostCategoryFromPath(fullPath),
          fullPath,
          fileName: entry.name,
        },
      ];
    }),
  );

  return postFiles.flat();
}

function isPostFileName(fileName: string): boolean {
  return POST_EXTENSIONS.has(path.extname(fileName)) && path.basename(fileName, path.extname(fileName)).toLowerCase() !== "readme";
}

function getPostCategoryFromPath(fullPath: string): string {
  const relativePath = path.relative(POSTS_DIR, fullPath);
  const [category] = relativePath.split(path.sep);

  if (!category || category === path.basename(relativePath)) {
    return UNCATEGORIZED_POST_CATEGORY;
  }

  return category;
}

export function parseFrontmatter(source: string, slugFromFileName: string): {
  frontmatter: ParsedFrontmatter;
  body: string;
} {
  const normalizedSource = normalizeLineEndings(source);
  const frontmatterMatch = normalizedSource.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!frontmatterMatch) {
    throw new Error(`Missing frontmatter block in post: ${slugFromFileName}`);
  }

  const [, frontmatterBlock, body] = frontmatterMatch;
  const rawFrontmatter = parseYamlLikeFrontmatter(frontmatterBlock);

  return {
    frontmatter: buildParsedFrontmatter(rawFrontmatter, slugFromFileName),
    body: body.trim(),
  };
}

function buildParsedFrontmatter(rawFrontmatter: Record<string, unknown>, slugFromFileName: string): ParsedFrontmatter {
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
  const coverImage = normalizePostAssetReference(optionalString(rawFrontmatter.coverImage), slug);
  const embeddedPdf = normalizePostAssetReference(optionalString(rawFrontmatter.embeddedPdf), slug);
  const allowPdfDownload = optionalBoolean(rawFrontmatter.allowPdfDownload, "allowPdfDownload", slugFromFileName) ?? true;

  parseDateOnlyToUtcTimestamp(publishedAt, "publishedAt", slugFromFileName);

  if (updatedAt) {
    parseDateOnlyToUtcTimestamp(updatedAt, "updatedAt", slugFromFileName);
  }

  if (slug !== slugFromFileName) {
    throw new Error(`Frontmatter slug mismatch in ${slugFromFileName}: expected ${slugFromFileName}, received ${slug}`);
  }

  return {
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
    embeddedPdf,
    allowPdfDownload,
    draft,
  };
}

export function assertSupportedPostSyntax(body: string, extension: Post["extension"], slug: string): void {
  if (extension !== "mdx") {
    return;
  }

  const normalizedBody = normalizeLineEndings(body);
  const bodyWithoutCodeFences = stripMarkdownCodeFences(normalizedBody);

  for (const rule of UNSUPPORTED_MDX_PATTERNS) {
    if (rule.pattern.test(bodyWithoutCodeFences)) {
      throw new Error(`Unsupported MDX syntax in post: ${slug}. ${rule.message}.`);
    }
  }
}

export function buildPostAssetUrl(slug: string, fileName: string): string {
  return `/posts/${encodePathSegment(slug)}/${encodePathSegment(fileName)}`;
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

function comparePostsByPublishedAtDescending(left: Pick<Post, "publishedAt">, right: Pick<Post, "publishedAt">): number {
  return parseDateOnlyToUtcTimestamp(right.publishedAt, "publishedAt", "<sort comparator>") - parseDateOnlyToUtcTimestamp(left.publishedAt, "publishedAt", "<sort comparator>");
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function stripMarkdownCodeFences(value: string): string {
  return value.replace(/(^|\n)(```|~~~)[^\n]*\n[\s\S]*?\n\2(?=\n|$)/g, "$1");
}

function parseDateOnlyToUtcTimestamp(value: string, field: string, slug: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new Error(`Invalid ${field} in post: ${slug}. Use YYYY-MM-DD.`);
  }

  const [, yearString, monthString, dayString] = match;
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsedDate = new Date(timestamp);

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new Error(`Invalid ${field} in post: ${slug}. Use a real calendar date in YYYY-MM-DD.`);
  }

  return timestamp;
}

function normalizePostAssetReference(value: string | undefined, slug: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const match = /^\/posts\/([^/]+)\/(.+)$/.exec(value);

  if (!match) {
    return value;
  }

  const [, assetSlugSegment, assetFileSegment] = match;
  const decodedSlug = safeDecodeURIComponent(assetSlugSegment);

  if (decodedSlug !== slug) {
    return value;
  }

  return buildPostAssetUrl(slug, safeDecodeURIComponent(assetFileSegment));
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

function optionalBoolean(value: unknown, field: string, slug: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(`Invalid ${field} in post: ${slug}. Use true or false.`);
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
        url: buildPostAssetUrl(slug, fileName),
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

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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
