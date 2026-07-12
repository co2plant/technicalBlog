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

    vi.advanceTimersByTime(12 * 60 * 60 * 1000 + 1_000);
    await expect(isAdminAuthenticated()).resolves.toBe(false);
  });
});
