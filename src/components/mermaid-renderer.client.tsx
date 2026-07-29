"use client";

import { useEffect } from "react";

type MermaidRendererProps = {
  containerSelector?: string;
};

function prefersDarkMode(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function MermaidRenderer({ containerSelector = ".post-detail__body" }: MermaidRendererProps) {
  useEffect(() => {
    const container = document.querySelector(containerSelector);

    if (!container) {
      return;
    }

    const blocks = Array.from(container.querySelectorAll<HTMLElement>("pre.mermaid"));

    if (blocks.length === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const { default: mermaid } = await import("mermaid");

      if (cancelled) {
        return;
      }

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: prefersDarkMode() ? "dark" : "default",
      });

      try {
        await mermaid.run({ nodes: blocks });
      } catch {
        // A malformed diagram should not break the rest of the page; mermaid
        // already renders its own inline error message inside the block.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [containerSelector]);

  return null;
}
