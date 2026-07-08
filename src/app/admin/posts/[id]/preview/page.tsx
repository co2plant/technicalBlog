import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAdminBlogPost, mapAdminPostToPreview } from "@/lib/blog-admin";

export const dynamic = "force-dynamic";

export default async function AdminPostPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();

  const { id: rawId } = await params;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const databasePost = await getAdminBlogPost(id);

  if (!databasePost) {
    notFound();
  }

  const post = mapAdminPostToPreview(databasePost);

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-10 border-b border-gh-border/60 pb-8">
        <Link href={`/admin/posts/${databasePost.id}`} className="text-sm text-gh-muted hover:text-gh-text">
          ← 편집으로 돌아가기
        </Link>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-indigo-400">{post.category}</p>
        <h1 className="mt-2 text-4xl font-extrabold leading-tight text-gh-text">{post.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-gh-muted">{post.description}</p>
      </header>
      <section className="post-detail__body" dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  );
}
