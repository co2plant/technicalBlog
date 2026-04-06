import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/posts", label: "게시글" },
  { href: "/git-collaboration", label: "Git 협업" },
  { href: "/admin", label: "관리" },
];

export function SiteHeader() {
  return (
    <header className="site-header" data-testid="site-header">
      <div className="site-header__inner">
        <p className="site-brand">co2plant 기술 블로그</p>
        <nav className="site-nav" aria-label="주요 내비게이션">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
