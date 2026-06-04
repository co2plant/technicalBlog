"use client";

import dynamic from "next/dynamic";

type PdfViewerProps = {
  allowDownload: boolean;
  file: string;
  title: string;
};

const PdfViewerInner = dynamic(
  () => import("./pdf-viewer-inner.client").then((module) => module.PdfViewerInner),
  {
    ssr: false,
    loading: () => (
      <div className="mt-10 rounded-2xl border border-gh-border bg-gh-surface/40 p-8 text-center text-gh-muted">
        PDF 뷰어를 준비하는 중입니다...
      </div>
    ),
  },
);

export function PdfViewer(props: PdfViewerProps) {
  return <PdfViewerInner {...props} />;
}
