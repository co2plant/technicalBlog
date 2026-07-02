import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SiteHeader } from "@/components/site-header";
import { DEFAULT_OPEN_GRAPH_IMAGE, getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-metadata";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
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

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gh-bg text-gh-text font-sans antialiased selection:bg-indigo-500/30 flex flex-col relative overflow-x-hidden">
        {/* 은은한 네온 조명 효과 */}
        <div className="pointer-events-none fixed left-0 top-0 z-[-1] h-full w-full opacity-40">
          <div className="absolute left-[20%] top-[10%] h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-[100px]" />
          <div className="absolute right-[20%] top-[30%] h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/20 blur-[100px]" />
        </div>

        <div className="flex min-h-screen flex-col" data-testid="app-shell">
          <SiteHeader />
          <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 md:py-12 relative z-10">{children}</main>
          <footer className="border-t border-gh-border/60 py-6 md:py-0 relative z-10 backdrop-blur-sm bg-gh-bg/50">
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
