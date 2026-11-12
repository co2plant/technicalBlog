import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPublishedPortfolioPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "포트폴리오",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default async function PortfolioPage() {
  const [portfolio] = await getPublishedPortfolioPosts();
  if (!portfolio) {
    notFound();
  }
  redirect(`/posts/${portfolio.slug}`);
}
