export const DEFAULT_LOCAL_DATABASE_URL =
  "postgresql://technicalblog:technicalblog@127.0.0.1:54329/technicalblog_local";
export const DEFAULT_E2E_DATABASE_URL =
  "postgresql://technicalblog:technicalblog@127.0.0.1:54329/technicalblog_e2e";

const BLOCKED_ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_KEY",
  "SUPABASE_SECRET",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_BLOG_IMAGES_BUCKET",
  "SUPABASE_BLOG_ASSETS_BUCKET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "VERCEL_ANALYTICS_ID",
  "interview_share_pages",
  "interview-share-pages",
  "INTERVIEW_SHARE_PAGES",
  "interview_share_pages_base64",
  "interview-share-pages-base64",
  "INTERVIEW_SHARE_PAGES_BASE64",
];

/**
 * @param {string} value
 * @param {"development" | "e2e"} [mode]
 */
export function assertLocalDatabaseUrl(value, mode = "development") {
  if (mode !== "development" && mode !== "e2e") {
    throw new Error("Local mode must be development or e2e.");
  }

  const databaseName = mode === "e2e" ? "technicalblog_e2e" : "technicalblog_local";
  const message = `Local ${mode} requires a loopback PostgreSQL URL for ${databaseName} without query parameters.`;
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(message);
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname.toLowerCase()) ||
    url.pathname !== `/${databaseName}` ||
    url.search ||
    url.hash
  ) {
    throw new Error(message);
  }

  url.hostname = url.hostname.toLowerCase();
  return url.toString();
}

/**
 * @param {Record<string, string | undefined>} [input]
 * @param {"development" | "e2e"} [mode]
 * @returns {Record<string, string | undefined>}
 */
export function getLocalEnv(input = process.env, mode = "development") {
  const key = mode === "e2e" ? "DATABASE_URL_TEST" : "DATABASE_URL_LOCAL";
  const defaultUrl = mode === "e2e" ? DEFAULT_E2E_DATABASE_URL : DEFAULT_LOCAL_DATABASE_URL;
  const databaseUrl = assertLocalDatabaseUrl(input[key]?.trim() || defaultUrl, mode);
  const env = {
    ...input,
    DATABASE_URL_LOCAL: databaseUrl,
    DATABASE_URL_TEST: databaseUrl,
    POSTGRES_PRISMA_URL: databaseUrl,
    POSTGRES_URL_NON_POOLING: databaseUrl,
    ADMIN_ACCESS_SECRET: "local-admin-only",
    ADMIN_SESSION_SECRET: "local-session-only-do-not-use-in-production",
  };

  for (const key of new Set([
    ...BLOCKED_ENV_KEYS,
    ...Object.keys(input).filter((key) => /^(?:SUPABASE_|NEXT_PUBLIC_SUPABASE_)/.test(key)),
  ])) {
    env[key] = "";
  }

  return env;
}
