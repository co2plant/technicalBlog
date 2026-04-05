import { createDeterministicSeedHelper } from "./deterministic-seed";

export type PostStatus = "published" | "draft";

export type PostFixture = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  contentMd: string;
  status: PostStatus;
};

const seed = createDeterministicSeedHelper();

function createBasePost(status: PostStatus): PostFixture {
  const id = seed.nextId();

  return {
    id,
    slug: `post-${id}`,
    title: `테스트 게시글 ${id}`,
    excerpt: `테스트 요약 ${id}`,
    contentMd: `# 테스트 게시글 ${id}\n\n본문입니다.`,
    status,
  };
}

export function createPublishedPostFixture(): PostFixture {
  return createBasePost("published");
}

export function createDraftPostFixture(): PostFixture {
  return createBasePost("draft");
}

export function resetPostFixtureSeed() {
  seed.reset();
}
