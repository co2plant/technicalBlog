"use server";

import { redirect } from "next/navigation";
import {
  createAdminSessionCookie,
  clearAdminSessionCookie,
  requireAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import {
  archivePost,
  createDraftPost,
  publishPost,
  saveDraftPost,
  softDeletePost,
  uploadPostAsset,
} from "@/lib/blog-admin";
import type { AdminTagInput } from "@/lib/blog-admin";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (!verifyAdminPassword(password)) {
    redirect("/admin/login?error=1");
  }

  await createAdminSessionCookie();
  redirect("/admin");
}

export async function logoutAction() {
  await clearAdminSessionCookie();
  redirect("/admin/login");
}

export async function createPostAction() {
  await requireAdminSession();

  const id = await createDraftPost();
  redirect(`/admin/posts/${id}`);
}

export async function saveDraftAction(postId: number, formData: FormData) {
  await requireAdminSession();

  await saveDraftPost(postId, parsePostFormData(formData));
  redirect(`/admin/posts/${postId}?saved=1`);
}

export async function publishPostAction(postId: number, formData: FormData) {
  await requireAdminSession();

  const publishedNumber = await publishPost(postId, parsePostFormData(formData));
  redirect(`/admin/posts/${postId}?published=${publishedNumber}`);
}

export async function archivePostAction(postId: number) {
  await requireAdminSession();

  await archivePost(postId);
  redirect(`/admin/posts/${postId}?archived=1`);
}

export async function deletePostAction(postId: number) {
  await requireAdminSession();

  await softDeletePost(postId);
  redirect("/admin?deleted=1");
}

export async function uploadAssetAction(postId: number, formData: FormData) {
  await requireAdminSession();

  const file = formData.get("assetFile");

  if (!(file instanceof File)) {
    throw new Error("assetFile is required.");
  }

  const publicUrl = await uploadPostAsset(postId, {
    file,
    role: parseAssetRole(formData),
    altText: optionalString(formData, "altText"),
    caption: optionalString(formData, "caption"),
  });

  redirect(`/admin/posts/${postId}?uploaded=${encodeURIComponent(publicUrl)}`);
}

function parsePostFormData(formData: FormData) {
  return {
    title: requiredString(formData, "title"),
    description: String(formData.get("description") ?? "").trim(),
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    bodyMarkdown: String(formData.get("bodyMarkdown") ?? ""),
    extension: parseExtension(formData),
    author: requiredString(formData, "author"),
    categorySlug: requiredSlug(formData, "categorySlug"),
    tags: parseTags(String(formData.get("tags") ?? "")),
    originalUrl: optionalString(formData, "originalUrl"),
    coverImageUrl: optionalString(formData, "coverImageUrl"),
    embeddedPdfUrl: optionalString(formData, "embeddedPdfUrl"),
    allowPdfDownload: formData.get("allowPdfDownload") === "on",
  };
}

function parseExtension(formData: FormData): "md" | "mdx" {
  const extension = String(formData.get("extension") ?? "mdx");

  if (extension === "md" || extension === "mdx") {
    return extension;
  }

  throw new Error("extension must be md or mdx.");
}

function parseTags(value: string): AdminTagInput[] {
  const tags = new Map<string, AdminTagInput>();

  for (const entry of value.split(/[,\n]/).map((tag) => tag.trim()).filter(Boolean)) {
    const [rawName, rawSlug] = entry.split("|").map((part) => part.trim());
    const name = rawName;
    const slug = rawSlug || undefined;

    if (!name) {
      throw new Error("tag name is required.");
    }

    if (slug && !isValidSlug(slug)) {
      throw new Error(`tag slug "${slug}" must use ^[a-z0-9][a-z0-9-]*$.`);
    }

    tags.set(slug ?? name.toLowerCase(), {
      name,
      slug,
    });
  }

  return [...tags.values()];
}

function requiredString(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function requiredSlug(formData: FormData, key: string): string {
  const value = requiredString(formData, key);

  if (!isValidSlug(value)) {
    throw new Error(`${key} must use ^[a-z0-9][a-z0-9-]*$.`);
  }

  return value;
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(value);
}

function optionalString(formData: FormData, key: string): string | undefined {
  const value = String(formData.get(key) ?? "").trim();
  return value || undefined;
}

function parseAssetRole(formData: FormData): "cover" | "inline" | "attachment" | "embedded_pdf" {
  const value = String(formData.get("assetRole") ?? "");

  if (value === "cover" || value === "inline" || value === "attachment" || value === "embedded_pdf") {
    return value;
  }

  throw new Error("assetRole must be cover, inline, attachment, or embedded_pdf.");
}
