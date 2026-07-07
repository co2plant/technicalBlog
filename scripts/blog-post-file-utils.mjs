import { existsSync, readFileSync, readdirSync } from "node:fs";
import path, { extname, join, relative, resolve } from "node:path";
import { Marked } from "marked";

export const POSTS_DIR = resolve("content", "posts");
export const POST_ASSETS_DIR = resolve("public", "posts");
export const POST_EXTENSIONS = new Set([".md", ".mdx"]);
export const DOWNLOADABLE_EXTENSIONS = new Set([".pdf", ".ppt", ".pptx"]);

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
    pattern: /<\/?[A-Za-z][A-Za-z0-9.-]*(?:\s[^>]*)?\/?>(?:\s*<\/\s*[A-Za-z0-9.-]+\s*>)?/m,
    message: "HTML or JSX-style tags are not supported",
  },
  {
    pattern: /(^|\n)\s*\{[^\n{}][^\n]*\}\s*(?=\n|$)/m,
    message: "inline expressions are not supported",
  },
];

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

      if (!href || !/^(https?:|mailto:|\/|#)/i.test(href)) {
        return text;
      }

      const safeHref = escapeAttribute(href);
      const safeTitle = title ? ` title="${escapeAttribute(title)}"` : "";

      return `<a href="${safeHref}"${safeTitle} rel="noopener noreferrer">${text}</a>`;
    },
    image({ href, title, text }) {
      if (!href || !/^(https?:|\/)/i.test(href)) {
        return escapeHtml(text);
      }

      const safeHref = escapeAttribute(href);
      const safeAlt = escapeHtml(text);
      const safeTitle = title ? ` title="${escapeAttribute(title)}"` : "";

      return `<img src="${safeHref}" alt="${safeAlt}" loading="lazy"${safeTitle} />`;
    },
  },
});

export function collectPostFiles(directory = POSTS_DIR) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectPostFiles(fullPath));
      continue;
    }

    if (entry.isFile() && isPostFileName(entry.name)) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

export function readPostFile(fullPath) {
  const fileContent = readFileSync(fullPath, "utf8");
  const fileName = path.basename(fullPath);
  const slugFromFileName = path.basename(fileName, extname(fileName));
  const category = getPostCategoryFromPath(fullPath);
  const extension = extname(fileName).slice(1);
  const { frontmatter, body } = parseFrontmatter(fileContent, slugFromFileName);

  assertSupportedPostSyntax(body, extension, slugFromFileName);

  return {
    ...frontmatter,
    legacySlug: frontmatter.slug,
    category,
    extension,
    body,
    html: renderMarkdown(body),
    assets: readPostAssets(frontmatter.slug, frontmatter.coverImage, frontmatter.embeddedPdf),
  };
}

export function parseFrontmatter(source, slugFromFileName) {
  const normalizedSource = source.replace(/\r\n?/g, "\n");
  const frontmatterMatch = normalizedSource.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!frontmatterMatch) {
    throw new Error(`Missing frontmatter block in post: ${slugFromFileName}`);
  }

  const [, frontmatterBlock, body] = frontmatterMatch;
  const rawFrontmatter = parseYamlLikeFrontmatter(frontmatterBlock);
  const slug = requireString(rawFrontmatter.slug, "slug", slugFromFileName);

  if (slug !== slugFromFileName) {
    throw new Error(`Frontmatter slug mismatch in ${slugFromFileName}: expected ${slugFromFileName}, received ${slug}`);
  }

  const publishedAt = requireString(rawFrontmatter.publishedAt, "publishedAt", slugFromFileName);
  const updatedAt = optionalString(rawFrontmatter.updatedAt);

  parseDateOnlyToUtcTimestamp(publishedAt, "publishedAt", slugFromFileName);

  if (updatedAt) {
    parseDateOnlyToUtcTimestamp(updatedAt, "updatedAt", slugFromFileName);
  }

  return {
    frontmatter: {
      title: requireString(rawFrontmatter.title, "title", slugFromFileName),
      slug,
      description: requireString(rawFrontmatter.description, "description", slugFromFileName),
      excerpt: requireString(rawFrontmatter.excerpt, "excerpt", slugFromFileName),
      publishedAt,
      updatedAt,
      author: requireString(rawFrontmatter.author, "author", slugFromFileName),
      tags: requireStringArray(rawFrontmatter.tags, "tags", slugFromFileName),
      originalUrl: optionalString(rawFrontmatter.originalUrl),
      coverImage: normalizePostAssetReference(optionalString(rawFrontmatter.coverImage), slug),
      embeddedPdf: normalizePostAssetReference(optionalString(rawFrontmatter.embeddedPdf), slug),
      allowPdfDownload: optionalBoolean(rawFrontmatter.allowPdfDownload, "allowPdfDownload", slugFromFileName) ?? true,
      draft: rawFrontmatter.draft === true,
    },
    body: body.trim(),
  };
}

