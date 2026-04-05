import { describe, expect, it, beforeEach } from "vitest";
import {
  createDraftPostFixture,
  createPublishedPostFixture,
  resetPostFixtureSeed,
} from "./post-fixtures";

describe("post fixture helpers", () => {
  beforeEach(() => {
    resetPostFixtureSeed();
  });

  it("creates deterministic published fixtures", () => {
    const first = createPublishedPostFixture();
    const second = createPublishedPostFixture();

    expect(first.id).toBe(1);
    expect(first.status).toBe("published");
    expect(second.id).toBe(2);
  });

  it("creates draft fixtures", () => {
    const draft = createDraftPostFixture();

    expect(draft.status).toBe("draft");
    expect(draft.slug).toBe("post-1");
  });
});
