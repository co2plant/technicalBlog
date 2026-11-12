import { describe, expect, it } from "vitest";
import { summarizePostMarkdown } from "../src/lib/post-summary";

describe("automatic post summary", () => {
  it("takes opening prose without headings, images, code or diagrams", () => {
    const source = '# 제목\n\n![그림 설명](/image.png)\n\n```java\nclass Example {}\n```\n\n```mermaid\ngraph TD; A-->B\n```\n\n**첫 본문**과 `인라인 코드`를 설명합니다.\n\n[다음 문단](https://example.com)입니다.';
    expect(summarizePostMarkdown(source)).toBe("첫 본문과 인라인 코드를 설명합니다. 다음 문단입니다.");
  });

  it("normalizes whitespace and decodes entities without exposing raw HTML", () => {
    expect(summarizePostMarkdown('첫 문장 &amp; 비교입니다.\n\n<script>alert(1)</script>\n\n둘째 문장입니다.'))
      .toBe("첫 문장 & 비교입니다. 둘째 문장입니다.");
  });

  it.each(["", "   ", "# 제목만 있습니다", "![그림](/image.png)", "```text\n코드만 있습니다\n```"])("leaves non-prose content empty: %s", (source) => {
    expect(summarizePostMarkdown(source)).toBe("");
  });

  it("limits the opening text to 160 characters and adds an ellipsis", () => {
    const summary = summarizePostMarkdown("본문 설명입니다. ".repeat(50));
    expect(summary.length).toBeLessThanOrEqual(160);
    expect(summary.endsWith("…")).toBe(true);
  });
});
