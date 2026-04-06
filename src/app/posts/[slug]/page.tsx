import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getPublishedPosts } from "@/lib/content";

type PostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post || post.draft) {
    return {
      title: "게시글을 찾을 수 없습니다",
    };
  }

  return {
    title: post.title,
    description: post.description,
  };
}

export default async function PostDetailPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post || post.draft) {
    notFound();
  }

  return (
    <article>
      <header>
        <p>게시글</p>
        <h1>{post.title}</h1>
        <p>{post.description}</p>
        <p>
          <span>{post.publishedAt}</span>
          {post.author ? ` · ${post.author}` : ""}
        </p>
        {post.tags.length > 0 ? <p>태그: {post.tags.join(", ")}</p> : null}
        {post.originalUrl ? (
          <p>
            원문: <Link href={post.originalUrl}>Velog 원문 보기</Link>
          </p>
        ) : null}
      </header>

      <section dangerouslySetInnerHTML={{ __html: post.html }} />

      {post.attachments.length > 0 ? (
        <section>
          <h2>첨부 문서</h2>
          <ul>
            {post.attachments.map((attachment) => (
              <li key={attachment.url}>
                <Link href={attachment.url}>
                  {attachment.name} ({attachment.kind.toUpperCase()})
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
