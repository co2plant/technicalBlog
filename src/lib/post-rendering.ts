import { Marked } from "marked";

const markdown = new Marked({
  async: false,
  gfm: true,
  breaks: true,
  renderer: {
    html() {
      return "";
    },
    code({ text, lang }) {
      if (lang === "mermaid") {
        return `<pre class="mermaid">${escapeHtml(text)}</pre>`;
      }

      const languageClass = lang ? ` class="language-${escapeAttribute(lang)}"` : "";

      return `<pre><code${languageClass}>${escapeHtml(text)}</code></pre>`;
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
      const width = parseImageWidth(title);
      const safeStyle = width ? ` style="width:${width}"` : "";
      const safeTitle = !width && title ? ` title="${escapeAttribute(title)}"` : "";

      return `<img src="${safeHref}" alt="${safeAlt}" loading="lazy"${safeStyle}${safeTitle} />`;
    },
  },
});

export function renderPostMarkdown(source: string): string {
  return markdown.parse(source, { async: false });
}

function parseImageWidth(title: string | null | undefined): string | null {
  if (!title) {
    return null;
  }

  const trimmed = title.trim();

  const percentMatch = /^(\d{1,3})%$/.exec(trimmed);
  if (percentMatch) {
    const value = Number(percentMatch[1]);
    return value >= 1 && value <= 100 ? `${value}%` : null;
  }

  const pixelMatch = /^(\d{1,4})(?:px)?$/.exec(trimmed);
  if (pixelMatch) {
    const value = Number(pixelMatch[1]);
    return value >= 1 && value <= 4096 ? `${value}px` : null;
  }

  return null;
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
