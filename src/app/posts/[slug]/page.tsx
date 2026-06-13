import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PdfViewer } from "@/components/pdf-viewer.client";
import { getPostBySlug, getPublishedPosts } from "@/lib/content";

function formatCategory(category: string): string {
  return category.replaceAll("-", " ");
}

type PostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post || post.draft) {
    return {
      title: "게시글을 찾을 수 없습니다",
    };
  }

  const coverImages = post.coverImage
    ? [
        {
          url: post.coverImage,
          alt: post.title,
        },
      ]
    : undefined;

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/posts/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `/posts/${post.slug}`,
      siteName: "co2plant 기술 블로그",
      locale: "ko_KR",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      section: post.category,
      tags: post.tags,
      images: coverImages,
    },
    twitter: {
      card: coverImages ? "summary_large_image" : "summary",
      title: post.title,
      description: post.description,
      images: coverImages,
    },
  };
}

export default async function PostDetailPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post || post.draft) {
    notFound();
  }

  const secondaryAttachments = post.embeddedPdf
    ? post.attachments.filter((attachment) => attachment.url !== post.embeddedPdf)
    : post.attachments;

  return (
    <article className="max-w-3xl mx-auto py-10 px-4 w-full">
      <header className="mb-10 text-center md:text-left">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
          <span className="text-indigo-500 font-semibold tracking-wider uppercase text-sm">{formatCategory(post.category)}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gh-text mb-6 leading-[1.15]" data-testid="post-detail-heading">
          {post.title}
        </h1>
        <p className="text-xl text-gh-muted leading-relaxed mb-6">
          {post.description}
        </p>
        
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gh-muted border-b border-gh-border/60 pb-8">
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <time dateTime={post.publishedAt}>{post.publishedAt}</time>
          </div>
          {post.author && (
            <div className="flex items-center gap-1.5 before:content-['·'] before:mr-3 before:text-gh-border">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
               </svg>
               {post.author}
            </div>
          )}
        </div>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6 justify-center md:justify-start">
            {post.tags.map(tag => (
               <span key={tag} className="px-3 py-1 text-xs font-semibold bg-gh-surface border border-gh-border rounded-full text-gh-muted uppercase tracking-wide">
                 {tag}
               </span>
            ))}
          </div>
        )}
        
        {post.originalUrl && (
          <div className="mt-4">
            <Link href={post.originalUrl} className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-400 font-medium transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              원문 보기
            </Link>
          </div>
        )}
      </header>

      <section className="post-detail__body" dangerouslySetInnerHTML={{ __html: post.html }} />

      {post.embeddedPdf ? (
        <>
          <PdfViewer allowDownload={post.allowPdfDownload} file={post.embeddedPdf} title={post.title} />
        </>
      ) : null}

      {secondaryAttachments.length > 0 && (
        <section className="mt-16 pt-8 border-t border-gh-border/60">
          <h2 className="text-2xl font-bold text-gh-text mb-4">첨부 문서</h2>
          <ul className="grid gap-3">
            {secondaryAttachments.map((attachment) => (
              <li key={attachment.url}>
                <Link href={attachment.url} className="flex items-center gap-3 p-4 bg-gh-surface/50 border border-gh-border/50 rounded-xl hover:bg-gh-surface hover:border-gh-border transition-all group">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </div>
                  <span className="font-medium text-gh-text group-hover:text-indigo-400 transition-colors">
                    {attachment.name} <span className="text-gh-muted text-sm ml-1">({attachment.kind.toUpperCase()})</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
