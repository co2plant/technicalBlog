import Link from "next/link";
import { getPublishedPosts } from "@/lib/content";

export default async function PostsPage() {
  const posts = await getPublishedPosts();

  return (
    <section>
      <h1>게시글 목록</h1>
      <p>
        <code>content/posts</code> 아래에 추가된 Markdown/MDX 게시글을 최신순으로
        보여줍니다.
      </p>

      {posts.length === 0 ? (
        <p>아직 게시글이 없습니다.</p>
      ) : (
        <ul>
          {posts.map((post) => (
            <li key={post.slug}>
              <article>
                <h2>
                  <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                </h2>
                <p>{post.excerpt}</p>
                <p>
                  <span>{post.publishedAt}</span>
                  {post.tags.length > 0 ? ` · ${post.tags.join(", ")}` : ""}
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
