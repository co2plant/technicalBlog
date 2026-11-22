import { describe, expect, it } from "vitest";
import { parseAdminPostInput } from "../src/lib/admin-post-payload";

function parseTags(tags: Array<{ name: string; slug?: string }>) {
  return parseAdminPostInput({
    title: "태그 저장",
    description: "",
    excerpt: "",
    bodyMarkdown: "본문",
    extension: "md",
    author: "co2plant",
    categorySlug: "backend",
    tags,
    originalUrl: null,
    coverImageUrl: null,
    embeddedPdfUrl: null,
    allowPdfDownload: true,
  }).tags;
}

describe("admin post payload tags", () => {
  it("keeps every tag whose slug was left empty", () => {
    expect(parseTags([{ name: "Java" }, { name: "Spring", slug: "" }])).toEqual([
      { name: "Java", slug: undefined },
      { name: "Spring", slug: undefined },
    ]);
  });

  it("keeps tags with different explicit slugs", () => {
    expect(parseTags([{ name: "자바", slug: "java-ko" }, { name: "스프링", slug: "spring-ko" }])).toEqual([
      { name: "자바", slug: "java-ko" },
      { name: "스프링", slug: "spring-ko" },
    ]);
  });

  it("merges a tag whose explicit slug matches another tag's generated slug", () => {
    expect(parseTags([{ name: "Java" }, { name: "JAVA", slug: "java" }])).toEqual([{ name: "JAVA", slug: "java" }]);
  });
});
