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
