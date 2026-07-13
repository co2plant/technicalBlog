import { Prisma } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  adminApiErrorResponse,
  AdminRequestError,
} from "../src/lib/admin-api-response";

describe("admin API error responses", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns validation details only for request errors", async () => {
    const response = adminApiErrorResponse(new AdminRequestError("title is required."));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "title is required." });
  });

  it("marks exhausted serialization conflicts as retryable", async () => {
    const response = adminApiErrorResponse(
      new Prisma.PrismaClientKnownRequestError("serialization conflict", {
        code: "P2034",
        clientVersion: Prisma.prismaVersion.client,
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "A temporary database conflict occurred. Please retry.",
      retryable: true,
    });
  });

  it("does not expose unexpected server error details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = adminApiErrorResponse(new Error("database password leaked"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Internal server error." });
  });
});
