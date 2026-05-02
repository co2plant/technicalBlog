import { describe, expect, it } from "vitest";
import {
  assertSupportedPostSyntax,
  buildPostAssetUrl,
  getPostBySlug,
  getPublishedPosts,
  parseFrontmatter,
} from "../src/lib/content";

describe("content loader", () => {
  it("loads the migrated git commit message convention post", async () => {
    const post = await getPostBySlug("git-commit-message-convention");

    expect(post).not.toBeNull();
    expect(post?.title).toBe("[Git] Commit Message Convention");
    expect(post?.originalUrl).toBe("https://velog.io/@co2plant/Git-Commit-Message-Convention");
    expect(post?.html).toContain("Git Commit Message Convention");
    expect(post?.coverImage).toBe("/posts/git-commit-message-convention/cover.png");
  });

  it("returns published posts in descending date order", async () => {
    const posts = await getPublishedPosts();

    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((post) => post.draft === false)).toBe(true);
    expect(posts).toEqual(
      [...posts].sort(
        (left, right) =>
          Date.parse(`${right.publishedAt}T00:00:00.000Z`) - Date.parse(`${left.publishedAt}T00:00:00.000Z`),
      ),
    );
    expect(posts.map((post) => post.slug)).toEqual(
      expect.arrayContaining([
        "egovframe-training",
        "git-commit-message-convention",
        "portfolio-pdf-sample",
        "java-override-overriding",
        "standard-framework-open-community-offline-seminar-review",
        "java-diamond-problem-multi-inheritance",
        "standard-framework-contribution",
        "standard-framework-contribution-developer-evaluation-and-goods-unboxing",
      ]),
    );
  });

  it("loads an embedded-pdf portfolio post", async () => {
    const post = await getPostBySlug("portfolio-pdf-sample");

    expect(post).not.toBeNull();
    expect(post?.embeddedPdf).toBe("/posts/portfolio-pdf-sample/portfolio.pdf");
    expect(post?.attachments.map((attachment) => attachment.url)).toContain("/posts/portfolio-pdf-sample/portfolio.pdf");
  });

  it("parses frontmatter with CRLF line endings", () => {
    const source = [
      "---",
      'title: "CRLF post"',
      'slug: "crlf-post"',
      'description: "desc"',
      'excerpt: "excerpt"',
      'publishedAt: "2026-04-09"',
      'author: "co2plant"',
      "tags:",
      "  - test",
      "draft: false",
      "---",
      "",
      "본문입니다.",
    ].join("\r\n");

    const { frontmatter, body } = parseFrontmatter(source, "crlf-post");

    expect(frontmatter.slug).toBe("crlf-post");
    expect(frontmatter.publishedAt).toBe("2026-04-09");
    expect(body).toBe("본문입니다.");
  });

  it("rejects non-ISO publishedAt values", () => {
    const source = [
      "---",
      'title: "Invalid date post"',
      'slug: "invalid-date-post"',
      'description: "desc"',
      'excerpt: "excerpt"',
      'publishedAt: "2026-4-9"',
      'author: "co2plant"',
      "tags:",
      "  - test",
      "draft: false",
      "---",
      "",
      "본문입니다.",
    ].join("\n");

    expect(() => parseFrontmatter(source, "invalid-date-post")).toThrowError(
      "Invalid publishedAt in post: invalid-date-post. Use YYYY-MM-DD.",
    );
  });

  it("rejects unsupported MDX component syntax", () => {
    const body = ["# 제목", "", "<CalloutBox />"].join("\n");

    expect(() => assertSupportedPostSyntax(body, "mdx", "component-post")).toThrowError(
      "Unsupported MDX syntax in post: component-post. HTML or JSX-style tags are not supported.",
    );
  });

  it("rejects lowercase HTML tags in mdx files", () => {
    const body = ["# 제목", "", "<div>본문</div>"].join("\n");

    expect(() => assertSupportedPostSyntax(body, "mdx", "html-tag-post")).toThrowError(
      "Unsupported MDX syntax in post: html-tag-post. HTML or JSX-style tags are not supported.",
    );
  });

  it("allows markdown content in mdx files", () => {
    const body = ["# 제목", "", "일반 문단입니다.", "", "- 목록 항목"].join("\n");

    expect(() => assertSupportedPostSyntax(body, "mdx", "plain-markdown-post")).not.toThrow();
  });

  it("ignores fenced code samples when checking unsupported mdx syntax", () => {
    const body = ["# 제목", "", "~~~tsx", 'import Demo from "./demo";', "~~~"].join("\n");

    expect(() => assertSupportedPostSyntax(body, "mdx", "code-sample-post")).not.toThrow();
  });

  it("encodes post asset URLs safely", () => {
    expect(buildPostAssetUrl("portfolio sample", "slides final #1.pdf")).toBe(
      "/posts/portfolio%20sample/slides%20final%20%231.pdf",
    );
  });

  it("normalizes local frontmatter asset paths to canonical encoded urls", () => {
    const source = [
      "---",
      'title: "Encoded asset post"',
      'slug: "portfolio sample"',
      'description: "desc"',
      'excerpt: "excerpt"',
      'publishedAt: "2026-04-09"',
      'author: "co2plant"',
      'coverImage: "/posts/portfolio sample/cover image #1.png"',
      'embeddedPdf: "/posts/portfolio sample/slides final #1.pdf"',
      "tags:",
      "  - portfolio",
      "draft: false",
      "---",
      "",
      "본문입니다.",
    ].join("\n");

    const { frontmatter } = parseFrontmatter(source, "portfolio sample");

    expect(frontmatter.coverImage).toBe("/posts/portfolio%20sample/cover%20image%20%231.png");
    expect(frontmatter.embeddedPdf).toBe("/posts/portfolio%20sample/slides%20final%20%231.pdf");
  });
});
