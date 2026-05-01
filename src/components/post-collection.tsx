import Link from "next/link";
import type { Post } from "@/lib/content";

type Accent = "indigo" | "emerald";

type PostCollectionProps = {
  title: string;
  description: string;
  emptyMessage: string;
  posts: Post[];
  accent: Accent;
  headingTestId: string;
  primaryBadgeLabel?: string;
};

const ACCENT_STYLES: Record<
  Accent,
  {
    headingBar: string;
    cardHover: string;
    titleHover: string;
    dateIcon: string;
    tag: string;
    accentLine: string;
    primaryBadge: string;
  }
> = {
  indigo: {
    headingBar: "bg-gradient-to-b from-blue-500 to-purple-500",
    cardHover: "hover:shadow-indigo-500/5 hover:border-indigo-500/30",
    titleHover:
      "group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-indigo-500",
    dateIcon: "text-indigo-400",
    tag: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400/90",
    accentLine:
      "from-blue-500/0 via-indigo-500/0 to-purple-500/0 group-hover:from-blue-500/40 group-hover:via-indigo-500/40 group-hover:to-purple-500/40",
    primaryBadge: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  },
  emerald: {
    headingBar: "bg-gradient-to-b from-emerald-500 to-cyan-500",
    cardHover: "hover:shadow-emerald-500/5 hover:border-emerald-500/30",
    titleHover:
      "group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-emerald-500 group-hover:to-cyan-500",
    dateIcon: "text-emerald-400",
    tag: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400/90",
    accentLine:
      "from-emerald-500/0 via-cyan-500/0 to-blue-500/0 group-hover:from-emerald-500/40 group-hover:via-cyan-500/40 group-hover:to-blue-500/40",
    primaryBadge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
};

export function PostCollection({
  title,
  description,
  emptyMessage,
  posts,
  accent,
  headingTestId,
  primaryBadgeLabel,
}: PostCollectionProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div className="relative z-10 space-y-8">
      <div className="border-b border-gh-border/60 pb-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-gh-text" data-testid={headingTestId}>
          <span className={`inline-block h-8 w-1.5 rounded-full ${styles.headingBar}`} />
          {title}
        </h1>
        <p className="ml-4 mt-3 text-lg text-gh-muted">{description}</p>
      </div>

      {posts.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-gh-border/60 bg-gh-surface/30 py-20 backdrop-blur-sm">
          <p className="text-lg font-medium text-gh-muted">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.slug} href={`/posts/${post.slug}`} className="group block h-full">
              <article
                className={`relative flex h-full flex-col overflow-hidden rounded-2xl border border-gh-border/70 bg-gh-surface/60 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${styles.cardHover}`}
              >
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {primaryBadgeLabel ? (
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styles.primaryBadge}`}
                      >
                        {primaryBadgeLabel}
                      </span>
                    ) : null}
                    {post.embeddedPdf ? (
                      <span className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-400">
                        PDF
                      </span>
                    ) : null}
                  </div>

                  <h2 className={`text-xl font-semibold text-gh-text transition-all ${styles.titleHover}`}>{post.title}</h2>
                  <p className="line-clamp-3 text-sm leading-relaxed text-gh-muted">{post.excerpt}</p>
                </div>

                <div className="mt-6 flex flex-col space-y-3 border-t border-gh-border/50 pt-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-gh-muted">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${styles.dateIcon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <time dateTime={post.publishedAt}>{post.publishedAt}</time>
                  </div>

                  {post.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styles.tag}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r transition-all duration-300 ${styles.accentLine}`} />
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
