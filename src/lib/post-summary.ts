import { Marked } from "marked";
import { summarizeHtml } from "./seo";

// This lightweight renderer is shared with the editor; syntax highlighting is unnecessary here.
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

// Written values win. The body is summarized only when both are empty, and that result is never stored,
// so a post left blank keeps following its body.
export function resolvePostSummaries(post: { description: string; excerpt: string; bodyMarkdown: string }): {
  description: string;
  excerpt: string;
} {
  const description = post.description.trim();
  const excerpt = post.excerpt.trim();
  const automatic = description || excerpt ? "" : summarizePostMarkdown(post.bodyMarkdown);

  return {
    description: description || excerpt || automatic,
    excerpt: excerpt || description || automatic,
  };
}
