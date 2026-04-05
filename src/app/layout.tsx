import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "co2plant 기술 블로그",
  description: "Next.js App Router 기반 기술 블로그 스캐폴드",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>
        <div className="site-shell" data-testid="app-shell">
          <SiteHeader />
          <main className="site-main">{children}</main>
          <footer className="site-footer">© {new Date().getFullYear()} co2plant</footer>
        </div>
      </body>
    </html>
  );
}
