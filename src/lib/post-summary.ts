import { Marked } from "marked";
import type { Post } from "@/lib/content";
import { getPostDescription, summarizeHtml } from "./seo";

// The editor hint summarizes the draft in the browser; syntax highlighting is unnecessary here.
const markdown = new Marked({
  async: false,
  gfm: true,
  renderer: {
    html: () => "",
  },
});

export function summarizePostMarkdown(source: string): string {
  return summarizeHtml(markdown.parse(source, { async: false }));
}

// Written values win. The rendered body is summarized only when both are empty, and that result is never stored,
// so a post left blank keeps following its body.
export function resolvePostSummaries(post: Pick<Post, "description" | "excerpt" | "html">): {
  description: string;
  excerpt: string;
} {
  const description = getPostDescription(post);

  return {
    description,
    excerpt: post.excerpt.trim() || description,
  };
}
