import { spawnSync } from "node:child_process";
import process from "node:process";
import { getLocalEnv } from "./local-env.mjs";

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--e2e")) {
  throw new Error("사용법: node scripts/migrate-local-database.mjs [--e2e]");
}

let env;

try {
  env = getLocalEnv(process.env, args[0] === "--e2e" ? "e2e" : "development");
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: {
    ...env,
    NODE_ENV: "test",
  },
});

process.exit(result.status ?? 1);
