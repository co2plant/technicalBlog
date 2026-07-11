export function getPdfPageBuffer(pageNumber: number, pageCount: number): number[] {
  if (!Number.isInteger(pageNumber) || !Number.isInteger(pageCount) || pageCount < 1 || pageNumber < 1 || pageNumber > pageCount) {
    return [];
  }

  return [pageNumber - 1, pageNumber, pageNumber + 1].filter((candidate) => candidate >= 1 && candidate <= pageCount);
}
