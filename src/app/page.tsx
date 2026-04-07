import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gh-text leading-tight mt-10">
        Welcome to the <br className="md:hidden" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
          co2plant
        </span> Blog
      </h1>
      <p className="max-w-2xl text-lg md:text-xl text-gh-muted leading-relaxed mt-4">
        현재 Next.js App Router 기반의 공개 블로그 셸을 준비하고 있습니다.
        게시글은 마크다운 파일과 데이터베이스를 결합하여 안정적이고 유연하게 관리됩니다.
      </p>
      
      <div className="flex gap-4 mt-10 pt-4">
        <Link
          href="/posts"
          className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-full hover:shadow-[0_0_20px_rgba(79,70,229,0.35)] transition-all shadow-md transform hover:-translate-y-1"
        >
          게시글 탐색
        </Link>
        <a 
          href="https://github.com/co2plant" 
          target="_blank"
          rel="noreferrer"
          className="px-8 py-3.5 bg-gh-surface/80 border border-gh-border/80 text-gh-text font-medium rounded-full hover:bg-gh-hover transition-all shadow-sm backdrop-blur-sm"
        >
          GitHub
        </a>
      </div>
    </div>
  );
}
