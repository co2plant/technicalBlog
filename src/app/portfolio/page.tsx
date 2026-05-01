import { getPublishedPortfolioPosts } from "@/lib/content";
import { PostCollection } from "@/components/post-collection";

export default async function PortfolioPage() {
  const portfolioPosts = await getPublishedPortfolioPosts();

  return (
    <PostCollection
      title="포트폴리오"
      description="프로젝트 결과물, 발표 자료, 문서형 산출물을 한곳에서 모아봅니다."
      emptyMessage="아직 추가된 포트폴리오가 없습니다."
      posts={portfolioPosts}
      accent="emerald"
      headingTestId="portfolio-page-heading"
      primaryBadgeLabel="Portfolio"
    />
  );
}
