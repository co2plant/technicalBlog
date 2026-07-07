import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const connectionString =
  process.env.NODE_ENV === "test" ? nonEmptyEnv("DATABASE_URL_TEST") : nonEmptyEnv("POSTGRES_PRISMA_URL");

if (!connectionString) {
  throw new Error(`${process.env.NODE_ENV === "test" ? "DATABASE_URL_TEST" : "POSTGRES_PRISMA_URL"} is required to create the Prisma database client.`);
}

const adapter = new PrismaPg({ connectionString: withPgSslCompatibility(connectionString) });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function withPgSslCompatibility(databaseUrl: string): string {
  const url = new URL(databaseUrl);

  if (url.searchParams.get("sslmode") === "require" && !url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  }

  return url.toString();
}

function nonEmptyEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();

  if (!value || value === "\"\"" || value === "''") {
    return undefined;
  }

  return value;
}