export function renderMarkdown(source) {
  return markdown.parse(source, { async: false });
}

export function readPostAssets(slug, coverImage, embeddedPdf) {
  const assetDirectory = join(POST_ASSETS_DIR, slug);

  if (!existsSync(assetDirectory)) {
    return [];
  }

  return readdirSync(assetDirectory)
    .filter((fileName) => !fileName.startsWith("."))
    .sort()
    .map((fileName) => {
      const publicUrl = buildPostAssetUrl(slug, fileName);
      const lowerExtension = extname(fileName).toLowerCase();
      const roles = [];

      if (coverImage === publicUrl) {
        roles.push("cover");
      }

      if (embeddedPdf === publicUrl) {
        roles.push("embedded_pdf");
      }

      if (DOWNLOADABLE_EXTENSIONS.has(lowerExtension) && embeddedPdf !== publicUrl) {
        roles.push("attachment");
      }

      if (roles.length === 0 && isImageExtension(lowerExtension)) {
        roles.push("inline");
      }

      return {
        fileName,
        objectPath: `posts/${slug}/${fileName}`,
        publicUrl,
        mimeType: mimeTypeForExtension(lowerExtension),
        roles,
      };
    })
    .filter((asset) => asset.roles.length > 0);
}

export function buildPostAssetUrl(slug, fileName) {
  return `/posts/${encodeURIComponent(slug)}/${encodeURIComponent(fileName)}`;
}

export function loadLocalEnvFiles(fileNames = [".env.local", ".env"]) {
  for (const fileName of fileNames) {
    const fullPath = resolve(fileName);

    if (!existsSync(fullPath)) {
      continue;
    }

    const source = readFileSync(fullPath, "utf8");

    for (const line of source.split(/\r?\n/)) {
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());

      if (!match || nonEmptyEnv(match[1])) {
        continue;
      }

      const [, key, rawValue] = match;
      process.env[key] = unquoteEnvValue(rawValue.trim());
    }
  }
}

export function nonEmptyEnv(key) {
  const value = process.env[key]?.trim();

  if (!value || value === "\"\"" || value === "''") {
    return undefined;
  }

  return value;
}

export function withPgSslCompatibility(databaseUrl) {
  const url = new URL(databaseUrl);

  if (url.searchParams.get("sslmode") === "require" && !url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  }

  return url.toString();
}

function parseYamlLikeFrontmatter(block) {
  const result = {};
  const lines = block.split("\n");
  let currentArrayKey = null;

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

function parseScalar(rawValue) {
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

function assertSupportedPostSyntax(body, extension, slug) {
  if (extension !== "mdx") {
    return;
  }

  const normalizedBody = body.replace(/\r\n?/g, "\n");
  const bodyWithoutCodeFences = normalizedBody.replace(/(^|\n)(```|~~~)[^\n]*\n[\s\S]*?\n\2(?=\n|$)/g, "$1");

  for (const rule of UNSUPPORTED_MDX_PATTERNS) {
    if (rule.pattern.test(bodyWithoutCodeFences)) {
      throw new Error(`Unsupported MDX syntax in post: ${slug}. ${rule.message}.`);
    }
  }
}

function getPostCategoryFromPath(fullPath) {
  const relativePath = relative(POSTS_DIR, fullPath);
  const [category] = relativePath.split(path.sep);

  if (!category || category === path.basename(relativePath)) {
    return "uncategorized";
  }

  return category;
}

function isPostFileName(fileName) {
  return POST_EXTENSIONS.has(extname(fileName)) && path.basename(fileName, extname(fileName)).toLowerCase() !== "readme";
}

function normalizePostAssetReference(value, slug) {
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

function parseDateOnlyToUtcTimestamp(value, field, slug) {
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

function requireString(value, field, slug) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing or invalid ${field} in post: ${slug}`);
  }

  return value;
}

function optionalString(value) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  return value;
}

function optionalBoolean(value, field, slug) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(`Invalid ${field} in post: ${slug}. Use true or false.`);
  }

  return value;
}

function requireStringArray(value, field, slug) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`Missing or invalid ${field} array in post: ${slug}`);
  }

  return value;
}

function mimeTypeForExtension(lowerExtension) {
  switch (lowerExtension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".pdf":
      return "application/pdf";
    case ".ppt":
      return "application/vnd.ms-powerpoint";
    case ".pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    default:
      return undefined;
  }
}

function isImageExtension(lowerExtension) {
  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(lowerExtension);
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function unquoteEnvValue(value) {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replaceAll("\\n", "\n");
  }

  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  return value;
}

function escapeAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
