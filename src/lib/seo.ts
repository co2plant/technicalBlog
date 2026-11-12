import type { Post } from "@/lib/content";
import { DEFAULT_OPEN_GRAPH_IMAGE, RSS_FEED_PATH, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-metadata";

const SUMMARY_MAX_LENGTH = 160;
// Headings, code and diagrams are excluded from the opening prose.
const NON_PROSE_BLOCK_PATTERN = /<(h[1-6]|pre|script|style|svg|figure)\b[\s\S]*?<\/\1>/gi;
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

type PostSummarySource = Pick<Post, "description" | "excerpt" | "html">;

export function getPostDescription(post: PostSummarySource): string {
  return post.description.trim() || post.excerpt.trim() || summarizeHtml(post.html);
}

export function summarizeHtml(html: string, maxLength = SUMMARY_MAX_LENGTH): string {
  const text = decodeHtmlEntities(html
    .replace(NON_PROSE_BLOCK_PATTERN, " ")
    .replace(/<\/(?:p|div|li|blockquote|tr|td|th)\b[^>]*>|<br\b[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.slice(0, maxLength - 1);
  const lastSpace = truncated.lastIndexOf(" ");
  // Prefer a word boundary, unless it would throw away most of the snippet.
  const cut = lastSpace > maxLength * 0.6 ? truncated.slice(0, lastSpace) : truncated;

  return `${cut.trimEnd()}…`;
}

export function getPostUrl(post: Pick<Post, "slug">, siteUrl: string): string {
  return `${siteUrl}/posts/${post.slug}`;
}

export function buildBlogPostingJsonLd(post: Post, siteUrl: string) {
  const url = getPostUrl(post, siteUrl);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: getPostDescription(post),
    url,
    mainEntityOfPage: url,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: {
      "@type": "Person",
      name: post.author,
      url: siteUrl,
    },
    image: new URL(post.coverImage ?? DEFAULT_OPEN_GRAPH_IMAGE.url, siteUrl).toString(),
    articleSection: post.category,
    keywords: post.tags,
    inLanguage: "ko-KR",
  };
}

// JSON.stringify leaves "<" as is, which would let "</script>" in a title end the tag early.
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function buildRssFeed(posts: Post[], siteUrl: string): string {
  const items = posts.map((post) => {
    const url = getPostUrl(post, siteUrl);

    return [
      "<item>",
      `<title>${escapeXml(post.title)}</title>`,
      `<link>${escapeXml(url)}</link>`,
      `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `<pubDate>${toRfc822Date(post.publishedAt)}</pubDate>`,
      `<description>${escapeXml(getPostDescription(post))}</description>`,
      `<category>${escapeXml(post.category)}</category>`,
      "</item>",
    ].join("");
  });
  const latestDate = posts
    .map((post) => post.updatedAt ?? post.publishedAt)
    .sort()
    .at(-1);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    `<title>${escapeXml(SITE_NAME)}</title>`,
    `<link>${escapeXml(siteUrl)}</link>`,
    `<description>${escapeXml(SITE_DESCRIPTION)}</description>`,
    "<language>ko</language>",
    `<atom:link href="${escapeXml(`${siteUrl}${RSS_FEED_PATH}`)}" rel="self" type="application/rss+xml"/>`,
    latestDate ? `<lastBuildDate>${toRfc822Date(latestDate)}</lastBuildDate>` : "",
    ...items,
    "</channel>",
    "</rss>",
  ].join("\n");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

// Post dates are calendar days written in Korea time.
function toRfc822Date(day: string): string {
  return new Date(`${day}T00:00:00+09:00`).toUTCString();
}

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (!code.startsWith("#")) {
      return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
    }

    const codePoint = code[1].toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);

    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
  });
}
