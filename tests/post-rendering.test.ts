import { describe, expect, it } from "vitest";
import { renderPostMarkdown } from "../src/lib/post-rendering";

describe("renderPostMarkdown", () => {
  it("renders a mermaid code block as a pre.mermaid element", () => {
    const html = renderPostMarkdown("```mermaid\ngraph TD;\n  A-->B;\n```");

    expect(html).toContain('<pre class="mermaid">');
    expect(html).toContain("graph TD;");
    expect(html).toContain("A--&gt;B;");
    expect(html).not.toContain("language-mermaid");
  });

  it("renders non-mermaid code blocks with a language class", () => {
    const html = renderPostMarkdown("```ts\nconst answer = 42;\n```");

    expect(html).toContain('<pre><code class="language-ts">');
    expect(html).toContain("const answer = 42;");
  });

  it("escapes diagram source so injected markup cannot execute", () => {
    const html = renderPostMarkdown("```mermaid\n<script>alert(1)</script>\n```");

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("uses a pixel width title as the image width and drops the tooltip", () => {
    const html = renderPostMarkdown('![도표](/posts/img.png "480")');

    expect(html).toContain('style="width:480px"');
    expect(html).not.toContain('title="480"');
    expect(html).toContain('alt="도표"');
  });

  it("supports a percentage width title", () => {
    const html = renderPostMarkdown('![로고](/posts/logo.png "50%")');

    expect(html).toContain('style="width:50%"');
    expect(html).not.toContain("title=");
  });

  it("accepts an explicit px suffix", () => {
    const html = renderPostMarkdown('![도표](/posts/img.png "320px")');

    expect(html).toContain('style="width:320px"');
  });

  it("keeps a non-width title as a tooltip and adds no width", () => {
    const html = renderPostMarkdown('![도표](/posts/img.png "설명 문구")');

    expect(html).toContain('title="설명 문구"');
    expect(html).not.toContain("style=");
  });

  it("ignores out-of-range or malformed width values", () => {
    const percentOverflow = renderPostMarkdown('![x](/posts/img.png "150%")');
    const pixelOverflow = renderPostMarkdown('![x](/posts/img.png "99999")');

    expect(percentOverflow).not.toContain("style=");
    expect(percentOverflow).toContain('title="150%"');
    expect(pixelOverflow).not.toContain("style=");
  });
});
