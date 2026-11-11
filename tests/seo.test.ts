import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "../src/app/robots";
import type { Post } from "../src/lib/content";
import { buildBlogPostingJsonLd, buildRssFeed, getPostDescription, serializeJsonLd, summarizeHtml } from "../src/lib/seo";

const siteUrl = "https://blog.example.test";

function createPost(overrides: Partial<Post> = {}): Post {
  return {
    title: "실행계획 읽기",
    slug: "16",
    category: "database",
    description: "",
    excerpt: "",
    publishedAt: "2026-10-28",
    author: "co2plant",
    tags: ["postgresql", "sql"],
    allowPdfDownload: true,
    draft: false,
    extension: "md",
    body: "",
    html: "<p>옵티마이저는 비용을 추정합니다.</p>",
    attachments: [],
    ...overrides,
  };
}

describe("post description", () => {
  it("prefers the written description, then the excerpt, then the body", () => {
    expect(getPostDescription(createPost({ description: " 직접 쓴 설명 ", excerpt: "요약" }))).toBe("직접 쓴 설명");
    expect(getPostDescription(createPost({ excerpt: " 목록 요약 " }))).toBe("목록 요약");
    expect(getPostDescription(createPost())).toBe("옵티마이저는 비용을 추정합니다.");
  });

  it("drops code and diagrams, strips tags, and decodes entities", () => {
    const html = [
      "<h2>정의</h2>",
      "<p>SQL을 <strong>그대로</strong> 실행하지 않습니다 &amp; 비용을 &lt;추정&gt;합니다&#46; &#x2014; 끝</p>",
      '<pre><code class="language-sql">SELECT * FROM users;</code></pre>',
      '<pre class="mermaid">graph TD; A--&gt;B</pre>',
      "<p>다음&nbsp;문단</p>",
    ].join("\n");

    expect(summarizeHtml(html)).toBe("정의 SQL을 그대로 실행하지 않습니다 & 비용을 <추정>합니다. — 끝 다음 문단");
  });

  it("truncates long text at a word boundary within the limit", () => {
    const summary = summarizeHtml(`<p>${"가나다 ".repeat(60)}</p>`, 40);

    expect(summary.length).toBeLessThanOrEqual(40);
    expect(summary.endsWith("다…")).toBe(true);
  });

  it("cuts mid-word when there is no usable word boundary", () => {
    expect(summarizeHtml(`<p>${"가".repeat(50)}</p>`, 10)).toBe(`${"가".repeat(9)}…`);
  });
});

describe("BlogPosting JSON-LD", () => {
  it("uses absolute URLs and falls back to the publish date and default image", () => {
    const jsonLd = buildBlogPostingJsonLd(createPost(), siteUrl);

    expect(jsonLd).toMatchObject({
      "@type": "BlogPosting",
      headline: "실행계획 읽기",
      description: "옵티마이저는 비용을 추정합니다.",
      url: `${siteUrl}/posts/16`,
      datePublished: "2026-10-28",
      dateModified: "2026-10-28",
      author: { "@type": "Person", name: "co2plant" },
      image: `${siteUrl}/opengraph-image`,
      keywords: ["postgresql", "sql"],
    });
  });

  it("resolves relative cover images and keeps absolute ones", () => {
    expect(buildBlogPostingJsonLd(createPost({ coverImage: "/posts/16/cover.png" }), siteUrl).image).toBe(
      `${siteUrl}/posts/16/cover.png`,
    );
    expect(buildBlogPostingJsonLd(createPost({ coverImage: "https://cdn.example.test/a.png" }), siteUrl).image).toBe(
      "https://cdn.example.test/a.png",
    );
    expect(buildBlogPostingJsonLd(createPost({ updatedAt: "2026-11-01" }), siteUrl).dateModified).toBe("2026-11-01");
  });

  it("escapes < so a title cannot close the script tag", () => {
    const serialized = serializeJsonLd({ headline: "</script><script>alert(1)</script>" });

    expect(serialized).not.toContain("</script>");
    expect(JSON.parse(serialized)).toEqual({ headline: "</script><script>alert(1)</script>" });
  });
});

describe("RSS feed", () => {
  it("lists posts with links, dates, and escaped text", () => {
    const feed = buildRssFeed(
      [
        createPost({ slug: "17", title: "A & B <비교>", publishedAt: "2026-10-28", updatedAt: "2026-11-02" }),
        createPost({ slug: "15", publishedAt: "2026-09-28", excerpt: "\"영속성\" 컨텍스트" }),
      ],
      siteUrl,
    );

    expect(feed.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(feed).toContain(`<atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>`);
    expect(feed).toContain("<title>A &amp; B &lt;비교&gt;</title>");
    expect(feed).toContain(`<link>${siteUrl}/posts/17</link>`);
    expect(feed).toContain(`<guid isPermaLink="true">${siteUrl}/posts/15</guid>`);
    expect(feed).toContain("<description>&quot;영속성&quot; 컨텍스트</description>");
    // 2026-10-28 00:00 in Korea is 2026-10-27 15:00 UTC.
    expect(feed).toContain("<pubDate>Tue, 27 Oct 2026 15:00:00 GMT</pubDate>");
    expect(feed).toContain("<lastBuildDate>Sun, 01 Nov 2026 15:00:00 GMT</lastBuildDate>");
  });

  it("omits lastBuildDate when there are no posts", () => {
    const feed = buildRssFeed([], siteUrl);

    expect(feed).not.toContain("<item>");
    expect(feed).not.toContain("lastBuildDate");
  });
});

describe("robots", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("points crawlers at the sitemap on the site domain", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", siteUrl);

    expect(robots().sitemap).toBe(`${siteUrl}/sitemap.xml`);
  });
});
