// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PostCollection } from "../src/components/post-collection";
import type { Post } from "../src/lib/content";

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    title: "Java와 Spring을 사용하며 배운 내용",
    slug: "1",
    category: "backend",
    description: "개발 기록",
    excerpt: "실제로 겪은 문제와 해결 방법입니다.",
    publishedAt: "2026-11-12",
    author: "co2plant",
    tags: ["Java", "Spring Boot"],
    allowPdfDownload: true,
    draft: false,
    extension: "md",
    body: "본문",
    html: "<p>본문</p>",
    attachments: [],
    ...overrides,
  };
}

function renderCollection(posts: Post[], layout?: "cards" | "list") {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(
    <PostCollection
      title="게시글 목록"
      description="개발 기록"
      emptyMessage="아직 추가된 게시글이 없습니다."
      posts={posts}
      accent="indigo"
      headingTestId="posts-page-heading"
      primaryBadgeLabel={layout === "list" ? undefined : "Portfolio"}
      layout={layout}
    />,
  );
  return container;
}

describe("PostCollection", () => {
  it("lists posts in order with one title-named link per post and preserves tag casing", () => {
    const posts = [makePost(), makePost({ slug: "2", title: "긴 제목 ".repeat(30), excerpt: "", tags: [] })];
    const container = renderCollection(posts, "list");
    const list = container.querySelector('ul[aria-labelledby="posts-page-heading"]');
    expect(list?.children).toHaveLength(2);

    const links = [...container.querySelectorAll("a")];
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/posts/1", "/posts/2"]);
    for (const [index, link] of links.entries()) {
      const heading = container.querySelector(`[id="${link.getAttribute("aria-labelledby")}"]`);
      expect(heading?.textContent).toBe(posts[index].title);
      expect(link.querySelectorAll("a, button")).toHaveLength(0);
    }
    expect([...container.querySelectorAll('ul[aria-label="태그"] li')].map((tag) => tag.textContent))
      .toEqual(["Java", "Spring Boot"]);
    expect(container.querySelectorAll("article")[1].querySelector("p")).toBeNull();
  });

  it("shows an empty message without an empty list", () => {
    const container = renderCollection([], "list");
    expect(container.textContent).toContain("아직 추가된 게시글이 없습니다.");
    expect(container.querySelector("ul, article, a")).toBeNull();
  });

  it("preserves the default portfolio card, PDF label and post link", () => {
    const container = renderCollection([makePost({ slug: "11", category: "portfolio", embeddedPdf: "/portfolio.pdf" })]);
    expect(container.querySelector('ul[aria-labelledby="posts-page-heading"]')).toBeNull();
    expect(container.querySelectorAll("article")).toHaveLength(1);
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/posts/11");
    expect(container.querySelector("article")?.textContent).toContain("PDF");
  });
});
