import { describe, expect, it } from "vitest";
import { getPdfPageBuffer } from "../src/lib/pdf-page-buffer";

describe("PDF page buffer", () => {
  it("preloads the current and next page at the beginning", () => {
    expect(getPdfPageBuffer(1, 14)).toEqual([1, 2]);
  });

  it("keeps the previous, current, and next page in the middle", () => {
    expect(getPdfPageBuffer(7, 14)).toEqual([6, 7, 8]);
  });

  it("keeps the previous and current page at the end", () => {
    expect(getPdfPageBuffer(14, 14)).toEqual([13, 14]);
  });

  it("keeps only the current page when the document has one page", () => {
    expect(getPdfPageBuffer(1, 1)).toEqual([1]);
  });

  it("returns no pages for an invalid current page", () => {
    expect(getPdfPageBuffer(0, 14)).toEqual([]);
    expect(getPdfPageBuffer(15, 14)).toEqual([]);
    expect(getPdfPageBuffer(1, 0)).toEqual([]);
  });
});
