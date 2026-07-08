import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  archivePostAction,
  deletePostAction,
  publishPostAction,
  saveDraftAction,
  uploadAssetAction,
} from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAdminBlogPost, getAdminCategories } from "@/lib/blog-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit Post",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPostEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminSession();

  const { id: rawId } = await params;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const [post, categories, query] = await Promise.all([getAdminBlogPost(id), getAdminCategories(), searchParams]);

  if (!post) {
    notFound();
  }

  const tags = post.tags.map((entry) => formatTagInput(entry.tag.name, entry.tag.slug)).join(", ");
  const saveDraft = saveDraftAction.bind(null, post.id);
  const publish = publishPostAction.bind(null, post.id);
  const archive = archivePostAction.bind(null, post.id);
  const deletePost = deletePostAction.bind(null, post.id);
  const uploadAsset = uploadAssetAction.bind(null, post.id);

  return (
    <main className="mx-auto w-full max-w-5xl py-8">
      <header className="border-b border-gh-border/60 pb-6">
        <Link href="/admin" className="text-sm text-gh-muted hover:text-gh-text">
          ← 목록
        </Link>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gh-text">{post.title}</h1>
            <p className="mt-2 text-sm text-gh-muted">
              상태: {post.status} · 공개 번호: {post.publishedNumber ?? "-"} · 기존 slug: {post.legacySlug ?? "-"}
            </p>
          </div>
          <Link
            href={`/admin/posts/${post.id}/preview`}
            className="w-fit rounded-md border border-gh-border px-4 py-2 text-sm font-semibold text-gh-text hover:bg-gh-surface"
          >
            미리보기
          </Link>
        </div>
        {query.saved ? <p className="mt-4 text-sm text-emerald-300">임시저장 완료</p> : null}
        {query.published ? <p className="mt-4 text-sm text-emerald-300">발행 완료: /posts/{query.published}</p> : null}
        {query.archived ? <p className="mt-4 text-sm text-amber-300">발행취소 완료</p> : null}
        {query.uploaded ? (
          <p className="mt-4 break-all text-sm text-emerald-300">업로드 완료: {decodeURIComponent(query.uploaded)}</p>
        ) : null}
      </header>

      <section className="mt-8 rounded-lg border border-gh-border/70 bg-gh-surface/40 p-5">
        <h2 className="text-lg font-bold text-gh-text">자산 업로드</h2>
        <form action={uploadAsset} encType="multipart/form-data" className="mt-4 grid gap-4 md:grid-cols-[1fr_180px]">
          <label className="block text-sm font-medium text-gh-text">
            파일
            <input
              type="file"
              name="assetFile"
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
              className="mt-2 w-full rounded-md border border-gh-border bg-gh-bg px-3 py-2 text-gh-text"
              required
            />
          </label>
          <label className="block text-sm font-medium text-gh-text">
            역할
            <select
              name="assetRole"
              defaultValue="inline"
              className="mt-2 w-full rounded-md border border-gh-border bg-gh-bg px-3 py-2 text-gh-text"
            >
              <option value="inline">본문 이미지</option>
              <option value="cover">커버 이미지</option>
              <option value="attachment">첨부 PDF</option>
              <option value="embedded_pdf">임베드 PDF</option>
            </select>
          </label>
          <TextInput label="대체 텍스트" name="altText" defaultValue="" />
          <TextInput label="캡션" name="caption" defaultValue="" />
          <div className="md:col-span-2">
            <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
              업로드
            </button>
          </div>
        </form>

        {post.assets.length > 0 ? (
          <div className="mt-6 overflow-hidden rounded-md border border-gh-border/60">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gh-bg text-left text-gh-muted">
                <tr>
                  <th className="px-3 py-2">역할</th>
                  <th className="px-3 py-2">URL</th>
                  <th className="px-3 py-2">본문 삽입</th>
                  <th className="px-3 py-2">MIME</th>
                </tr>
              </thead>
              <tbody>
                {post.assets.map((assetLink) => {
                  const assetUrl = assetLink.asset.publicUrl ?? `/${assetLink.asset.objectPath}`;
                  const altText = assetLink.asset.altText ?? "";
                  const insertSnippet = assetLink.asset.mimeType?.startsWith("image/")
                    ? `![${altText}](${assetUrl})`
                    : `[${assetLink.asset.caption ?? "PDF"}](${assetUrl})`;

                  return (
                    <tr key={`${assetLink.id}-${assetLink.role}`} className="border-t border-gh-border/50">
                      <td className="px-3 py-2 text-gh-muted">{assetLink.role}</td>
                      <td className="break-all px-3 py-2 font-mono text-xs text-gh-text">{assetUrl}</td>
                      <td className="break-all px-3 py-2 font-mono text-xs text-gh-text">{insertSnippet}</td>
                      <td className="px-3 py-2 text-gh-muted">{assetLink.asset.mimeType ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <form className="mt-8 grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput label="제목" name="title" defaultValue={post.title} required />
          <TextInput label="작성자" name="author" defaultValue={post.author} required />
        </div>
        <TextInput label="설명" name="description" defaultValue={post.description} />
        <TextInput label="요약" name="excerpt" defaultValue={post.excerpt} />
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-medium text-gh-text">
            카테고리
            <select
              name="categorySlug"
              defaultValue={post.category.slug}
              className="mt-2 w-full rounded-md border border-gh-border bg-gh-surface px-3 py-2 text-gh-text"
            >
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-gh-text">
            확장자
            <select
              name="extension"
              defaultValue={post.extension}
              className="mt-2 w-full rounded-md border border-gh-border bg-gh-surface px-3 py-2 text-gh-text"
            >
              <option value="mdx">mdx</option>
              <option value="md">md</option>
            </select>
          </label>
          <label className="mt-8 flex items-center gap-2 text-sm font-medium text-gh-text">
            <input type="checkbox" name="allowPdfDownload" defaultChecked={post.allowPdfDownload} />
            PDF 다운로드 허용
          </label>
        </div>
        <TextInput label="태그(쉼표/줄 구분, 한글은 표시명|slug)" name="tags" defaultValue={tags} />
        <TextInput label="원문 URL" name="originalUrl" defaultValue={post.originalUrl ?? ""} />
        <TextInput label="커버 이미지 URL" name="coverImageUrl" defaultValue={post.coverImageUrl ?? ""} />
        <TextInput label="임베드 PDF URL" name="embeddedPdfUrl" defaultValue={post.embeddedPdfUrl ?? ""} />
        <label className="block text-sm font-medium text-gh-text">
          본문 Markdown
          <textarea
            name="bodyMarkdown"
            defaultValue={post.bodyMarkdown}
            className="mt-2 min-h-[520px] w-full rounded-md border border-gh-border bg-gh-surface px-3 py-2 font-mono text-sm leading-relaxed text-gh-text"
          />
        </label>
        <div className="flex flex-wrap gap-2 border-t border-gh-border/60 pt-5">
          <button formAction={saveDraft} className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600">
            임시저장
          </button>
          <button formAction={publish} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
            발행
          </button>
          <button formAction={archive} className="rounded-md border border-amber-500/40 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10">
            발행취소
          </button>
          <button formAction={deletePost} className="rounded-md border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10">
            삭제
          </button>
        </div>
      </form>
    </main>
  );
}

function TextInput({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-gh-text">
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 w-full rounded-md border border-gh-border bg-gh-surface px-3 py-2 text-gh-text outline-none focus:border-indigo-400"
      />
    </label>
  );
}

function formatTagInput(name: string, slug: string): string {
  const generatedSlug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return generatedSlug === slug ? name : `${name}|${slug}`;
}
