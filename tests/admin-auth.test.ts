import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setCookie: vi.fn(),
  getCookie: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

import {
  clearAdminSessionCookie,
  createAdminSessionCookie,
  isAdminAuthenticated,
  readSessionTtlSeconds,
} from "../src/lib/admin-auth";

describe("admin auth cookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_ACCESS_SECRET", "test-admin-secret");
    mocks.cookies.mockResolvedValue({
      get: mocks.getCookie,
      set: mocks.setCookie,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("expires the session cookie on the same admin path", async () => {
    await clearAdminSessionCookie();

    expect(mocks.setCookie).toHaveBeenCalledWith("technical_blog_admin", "", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/admin",
      maxAge: 0,
    });
  });

  it("rejects a correctly signed session after its server-side expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-12T00:00:00.000Z"));
    await createAdminSessionCookie();
    const cookieValue = mocks.setCookie.mock.calls[0]?.[1] as string;
    mocks.getCookie.mockReturnValue({ value: cookieValue });

    await expect(isAdminAuthenticated()).resolves.toBe(true);

    vi.advanceTimersByTime(2 * 60 * 60 * 1000 - 1_000);
    await expect(isAdminAuthenticated()).resolves.toBe(true);

    vi.advanceTimersByTime(2_000);
    await expect(isAdminAuthenticated()).resolves.toBe(false);
  });

  it("signs the session cookie with the dedicated session secret when set", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "dedicated-session-secret");
    await createAdminSessionCookie();
    const cookieValue = mocks.setCookie.mock.calls[0]?.[1] as string;
    mocks.getCookie.mockReturnValue({ value: cookieValue });

    await expect(isAdminAuthenticated()).resolves.toBe(true);

    // Rotating only the session secret invalidates existing cookies, even
    // though the login password (ADMIN_ACCESS_SECRET) is unchanged.
    vi.stubEnv("ADMIN_SESSION_SECRET", "rotated-session-secret");
    await expect(isAdminAuthenticated()).resolves.toBe(false);
  });

  describe("readSessionTtlSeconds", () => {
    const DEFAULT_TTL = 60 * 60 * 2;
    const MAX_TTL = 60 * 60 * 12;

    it("uses the env value when it is a positive integer within the max", () => {
      vi.stubEnv("ADMIN_SESSION_TTL_SECONDS", "3600");
      expect(readSessionTtlSeconds()).toBe(3600);
    });

    it("accepts the max boundary value", () => {
      vi.stubEnv("ADMIN_SESSION_TTL_SECONDS", String(MAX_TTL));
      expect(readSessionTtlSeconds()).toBe(MAX_TTL);
    });

    it("falls back to the default when the value exceeds the max", () => {
      vi.stubEnv("ADMIN_SESSION_TTL_SECONDS", String(MAX_TTL + 1));
      expect(readSessionTtlSeconds()).toBe(DEFAULT_TTL);
    });

    it("falls back to the default for zero, negative, non-integer, or non-numeric values", () => {
      for (const bad of ["0", "-1", "7200.5", "abc", ""]) {
        vi.stubEnv("ADMIN_SESSION_TTL_SECONDS", bad);
        expect(readSessionTtlSeconds()).toBe(DEFAULT_TTL);
      }
    });

    it("falls back to the default when the env var is unset", () => {
      vi.stubEnv("ADMIN_SESSION_TTL_SECONDS", "");
      expect(readSessionTtlSeconds()).toBe(DEFAULT_TTL);
    });
  });
});
