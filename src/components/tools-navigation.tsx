"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { TOOLS, TOOLS_SIDEBAR_STORAGE_KEY } from "@/lib/tools";

const PREFERENCE_EVENT = "tools-sidebar-change";

// <html data-tools-sidebar="open"> is the single source of truth: the boot script in layout.tsx sets it
// before first paint and the CSS `tools-open` variant sizes the layout from it.
function readCollapsed() {
  return document.documentElement.dataset.toolsSidebar !== "open";
}

function applyCollapsed(collapsed: boolean) {
  if (collapsed) {
    delete document.documentElement.dataset.toolsSidebar;
  } else {
    document.documentElement.dataset.toolsSidebar = "open";
  }
}

function subscribeToPreference(listener: () => void) {
  function syncFromOtherTab(event: StorageEvent) {
    if (event.key !== null && event.key !== TOOLS_SIDEBAR_STORAGE_KEY) {
      return;
    }

    applyCollapsed(event.newValue !== "false");
    listener();
  }

  window.addEventListener("storage", syncFromOtherTab);
  window.addEventListener(PREFERENCE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", syncFromOtherTab);
    window.removeEventListener(PREFERENCE_EVENT, listener);
  };
}

export function ToolsNavigation() {
  const pathname = usePathname();
  const [dismissedTooltip, setDismissedTooltip] = useState<string | null>(null);
  const collapsed = useSyncExternalStore(subscribeToPreference, readCollapsed, () => true);

  function toggleSidebar() {
    const next = !collapsed;
    applyCollapsed(next);
    try {
      window.localStorage.setItem(TOOLS_SIDEBAR_STORAGE_KEY, String(next));
    } catch {
      // The attribute keeps the choice for this visit.
    }
    window.dispatchEvent(new Event(PREFERENCE_EVENT));
  }

  if (/^\/(admin|interviews)(\/|$)/.test(pathname)) {
    return null;
  }

  return (
    <>
      <div
        data-testid="tools-sidebar-space"
        className="sticky top-14 z-40 lg:h-0 lg:shrink-0 lg:transition-[width] lg:duration-200 lg:ease-linear lg:motion-reduce:transition-none lg:motion-reduce:duration-0 lg:w-0 lg:tools-open:w-12"
      >
        <nav
          id="site-tools-menu"
          aria-label="도구"
          data-testid="tools-navigation"
          className="flex items-center justify-center gap-3 border-b border-gh-border bg-gh-bg px-4 py-2 lg:fixed lg:top-14 lg:bottom-0 lg:left-0 lg:w-12 lg:flex-col lg:justify-start lg:gap-2 lg:border-r lg:border-b-0 lg:px-1 lg:py-4 lg:invisible lg:tools-open:visible"
        >
          {TOOLS.map((tool) => {
            const active = pathname === tool.href || pathname.startsWith(`${tool.href}/`);
            return (
              <Link
                key={tool.href}
                href={tool.href}
                aria-label={tool.label}
                aria-current={active ? "page" : undefined}
                onFocus={() => setDismissedTooltip(null)}
                onMouseEnter={() => setDismissedTooltip(null)}
                onClick={() => setDismissedTooltip(tool.href)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setDismissedTooltip(tool.href);
                  }
                }}
                className={`group relative flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-2 py-2 transition-colors motion-reduce:transition-none hover:bg-gh-hover hover:text-gh-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gh-accent lg:h-10 lg:min-h-10 lg:w-10 lg:flex-none lg:p-0 ${active ? "bg-gh-accent/10 text-gh-accent-strong" : "text-gh-muted"}`}
              >
                <ToolIcon icon={tool.icon} />
                <span className="text-body-xs font-medium lg:hidden">{tool.shortLabel}</span>
                <span
                  aria-hidden="true"
                  className={`absolute top-1/2 left-full hidden -translate-y-1/2 pl-3 lg:block ${dismissedTooltip === tool.href ? "invisible" : "invisible group-hover:visible group-focus-visible:visible"}`}
                >
                  <span className="block whitespace-nowrap rounded-md border border-gh-border bg-gh-bg px-3 py-2 text-body-s font-medium text-gh-text shadow-sm">
                    {tool.label}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
      <button
        type="button"
        aria-label={collapsed ? "도구 메뉴 펼치기" : "도구 메뉴 접기"}
        aria-expanded={!collapsed}
        aria-controls="site-tools-menu"
        title={collapsed ? "도구 메뉴 펼치기" : "도구 메뉴 접기"}
        onClick={toggleSidebar}
        className="fixed top-3 left-2 z-[55] hidden h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-gh-border hover:bg-gh-hover hover:text-gh-accent-strong focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gh-accent lg:flex bg-gh-bg text-gh-muted tools-open:bg-gh-accent/10 tools-open:text-gh-accent-strong"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </>
  );
}

function ToolIcon({ icon }: { icon: (typeof TOOLS)[number]["icon"] }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {icon === "password" ? <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></> : null}
      {icon === "stack" ? <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" /></> : null}
      {icon === "ratio" ? <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M14 4v16M14 12h7" /></> : null}
    </svg>
  );
}
