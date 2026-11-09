import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { getLocalEnv } from "./local-env.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--e2e")) {
  throw new Error("사용법: node scripts/setup-local.mjs [--e2e]");
}
const mode = args[0] === "--e2e" ? "e2e" : "development";
const env = getLocalEnv(process.env, mode);

run("docker", ["compose", "up", "-d", "--wait", "--wait-timeout", "60"]);

const databaseUrl = new URL(env.DATABASE_URL_TEST);
const databaseName = databaseUrl.pathname.slice(1);
databaseUrl.pathname = "/postgres";
const client = new pg.Client({ connectionString: databaseUrl.toString() });

try {
  await client.connect();
  const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);
  if (existing.rowCount === 0) {
    const legacy = mode === "development"
      ? await client.query("SELECT 1 FROM pg_database WHERE datname = 'technicalblog_test'")
      : null;

    if (legacy?.rowCount) {
      // Preserve data from the previous local setup instead of creating an empty replacement.
      await client.query('ALTER DATABASE "technicalblog_test" RENAME TO "technicalblog_local"');
      console.log("기존 로컬 DB를 technicalblog_local로 이전했습니다. 데이터는 유지됩니다.");
    } else {
      // The name comes from the mode-specific allowlist in getLocalEnv().
      await client.query(`CREATE DATABASE "${databaseName}"`);
    }
  }
} finally {
  await client.end();
}

run(process.execPath, ["scripts/migrate-local-database.mjs", ...args]);
run(process.execPath, ["scripts/seed-local-database.mjs", ...args]);
console.log(`${mode === "e2e" ? "E2E" : "로컬 개발"} DB와 샘플 글 준비가 끝났습니다.`);

function run(command, args) {
  const result = spawnSync(command, args, { cwd: projectRoot, env, stdio: "inherit" });

  if (result.error || result.status !== 0) {
    console.error("로컬 환경 준비에 실패했습니다. Docker Desktop 실행 및 npm ci 완료 여부를 확인하세요.");
    process.exit(result.status || 1);
  }
}
