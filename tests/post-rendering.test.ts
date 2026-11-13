// @vitest-environment jsdom
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

    // A named, focusable scroll container needs a role, or screen readers drop the name.
    expect(html).toContain('<pre role="region" tabindex="0" aria-label="코드 블록"><code class="language-ts">');
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.querySelector("code")?.textContent).toBe("const answer = 42;");
  });

  it.each([
    ["java", 'public class Example { String text = "안녕하세요"; }'],
    ["ts", "const count: number = 42;"],
    ["tsx", "const view = <button disabled={false}>확인</button>;"],
    ["sql", "SELECT * FROM posts WHERE id = 1;"],
    ["xml", '<bean id="service" />'],
    ["json", '{"enabled": true}'],
    ["yaml", "enabled: true"],
    ["bash", 'echo "$HOME"'],
    ["groovy", 'plugins { id "java" }'],
    ["python", 'print("안녕하세요")'],
  ])("highlights %s without changing the source text", (language, source) => {
    const html = renderPostMarkdown(`\`\`\`${language}\n${source}\n\`\`\``);
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.querySelector("code .token")).not.toBeNull();
    expect(container.querySelector("code")?.textContent).toBe(source);
  });

  it("accepts an uppercase language and ignores extra fence metadata", () => {
    const html = renderPostMarkdown("```TS filename=example.ts\nconst value = 1;\n```");
    expect(html).toContain('class="language-ts"');
    expect(html).toContain('class="token keyword"');
  });

  it.each(["unknown-language", "constructor", "__proto__", "extend", "text", ""])(
    "keeps %s code as escaped plain text",
    (language) => {
      const html = renderPostMarkdown(`\`\`\`${language}\n<script>alert("코드")</script>\n\`\`\``);
      const container = document.createElement("div");
      container.innerHTML = html;
      expect(container.querySelector("script, .token")).toBeNull();
      expect(container.querySelector("code")?.textContent).toBe('<script>alert("코드")</script>');
    },
  );

  it("preserves code indentation and escapes markup inside keyboard-focusable blocks", () => {
    const html = renderPostMarkdown("```html\n<div>\n\t<span>내용</span>\n</div>\n```");
    expect(html).toContain('tabindex="0"');
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.querySelector("code")?.textContent).toBe("<div>\n\t<span>내용</span>\n</div>");
    expect(container.querySelector("code > div")).toBeNull();
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
