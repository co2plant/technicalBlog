import "server-only";

import { AdminRequestError } from "@/lib/admin-api-response";
import type { AdminPostInput, AdminTagInput } from "@/lib/blog-admin";

export function parseAdminPostInput(payload: unknown): AdminPostInput {
  if (!isRecord(payload)) {
    throw new AdminRequestError("Invalid post payload.");
  }

  return {
    title: requiredString(payload.title, "title"),
    description: requiredStringValue(payload.description, "description").trim(),
    excerpt: requiredStringValue(payload.excerpt, "excerpt").trim(),
    bodyMarkdown: requiredStringValue(payload.bodyMarkdown, "bodyMarkdown"),
    extension: parseExtension(payload.extension),
    author: requiredString(payload.author, "author"),
    categorySlug: requiredSlug(payload.categorySlug, "categorySlug"),
    tags: parseTags(payload.tags),
    originalUrl: optionalNullableString(payload.originalUrl, "originalUrl"),
    coverImageUrl: optionalNullableString(payload.coverImageUrl, "coverImageUrl"),
    embeddedPdfUrl: optionalNullableString(payload.embeddedPdfUrl, "embeddedPdfUrl"),
    allowPdfDownload: requiredBoolean(payload.allowPdfDownload, "allowPdfDownload"),
  };
}

export function parseAdminPostSaveMode(payload: unknown): "manual" | "autosave" {
  if (!isRecord(payload) || payload.saveMode === undefined) {
    return "manual";
  }

  if (payload.saveMode === "manual" || payload.saveMode === "autosave") {
    return payload.saveMode;
  }

  throw new AdminRequestError("saveMode must be manual or autosave.");
}

export function parseCategoryInput(payload: unknown): {
  name: string;
  slug: string;
  sortOrder?: number;
} {
  if (!isRecord(payload)) {
    throw new AdminRequestError("Invalid category payload.");
  }

  const sortOrder = parseOptionalInteger(payload.sortOrder, "sortOrder");

  return {
    name: requiredString(payload.name, "name"),
    slug: requiredSlug(payload.slug, "slug"),
    sortOrder,
  };
}

function parseExtension(value: unknown): "md" | "mdx" {
  if (value === "md" || value === "mdx") {
    return value;
  }

  throw new AdminRequestError("extension must be md or mdx.");
}

function parseTags(value: unknown): AdminTagInput[] {
  if (!Array.isArray(value)) {
    throw new AdminRequestError("tags must be an array.");
  }

  const tags = new Map<string, AdminTagInput>();

  for (const item of value) {
    if (!isRecord(item)) {
      throw new AdminRequestError("each tag must be an object.");
    }

    const name = requiredString(item.name, "tag name");
    const slug = optionalTypedString(item.slug, "tag slug");

    if (slug && !isValidSlug(slug)) {
      throw new AdminRequestError(`tag slug "${slug}" must use ^[a-z0-9][a-z0-9-]*$.`);
    }

    const generatedSlug = slugify(name);

    if (!slug && !generatedSlug) {
      throw new AdminRequestError(`tag "${name}" needs an ASCII slug.`);
    }

    tags.set(slug ?? generatedSlug, {
      name,
      slug: slug || undefined,
    });
  }

  return [...tags.values()];
}

function requiredString(value: unknown, key: string): string {
  const text = optionalString(value);

  if (!text) {
    throw new AdminRequestError(`${key} is required.`);
  }

  return text;
}

function requiredStringValue(value: unknown, key: string): string {
  if (typeof value !== "string") {
    throw new AdminRequestError(`${key} must be a string.`);
  }

  return value;
}

function requiredBoolean(value: unknown, key: string): boolean {
  if (typeof value !== "boolean") {
    throw new AdminRequestError(`${key} must be a boolean.`);
  }

  return value;
}

function requiredSlug(value: unknown, key: string): string {
  const text = requiredString(value, key);

  if (!isValidSlug(text)) {
    throw new AdminRequestError(`${key} must use ^[a-z0-9][a-z0-9-]*$.`);
  }

  return text;
}

function optionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalTypedString(value: unknown, key: string): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value !== "string") {
    throw new AdminRequestError(`${key} must be a string.`);
  }

  return value.trim();
}

function parseOptionalInteger(value: unknown, key: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new AdminRequestError(`${key} must be an integer.`);
  }

  return value;
}

function optionalNullableString(value: unknown, key: string): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AdminRequestError(`${key} must be a string or null.`);
  }

  return value.trim() || null;
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(value);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
