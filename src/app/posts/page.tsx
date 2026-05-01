import { getPublishedPosts } from "@/lib/content";
import { PostCollection } from "@/components/post-collection";

export default async function PostsPage() {
  const posts = await getPublishedPosts();

  return (
    <PostCollection
      title="게시글 목록"
      description="기술적인 공유와 개인적인 생각들을 기록합니다."
      emptyMessage="아직 추가된 게시글이 없습니다."
      posts={posts}
      accent="indigo"
      headingTestId="posts-page-heading"
    />
  );
}
