import { getPublishedPosts } from "@/lib/content";
import { buildRssFeed } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-metadata";

export const revalidate = 300;

export async function GET() {
  const posts = (await getPublishedPosts()).filter((post) => post.category !== "portfolio");

  return new Response(buildRssFeed(posts, getSiteUrl()), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
