import { mkdtempSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assertLocalDatabaseUrl, DEFAULT_LOCAL_DATABASE_URL, DEFAULT_E2E_DATABASE_URL, getLocalEnv } from "../scripts/local-env.mjs";

describe("local environment", () => {
  it.each([
    ["development", "DATABASE_URL_LOCAL", DEFAULT_LOCAL_DATABASE_URL],
    ["e2e", "DATABASE_URL_TEST", DEFAULT_E2E_DATABASE_URL],
  ] as const)("defaults unset or blank %s URLs to its separate database", (mode, key, expected) => {
    for (const value of [undefined, "", "   "]) {
      const env = getLocalEnv({ [key]: value }, mode);

      expect(env.DATABASE_URL_LOCAL).toBe(expected);
      expect(env.DATABASE_URL_TEST).toBe(expected);
      expect(env.POSTGRES_PRISMA_URL).toBe(expected);
      expect(env.POSTGRES_URL_NON_POOLING).toBe(expected);
    }
  });

  it.each(["127.0.0.1", "localhost", "LOCALHOST", "[::1]"])("allows the loopback host %s", (host) => {
    const value = `postgresql://user:password@${host}:54329/technicalblog_local`;
    expect(new URL(assertLocalDatabaseUrl(value)).hostname.toLowerCase()).toBe(host.toLowerCase());
  });

  it("allows the postgres scheme without forcing a port", () => {
    expect(assertLocalDatabaseUrl("postgres://localhost/technicalblog_local")).toBe("postgres://localhost/technicalblog_local");
  });

  it.each([
    "not a URL",
    "https://localhost/technicalblog_local",
    "postgresql://user:password@database.example.test/technicalblog_local",
    "postgresql://localhost/postgres",
    "postgresql://localhost/technicalblog_local_extra",
    "postgresql://localhost/technicalblog_local?host=database.example.test",
    "postgresql://localhost/technicalblog_local?hostaddr=192.0.2.1",
    "postgresql://localhost/technicalblog_local?service=production",
    "postgresql://localhost/technicalblog_local?sslmode=require",
    "postgresql://localhost/technicalblog_local#fragment",
  ])("rejects unsafe or unsupported URL %s", (value) => {
    expect(() => assertLocalDatabaseUrl(value)).toThrow("requires a loopback PostgreSQL URL");
  });

  it.each([
    ["development", DEFAULT_E2E_DATABASE_URL],
    ["e2e", DEFAULT_LOCAL_DATABASE_URL],
    ["development", "postgresql://localhost/technicalblog_test"],
    ["e2e", "postgresql://localhost/technicalblog_test"],
  ] as const)("rejects a database belonging to another mode (%s)", (mode, value) => {
    expect(() => assertLocalDatabaseUrl(value, mode)).toThrow("requires a loopback PostgreSQL URL");
  });

  it.each([
    ["development", "DATABASE_URL_LOCAL", "DATABASE_URL_TEST", "technicalblog_local"],
    ["e2e", "DATABASE_URL_TEST", "DATABASE_URL_LOCAL", "technicalblog_e2e"],
  ] as const)("selects only the explicit %s URL and ignores the other selector", (mode, key, ignoredKey, name) => {
    const selected = `postgres://localhost:54330/${name}`;
    const input = { [key]: selected, [ignoredKey]: "postgresql://remote.example.test/production" };
    const env = getLocalEnv(input, mode);

    expect(env.POSTGRES_PRISMA_URL).toBe(selected);
    expect(env.POSTGRES_URL_NON_POOLING).toBe(selected);
    expect(input[ignoredKey]).toBe("postgresql://remote.example.test/production");
  });

  it("does not infer E2E mode from an existing test URL", () => {
    const env = getLocalEnv({ DATABASE_URL_TEST: DEFAULT_E2E_DATABASE_URL });
    expect(env.POSTGRES_PRISMA_URL).toBe(DEFAULT_LOCAL_DATABASE_URL);
  });

  it("rejects unknown modes before selecting a target", () => {
    // @ts-expect-error Verify callers cannot bypass the runtime mode guard.
    expect(() => assertLocalDatabaseUrl(DEFAULT_LOCAL_DATABASE_URL, "production")).toThrow("Local mode must be development or e2e.");
    // @ts-expect-error Verify callers cannot bypass the runtime mode guard.
    expect(() => getLocalEnv({}, "production")).toThrow("Local mode must be development or e2e.");
  });

  it("overrides production services and credentials without changing NODE_ENV or mutating its input", () => {
    const input = {
      NODE_ENV: "development",
      POSTGRES_PRISMA_URL: "production-runtime-value",
      POSTGRES_URL_NON_POOLING: "production-migration-value",
      ADMIN_ACCESS_SECRET: "production-password",
      ADMIN_SESSION_SECRET: "production-session-key",
      SUPABASE_URL: "production-storage-value",
      SUPABASE_SERVICE_ROLE_KEY: "production-storage-key",
      NEXT_PUBLIC_SUPABASE_CUSTOM_KEY: "production-custom-key",
      VERCEL_ANALYTICS_ID: "production-analytics-value",
      INTERVIEW_SHARE_PAGES: "private-content",
      "interview-share-pages-base64": "private-content",
    };
    const env = getLocalEnv(input);

    expect(env.NODE_ENV).toBe("development");
    expect(env.POSTGRES_PRISMA_URL).toBe(DEFAULT_LOCAL_DATABASE_URL);
    expect(env.POSTGRES_URL_NON_POOLING).toBe(DEFAULT_LOCAL_DATABASE_URL);
    expect(env.ADMIN_ACCESS_SECRET).toBe("local-admin-only");
    expect(env.ADMIN_SESSION_SECRET).not.toBe(input.ADMIN_SESSION_SECRET);
    for (const key of [
      "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_CUSTOM_KEY", "VERCEL_ANALYTICS_ID",
      "INTERVIEW_SHARE_PAGES", "interview-share-pages-base64", "SUPABASE_SECRET_KEY", "NEXT_PUBLIC_SUPABASE_URL",
    ]) {
      expect(env[key]).toBe("");
    }
    expect(input.POSTGRES_PRISMA_URL).toBe("production-runtime-value");
    expect(input.ADMIN_ACCESS_SECRET).toBe("production-password");
  });

  it("rejects a remote migration URL before invoking Prisma and omits credentials from the error", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "local-migration-guard-"));
    const marker = path.join(directory, "called");
    writeFileSync(path.join(directory, "npx"), '#!/bin/sh\nprintf called > "$MIGRATION_SENTINEL"\n', { mode: 0o755 });

    try {
      const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/migrate-local-database.mjs", import.meta.url))], {
        encoding: "utf8",
        env: {
          NODE_ENV: "development",
          PATH: directory,
          MIGRATION_SENTINEL: marker,
          DATABASE_URL_LOCAL: "postgresql://guard-user:guard-password@database.example.test/technicalblog_local",
        },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("requires a loopback PostgreSQL URL");
      expect(result.stderr).not.toContain("guard-password");
      expect(result.stderr).not.toContain("database.example.test");
      expect(existsSync(marker)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
