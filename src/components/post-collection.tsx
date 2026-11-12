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
  layout?: "cards" | "list";
};

const ACCENT_STYLES: Record<
  Accent,
  {
    cardHover: string;
    titleHover: string;
    dateIcon: string;
    tag: string;
    primaryBadge: string;
  }
> = {
  indigo: {
    cardHover: "hover:border-gh-accent",
    titleHover: "group-hover:text-gh-accent-strong",
    dateIcon: "text-gh-accent-strong",
    tag: "bg-gh-accent/10 border-gh-accent/20 text-gh-accent-strong",
    primaryBadge: "border-gh-accent/30 bg-gh-accent/10 text-gh-accent-strong",
  },
  emerald: {
    cardHover: "hover:border-gh-accent",
    titleHover: "group-hover:text-gh-accent-strong",
    dateIcon: "text-gh-accent-strong",
    tag: "bg-gh-accent/10 border-gh-accent/20 text-gh-accent-strong",
    primaryBadge: "border-gh-accent/30 bg-gh-accent/10 text-gh-accent-strong",
  },
};

function formatCategory(category: string): string {
  return category.replaceAll("-", " ");
}

export function PostCollection({
  title,
  description,
  emptyMessage,
  posts,
  accent,
  headingTestId,
  primaryBadgeLabel,
  layout = "cards",
}: PostCollectionProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div className={`relative z-10 ${layout === "list" ? "mx-auto w-full max-w-3xl" : ""} ${layout === "list" && posts.length > 0 ? "space-y-0" : "space-y-8"}`}>
      <div className="border-b border-gh-border/60 pb-6">
        <h1
          id={headingTestId}
          className={`font-bold ${layout === "list" ? "text-heading-m text-gh-muted md:text-heading-l" : "flex items-center gap-3 text-3xl tracking-tight text-gh-text"}`}
          data-testid={headingTestId}
        >
          {title}
        </h1>
        <p className={`mt-3 text-gh-muted ${layout === "list" ? "text-body-m" : "text-lg"}`}>{description}</p>
      </div>

      {posts.length === 0 ? (
        <div className={`flex items-center justify-center border border-dashed border-gh-border bg-gh-surface ${layout === "list" ? "rounded-lg px-4 py-16" : "rounded-2xl py-20"}`}>
          <p className={`text-gh-muted ${layout === "list" ? "text-body-m" : "text-lg font-medium"}`}>{emptyMessage}</p>
        </div>
      ) : layout === "list" ? (
        <ul aria-labelledby={headingTestId} className="divide-y divide-gh-border border-b border-gh-border">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/posts/${post.slug}`}
                aria-labelledby={`post-title-${post.slug}`}
                className="group block rounded py-6"
              >
                <article className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-body-xs text-gh-muted">
                    <time dateTime={post.publishedAt} className="tabular-nums">{post.publishedAt}</time>
                    <span className="border-l border-gh-border pl-3 [overflow-wrap:anywhere]">{formatCategory(post.category)}</span>
                    {post.embeddedPdf ? (
                      <span className="rounded border border-gh-border px-2 py-1 font-bold">PDF</span>
                    ) : null}
                  </div>
                  <h2
                    id={`post-title-${post.slug}`}
                    className="mt-3 break-keep text-heading-s font-bold text-gh-text underline-offset-4 transition-colors [overflow-wrap:anywhere] group-hover:text-gh-accent-strong group-hover:underline motion-reduce:transition-none"
                  >
                    {post.title}
                  </h2>
                  {post.excerpt ? (
                    <p className="mt-2 line-clamp-2 text-body-s text-gh-muted [overflow-wrap:anywhere]">{post.excerpt}</p>
                  ) : null}
                  {post.tags.length > 0 ? (
                    <ul aria-label="태그" className="mt-4 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <li key={tag} className="max-w-full rounded border border-gh-border bg-gh-surface px-2 py-1 text-body-xs text-gh-muted [overflow-wrap:anywhere]">
                          {tag}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.slug} href={`/posts/${post.slug}`} className="group block h-full">
              <article
                className={`relative flex h-full flex-col overflow-hidden rounded-2xl border border-gh-border bg-gh-surface p-6 transition-colors ${styles.cardHover}`}
              >
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {primaryBadgeLabel && primaryBadgeLabel.toLowerCase() !== post.category ? (
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styles.primaryBadge}`}
                      >
                        {primaryBadgeLabel}
                      </span>
                    ) : null}
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styles.primaryBadge}`}
                    >
                      {formatCategory(post.category)}
                    </span>
                    {post.embeddedPdf ? (
                      <span className="inline-flex rounded-full border border-gh-accent/30 bg-gh-accent/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gh-accent-strong">
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
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
