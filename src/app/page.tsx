import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gh-text leading-tight mt-10" data-testid="home-page-heading">
        Welcome to the <br className="md:hidden" />
        co2plant Blog
      </h1>
      <p className="max-w-2xl text-lg md:text-xl text-gh-muted leading-relaxed mt-4">
        co2plant의 기술 블로그에 오신것을 환영합니다.
      </p>

      <div className="flex gap-4 mt-10 pt-4">
        <Link
          href="/posts"
          className="px-8 py-3.5 bg-gh-accent text-white font-semibold rounded-full hover:bg-gh-accent-strong transition-colors"
        >
          게시글 탐색
        </Link>
        <a
          href="https://github.com/co2plant"
          target="_blank"
          rel="noreferrer"
          className="px-8 py-3.5 bg-gh-bg border border-gh-border text-gh-text font-medium rounded-full hover:bg-gh-surface transition-colors"
        >
          GitHub
        </a>
      </div>
    </div>
  );
}
