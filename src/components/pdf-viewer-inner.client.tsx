"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PDFPageProxy } from "pdfjs-dist";
import { Document, Page, pdfjs } from "react-pdf";
import { getPdfPageBuffer } from "@/lib/pdf-page-buffer";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type PdfViewerInnerProps = {
  allowDownload: boolean;
  file: string;
  title: string;
};

export function PdfViewerInner({ allowDownload, file, title }: PdfViewerInnerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pageWidth, setPageWidth] = useState(720);
  const [pageAspectRatios, setPageAspectRatios] = useState<Map<string, number>>(() => new Map());
  const [renderedPageVersions, setRenderedPageVersions] = useState<Map<number, string>>(() => new Map());

  const bufferedPageNumbers = getPdfPageBuffer(pageNumber, pageCount);
  const renderVersion = `${file}:${pageWidth}`;
  const pageAspectRatio = pageAspectRatios.get(`${file}:${pageNumber}`) ?? 16 / 9;
  const isCurrentPageReady = isPageReady(pageNumber);
  const isPreviousPageReady = pageNumber > 1 && isPageReady(pageNumber - 1);
  const isNextPageReady = pageNumber < pageCount && isPageReady(pageNumber + 1);
  const currentRenderVersionRef = useRef(renderVersion);
  const bufferedPageNumbersRef = useRef(new Set(bufferedPageNumbers));

  useLayoutEffect(() => {
    currentRenderVersionRef.current = renderVersion;
    bufferedPageNumbersRef.current = new Set(getPdfPageBuffer(pageNumber, pageCount));
  }, [pageCount, pageNumber, renderVersion]);

  useEffect(() => {
    const node = containerRef.current;

    if (!node) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      setPageWidth(Math.floor(entry.contentRect.width));
    });

    resizeObserver.observe(node);
    setPageWidth(Math.floor(node.getBoundingClientRect().width));

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  function handleLoadSuccess({ numPages }: { numPages: number }) {
    setPageCount(numPages);
    setPageNumber(1);
  }

  function handlePageLoadSuccess(bufferedPageNumber: number, page: PDFPageProxy) {
    const viewport = page.getViewport({ scale: 1 });
    const nextAspectRatio = viewport.width / viewport.height;
    const aspectRatioKey = `${file}:${bufferedPageNumber}`;

    setPageAspectRatios((current) => {
      if (current.get(aspectRatioKey) === nextAspectRatio) {
        return current;
      }

      const next = new Map(current);
      next.set(aspectRatioKey, nextAspectRatio);
      return next;
    });
  }

  function handlePageRenderSuccess(bufferedPageNumber: number, completedRenderVersion: string) {
    if (completedRenderVersion !== currentRenderVersionRef.current || !bufferedPageNumbersRef.current.has(bufferedPageNumber)) {
      return;
    }

    setRenderedPageVersions((current) => {
      if (current.get(bufferedPageNumber) === completedRenderVersion) {
        return current;
      }

      const next = new Map(current);
      next.set(bufferedPageNumber, completedRenderVersion);
      return next;
    });
  }

  function isPageReady(targetPageNumber: number): boolean {
    return renderedPageVersions.get(targetPageNumber) === renderVersion;
  }

  function goToPage(targetPageNumber: number) {
    if (targetPageNumber < 1 || targetPageNumber > pageCount || !isPageReady(targetPageNumber)) {
      return;
    }

    const nextBufferedPages = new Set(getPdfPageBuffer(targetPageNumber, pageCount));
    bufferedPageNumbersRef.current = nextBufferedPages;

    setRenderedPageVersions((current) => {
      const next = new Map([...current].filter(([bufferedPageNumber]) => nextBufferedPages.has(bufferedPageNumber)));
      return next.size === current.size ? current : next;
    });
    setPageNumber(targetPageNumber);
  }

  return (
    <section
      className="relative left-1/2 mt-10 w-[calc(100vw-2rem)] max-w-6xl -translate-x-1/2 space-y-5"
      aria-label="PDF 미리보기"
      data-testid="pdf-viewer-section"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gh-text">PDF 미리보기</h2>
          <p className="text-sm text-gh-muted">포트폴리오 문서를 페이지 단위로 확인할 수 있습니다.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={file}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gh-border bg-gh-surface px-4 py-2 text-sm font-medium text-gh-text hover:bg-gh-hover"
          >
            새 탭에서 열기
          </a>
          {allowDownload ? (
            <a
              href={file}
              download
              data-testid="pdf-download-link"
              className="inline-flex items-center gap-2 rounded-lg bg-gh-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              다운로드
            </a>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-gh-border bg-gh-surface/40 p-2 shadow-sm sm:p-4">
        <div
          ref={containerRef}
          className="relative mx-auto w-full overflow-hidden rounded-xl bg-white transition-[aspect-ratio] duration-200"
          style={{ aspectRatio: pageAspectRatio }}
          data-testid="pdf-page-stage"
        >
          <Document
            file={file}
            loading={<div className="absolute inset-0 grid place-items-center p-10 text-center text-gh-muted">PDF를 불러오는 중입니다...</div>}
            error={
              <div className="absolute inset-0 grid place-items-center p-10 text-center text-red-500">
                PDF를 불러오지 못했습니다. 새 탭으로 열어 확인해주세요.
              </div>
            }
            onLoadSuccess={handleLoadSuccess}
          >
            {bufferedPageNumbers.map((bufferedPageNumber) => {
              const isCurrentPage = bufferedPageNumber === pageNumber;
              const bufferPosition = isCurrentPage ? "current" : bufferedPageNumber < pageNumber ? "previous" : "next";

              return (
                <div
                  key={`${file}:${bufferedPageNumber}`}
                  className={`absolute inset-0 transition-opacity duration-150 ${
                    isCurrentPage ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
                  }`}
                  aria-hidden={!isCurrentPage}
                  data-page-buffer={bufferPosition}
                  data-buffer-page-number={bufferedPageNumber}
                >
                  <Page
                    pageNumber={bufferedPageNumber}
                    width={pageWidth}
                    loading={null}
                    onLoadSuccess={(page) => handlePageLoadSuccess(bufferedPageNumber, page)}
                    onRenderSuccess={() => handlePageRenderSuccess(bufferedPageNumber, renderVersion)}
                    renderTextLayer={isCurrentPage}
                    renderAnnotationLayer={isCurrentPage}
                  />
                </div>
              );
            })}
          </Document>

          {pageCount > 0 && !isCurrentPageReady ? (
            <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-white/80 text-sm font-medium text-gh-muted">
              페이지를 준비하는 중입니다...
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-gh-border/70 bg-gh-surface/50 px-4 py-3">
        <button
          type="button"
          onClick={() => goToPage(pageNumber - 1)}
          disabled={pageNumber <= 1 || !isPreviousPageReady}
          className="rounded-md border border-gh-border px-3 py-1.5 text-sm text-gh-text disabled:cursor-not-allowed disabled:opacity-40"
        >
          이전 페이지
        </button>

        <p className="text-center text-sm text-gh-muted" aria-live="polite">
          {title} · {pageCount === 0 ? "로딩 중" : `${pageNumber} / ${pageCount} 페이지`}
        </p>

        <button
          type="button"
          onClick={() => goToPage(pageNumber + 1)}
          disabled={pageCount === 0 || pageNumber >= pageCount || !isNextPageReady}
          className="rounded-md border border-gh-border px-3 py-1.5 text-sm text-gh-text disabled:cursor-not-allowed disabled:opacity-40"
        >
          다음 페이지
        </button>
      </div>
    </section>
  );
}
