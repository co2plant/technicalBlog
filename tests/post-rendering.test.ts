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
});
