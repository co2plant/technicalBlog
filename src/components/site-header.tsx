import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/posts", label: "게시글" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gh-border bg-gh-bg/80 backdrop-blur" data-testid="site-header">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <p className="font-semibold text-gh-text text-lg">co2plant 기술 블로그</p>
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
