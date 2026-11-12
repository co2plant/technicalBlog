import Link from "next/link";
import Image from "next/image";

const NAV_ITEMS = [
  { href: "/posts", label: "게시글" },
  { href: "/portfolio", label: "포트폴리오" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gh-border bg-gh-bg" data-testid="site-header">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 lg:pl-14 xl:pl-4">
        <Link
          href="/"
          className="flex items-center gap-2 whitespace-nowrap text-body-s font-semibold text-gh-text md:text-lg"
        >
          <Image
            src="/logo.png"
            alt=""
            width={32}
            height={32}
            className="h-7 w-7 shrink-0 md:h-8 md:w-8"
            priority
          />
          <span>co2plant 기술 블로그</span>
        </Link>
        <nav className="flex items-center gap-2 text-body-xs font-medium sm:gap-4 md:gap-6 md:text-sm" aria-label="주요 내비게이션">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-gh-muted transition-colors hover:text-gh-accent-strong"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
