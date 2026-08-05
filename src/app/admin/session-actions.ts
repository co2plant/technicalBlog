"use server";

import {
  createAdminSessionCookie,
  getAdminSessionExpiry,
  requireAdminSession,
} from "@/lib/admin-auth";

export async function extendSessionAction(): Promise<number | null> {
  await requireAdminSession();
  await createAdminSessionCookie();
  return getAdminSessionExpiry();
}
