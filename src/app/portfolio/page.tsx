import Link from "next/link";
import { getPublishedPortfolioPosts } from "@/lib/content";

export default async function PortfolioPage() {
  const portfolioPosts = await getPublishedPortfolioPosts();

  return (
    <div className="space-y-8 relative z-10">
      <div className="border-b border-gh-border/60 pb-6">
        <h1 className="text-3xl font-bold text-gh-text tracking-tight flex items-center gap-3" data-testid="portfolio-page-heading">
          <span className="w-1.5 h-8 bg-gradient-to-b from-emerald-500 to-cyan-500 rounded-full inline-block"></span>
          포트폴리오
        </h1>
        <p className="text-gh-muted mt-3 text-lg ml-4">
          프로젝트 결과물, 발표 자료, 문서형 산출물을 한곳에서 모아봅니다.
        </p>
      </div>

      {portfolioPosts.length === 0 ? (
        <div className="flex items-center justify-center py-20 border border-dashed border-gh-border/60 rounded-2xl bg-gh-surface/30 backdrop-blur-sm">
          <p className="text-gh-muted text-lg font-medium">아직 추가된 포트폴리오가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolioPosts.map((post) => (
            <Link key={post.slug} href={`/posts/${post.slug}`} className="group block h-full">
              <article className="flex flex-col h-full bg-gh-surface/60 backdrop-blur-md border border-gh-border/70 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-500/30 relative overflow-hidden">
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
                      Portfolio
                    </span>
                    {post.embeddedPdf ? (
                      <span className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-400">
                        PDF
                      </span>
                    ) : null}
                  </div>

                  <h2 className="text-xl font-semibold text-gh-text group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-emerald-500 group-hover:to-cyan-500 transition-all">
                    {post.title}
                  </h2>
                  <p className="text-sm text-gh-muted line-clamp-3 leading-relaxed">{post.excerpt}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-gh-border/50 flex flex-col space-y-3">
                  <div className="flex items-center gap-2 text-xs text-gh-muted font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <time dateTime={post.publishedAt}>{post.publishedAt}</time>
                  </div>

                  {post.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400/90 tracking-wide uppercase"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-cyan-500/0 to-blue-500/0 group-hover:from-emerald-500/40 group-hover:via-cyan-500/40 group-hover:to-blue-500/40 transition-all duration-300"></div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
