import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_COOKIE_NAME = "technical_blog_admin";
const ADMIN_SESSION_VALUE = "authenticated";

export function hasAdminSecret(): boolean {
  return Boolean(getAdminSecret());
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  return Boolean(cookieValue && verifyAdminSessionCookie(cookieValue));
}

export async function requireAdminSession(): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}

export async function createAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_COOKIE_NAME, signAdminSessionCookie(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export function verifyAdminPassword(password: string): boolean {
  const secret = getAdminSecret();

  if (!secret) {
    return false;
  }

  return safeEqual(password, secret);
}

function signAdminSessionCookie(): string {
  return `${ADMIN_SESSION_VALUE}.${sign(ADMIN_SESSION_VALUE)}`;
}

function verifyAdminSessionCookie(cookieValue: string): boolean {
  const [value, signature] = cookieValue.split(".");

  if (value !== ADMIN_SESSION_VALUE || !signature) {
    return false;
  }

  return safeEqual(signature, sign(value));
}

function sign(value: string): string {
  const secret = getAdminSecret();

  if (!secret) {
    throw new Error("ADMIN_ACCESS_SECRET is required for admin sessions.");
  }

  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getAdminSecret(): string | undefined {
  const value = process.env.ADMIN_ACCESS_SECRET?.trim();

  if (!value || value === "\"\"" || value === "''") {
    return undefined;
  }

  return value;
}
