import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SiteHeader } from "@/components/site-header";
import { DEFAULT_OPEN_GRAPH_IMAGE, getSiteUrl, RSS_FEED_ALTERNATES, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-metadata";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    types: RSS_FEED_ALTERNATES,
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OPEN_GRAPH_IMAGE],
    locale: "ko_KR",
    siteName: SITE_NAME,
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OPEN_GRAPH_IMAGE],
  },
};

// Dynamic subset: the browser downloads only the glyph ranges a page uses.
const PRETENDARD_STYLESHEET =
  "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href={PRETENDARD_STYLESHEET} crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-gh-bg text-gh-text font-sans antialiased selection:bg-gh-accent/20 flex flex-col relative overflow-x-hidden">
        <div className="flex min-h-screen flex-col" data-testid="app-shell">
          <SiteHeader />
          <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 md:py-12 relative z-10">{children}</main>
          <footer className="border-t border-gh-border py-6 md:py-0 relative z-10 bg-gh-surface">
            <div className="mx-auto flex max-w-5xl items-center justify-center h-16 px-4">
              <p className="text-sm text-gh-muted">
                © {new Date().getFullYear()} co2plant
              </p>
            </div>
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
