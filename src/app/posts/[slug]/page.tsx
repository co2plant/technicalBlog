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
    <article className="post-detail">
      <header className="post-detail__header">
        <p className="post-detail__eyebrow">게시글</p>
        <h1>{post.title}</h1>
        <p className="post-detail__description">{post.description}</p>
        <p className="post-detail__meta">
          <span>{post.publishedAt}</span>
          {post.author ? ` · ${post.author}` : ""}
        </p>
        {post.tags.length > 0 ? <p className="post-detail__tags">태그: {post.tags.join(", ")}</p> : null}
        {post.originalUrl ? (
          <p className="post-detail__source">
            원문: <Link href={post.originalUrl}>Velog 원문 보기</Link>
          </p>
        ) : null}
      </header>

      <section className="post-detail__body" dangerouslySetInnerHTML={{ __html: post.html }} />

      {post.attachments.length > 0 ? (
        <section className="post-detail__attachments">
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
