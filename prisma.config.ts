import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";

loadLocalEnvFiles([".env.local", ".env"]);

const migrationDatabaseUrl = nonEmptyEnv("POSTGRES_URL_NON_POOLING") ?? nonEmptyEnv("POSTGRES_PRISMA_URL");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: migrationDatabaseUrl
    ? {
        url: migrationDatabaseUrl,
      }
    : undefined,
});

function loadLocalEnvFiles(fileNames: string[]): void {
  for (const fileName of fileNames) {
    const envPath = path.join(process.cwd(), fileName);

    if (!existsSync(envPath)) {
      continue;
    }

    const source = readFileSync(envPath, "utf8");

    for (const line of source.split(/\r?\n/)) {
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());

      if (!match || nonEmptyEnv(match[1])) {
        continue;
      }

      const [, key, rawValue] = match;
      process.env[key] = unquoteEnvValue(rawValue.trim());
    }
  }
}

function unquoteEnvValue(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replaceAll("\\n", "\n");
  }

  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  return value;
}

function nonEmptyEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}
