import type { Metadata } from "next";
import Link from "next/link";
import { createPostAction, logoutAction } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAdminBlogPosts } from "@/lib/blog-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  await requireAdminSession();
  const posts = await getAdminBlogPosts();

  return (
    <main className="mx-auto w-full max-w-6xl py-8">
      <header className="flex flex-col gap-4 border-b border-gh-border/60 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gh-text">Blog Admin</h1>
          <p className="mt-2 text-sm text-gh-muted">DB 기반 블로그 글 작성, 임시저장, 발행, 삭제를 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <form action={createPostAction}>
            <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
              새 글
            </button>
          </form>
          <form action={logoutAction}>
            <button className="rounded-md border border-gh-border px-4 py-2 text-sm font-semibold text-gh-text hover:bg-gh-surface">
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <section className="mt-8 overflow-hidden rounded-lg border border-gh-border/70">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gh-surface text-left text-gh-muted">
            <tr>
              <th className="px-4 py-3">번호</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">제목</th>
              <th className="px-4 py-3">카테고리</th>
              <th className="px-4 py-3">수정</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-t border-gh-border/60">
                <td className="px-4 py-3 text-gh-muted">{post.publishedNumber ?? "-"}</td>
                <td className="px-4 py-3 text-gh-muted">{post.status}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/posts/${post.id}`} className="font-semibold text-gh-text hover:text-indigo-400">
                    {post.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gh-muted">{post.category.slug}</td>
                <td className="px-4 py-3 text-gh-muted">{post.modifiedAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
