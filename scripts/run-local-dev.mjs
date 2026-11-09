import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getLocalEnv } from "./local-env.mjs";

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--e2e")) {
  throw new Error("사용법: node scripts/run-local-dev.mjs [--e2e]");
}

const port = args[0] === "--e2e" ? "4173" : "3000";
const nextCli = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const child = spawn(process.execPath, [nextCli, "dev", "--hostname", "127.0.0.1", "--port", port], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  env: getLocalEnv(process.env, args[0] === "--e2e" ? "e2e" : "development"),
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", () => {
  console.error("로컬 서버를 시작하지 못했습니다. npm ci를 먼저 실행하세요.");
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
