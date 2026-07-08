import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/admin/actions";
import { hasAdminSecret, isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-sm flex-col justify-center py-12">
      <h1 className="text-2xl font-bold text-gh-text">Admin Login</h1>
      <p className="mt-2 text-sm text-gh-muted">블로그 글을 DB에서 작성하고 발행합니다.</p>

      {!hasAdminSecret() ? (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          ADMIN_ACCESS_SECRET 환경변수가 필요합니다.
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          비밀번호가 올바르지 않습니다.
        </div>
      ) : null}

      <form action={loginAction} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-gh-text">
          비밀번호
          <input
            type="password"
            name="password"
            className="mt-2 w-full rounded-md border border-gh-border bg-gh-surface px-3 py-2 text-gh-text outline-none focus:border-indigo-400"
            required
          />
        </label>
        <button className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
          로그인
        </button>
      </form>
    </main>
  );
}
