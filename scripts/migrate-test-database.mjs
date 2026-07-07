import { spawnSync } from "node:child_process";
import process from "node:process";

const testDatabaseUrl =
  process.env.DATABASE_URL_TEST ??
  "postgresql://technicalblog:technicalblog@127.0.0.1:54329/technicalblog_test";

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL_TEST: testDatabaseUrl,
    NODE_ENV: "test",
  },
});

process.exit(result.status ?? 1);
