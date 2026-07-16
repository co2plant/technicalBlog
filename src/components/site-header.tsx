import Link from "next/link";
import Image from "next/image";

const NAV_ITEMS = [
  { href: "/posts", label: "게시글" },
  { href: "/portfolio", label: "포트폴리오" },
  { href: "/tools", label: "도구" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gh-border bg-gh-bg/80 backdrop-blur" data-testid="site-header">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 whitespace-nowrap font-semibold text-lg text-gh-text"
        >
          <Image
            src="/logo.png"
            alt=""
            width={32}
            height={32}
            priority
          />
          <span>co2plant 기술 블로그</span>
        </Link>
        <nav className="flex items-center space-x-6 text-sm font-medium" aria-label="주요 내비게이션">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-gh-muted transition-colors hover:text-gh-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
