"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
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

  return (
    <section className="mt-10 space-y-5" aria-label="PDF 미리보기" data-testid="pdf-viewer-section">
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

      <div className="rounded-2xl border border-gh-border bg-gh-surface/40 p-4 shadow-sm">
        <div ref={containerRef} className="mx-auto w-full max-w-4xl overflow-hidden rounded-xl bg-white">
          <Document
            file={file}
            loading={<div className="p-10 text-center text-gh-muted">PDF를 불러오는 중입니다...</div>}
            error={<div className="p-10 text-center text-red-500">PDF를 불러오지 못했습니다. 새 탭으로 열어 확인해주세요.</div>}
            onLoadSuccess={handleLoadSuccess}
          >
            <Page pageNumber={pageNumber} width={pageWidth} renderTextLayer renderAnnotationLayer />
          </Document>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-gh-border/70 bg-gh-surface/50 px-4 py-3">
        <button
          type="button"
          onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
          disabled={pageNumber <= 1}
          className="rounded-md border border-gh-border px-3 py-1.5 text-sm text-gh-text disabled:cursor-not-allowed disabled:opacity-40"
        >
          이전 페이지
        </button>

        <p className="text-sm text-gh-muted">
          {title} · {pageCount === 0 ? "로딩 중" : `${pageNumber} / ${pageCount} 페이지`}
        </p>

        <button
          type="button"
          onClick={() => setPageNumber((current) => Math.min(pageCount, current + 1))}
          disabled={pageCount === 0 || pageNumber >= pageCount}
          className="rounded-md border border-gh-border px-3 py-1.5 text-sm text-gh-text disabled:cursor-not-allowed disabled:opacity-40"
        >
          다음 페이지
        </button>
      </div>
    </section>
  );
}
