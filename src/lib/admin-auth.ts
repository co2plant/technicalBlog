import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_COOKIE_NAME = "technical_blog_admin";
const ADMIN_SESSION_VALUE = "authenticated";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

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
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 0,
  });
}

export function verifyAdminPassword(password: string): boolean {
  const secret = getAdminSecret();

  if (!secret) {
    return false;
  }

  return safeEqual(password, secret);
}

function signAdminSessionCookie(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const payload = `${ADMIN_SESSION_VALUE}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

function verifyAdminSessionCookie(cookieValue: string): boolean {
  const [value, rawExpiresAt, signature, ...extraParts] = cookieValue.split(".");
  const expiresAt = Number(rawExpiresAt);

  if (
    value !== ADMIN_SESSION_VALUE ||
    !signature ||
    extraParts.length > 0 ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Math.floor(Date.now() / 1000)
  ) {
    return false;
  }

  return safeEqual(signature, sign(`${value}.${rawExpiresAt}`));
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
