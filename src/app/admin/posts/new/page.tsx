import { redirect } from "next/navigation";
import { createDraftPost } from "@/lib/blog-admin";
import { requireAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function NewAdminPostPage() {
  await requireAdminSession();
  const id = await createDraftPost();

  redirect(`/admin/posts/${id}`);
}
