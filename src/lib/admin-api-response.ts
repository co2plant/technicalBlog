import "server-only";

import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export class AdminRequestError extends Error {
  override readonly name = "AdminRequestError";
}

export class AdminNotFoundError extends Error {
  override readonly name = "AdminNotFoundError";
}

export class AdminUpstreamError extends Error {
  override readonly name = "AdminUpstreamError";
}

export function parseAdminPostId(value: string): number {
  const postId = Number(value);

  if (!Number.isInteger(postId) || postId <= 0) {
    throw new AdminRequestError("Invalid post id.");
  }

  return postId;
}

export function adminApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof AdminRequestError || error instanceof SyntaxError) {
    return NextResponse.json(
      { error: error instanceof SyntaxError ? "Invalid JSON payload." : error.message },
      { status: 400 },
    );
  }

  if (error instanceof AdminNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof AdminUpstreamError) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A conflicting record already exists." }, { status: 409 });
    }

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    }

    if (error.code === "P2034") {
      return NextResponse.json(
        {
          error: "A temporary database conflict occurred. Please retry.",
          retryable: true,
        },
        { status: 503 },
      );
    }
  }

  console.error("Admin API request failed.", error);
  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}
