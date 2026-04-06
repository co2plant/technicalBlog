import { describe, expect, it } from "vitest";
import { getPostBySlug, getPublishedPosts } from "../src/lib/content";

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
    expect(posts[0]?.slug).toBe("git-commit-message-convention");
    expect(posts.every((post) => post.draft === false)).toBe(true);
  });
});
