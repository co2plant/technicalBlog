import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { readPostFile } from "./blog-post-file-utils.mjs";
import { getLocalEnv } from "./local-env.mjs";

const args = process.argv.slice(2);

if (args.length > 1 || (args.length === 1 && args[0] !== "--e2e")) {
  throw new Error("Usage: node scripts/seed-local-database.mjs [--e2e]");
}

const mode = args[0] === "--e2e" ? "e2e" : "development";
const env = getLocalEnv(process.env, mode);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL_TEST }),
});

const fixtures = [
  {
    ...readPostFile(fileURLToPath(new URL("../content/posts/git/git-commit-message-convention.mdx", import.meta.url))),
    legacySlug: "local-git-fixture",
    publishedNumber: 1,
    status: "published",
  },
  {
    ...readPostFile(fileURLToPath(new URL("../content/posts/portfolio/my-portfolio-pdf.mdx", import.meta.url))),
    legacySlug: "local-portfolio-fixture",
    publishedNumber: 11,
    status: "published",
  },
  {
    legacySlug: "local-editor-fixture",
    publishedNumber: null,
    status: "draft",
    title: "[Local] 에디터 로컬 초안",
    description: "로컬에서 글 작성 화면을 확인하는 초안입니다.",
    excerpt: "로컬 개발 전용 글입니다.",
    body: "## 로컬 작성 확인\n\n제목, 본문, 태그를 수정하고 저장 동작을 확인할 수 있습니다.",
    extension: "md",
    author: "local",
    category: "backend",
    tags: ["local", "editor"],
    allowPdfDownload: true,
  },
];

if (mode === "development") {
  const lorem = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    "Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.",
  ];

  fixtures.push(...[
    {
      key: 12,
      title: "[Local] Lorem ipsum 짧은 글",
      body: lorem.slice(0, 2).join("\n\n"),
    },
    {
      key: 13,
      title: "[Local] Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt",
      body: [
        ...lorem,
        "## Lorem ipsum dolor sit amet",
        ...lorem,
        "> Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
        "## Consectetur adipiscing elit",
        ...lorem,
        "- Lorem ipsum dolor sit amet\n- Consectetur adipiscing elit\n- Sed do eiusmod tempor incididunt",
        ...lorem,
      ].join("\n\n"),
    },
  ].map(({ key, ...post }) => ({
    ...post,
    // Keeps the first seed's names so databases seeded earlier preserve these posts instead of duplicating them.
    legacySlug: `local-lorem-fixture-${key}`,
    // A developer may already have published a post at /posts/12, so these take the next free numbers.
    publishedNumber: "next",
    status: "published",
    description: lorem[0],
    excerpt: lorem[0],
    extension: "md",
    author: "local",
    category: "backend",
    tags: ["local", "lorem-ipsum"],
    publishedAt: "2026-11-12",
    allowPdfDownload: true,
  })));
}

try {
  const result = await prisma.$transaction(async (tx) => {
    // Never replace another post at a fixture's fixed published number, even in E2E mode.
    for (const fixture of fixtures.filter((post) => typeof post.publishedNumber === "number")) {
      const existing = await tx.blogPost.findUnique({
        where: { publishedNumber: fixture.publishedNumber },
      });

      if (existing && existing.legacySlug !== fixture.legacySlug) {
        throw new Error(`Local fixture conflict at /posts/${fixture.publishedNumber}; existing content was not changed.`);
      }
    }

    const counts = { created: 0, preserved: 0, reset: 0 };

    for (const fixture of fixtures) {
      const existing = await tx.blogPost.findUnique({
        where: { legacySlug: fixture.legacySlug },
      });

      // Deleted and edited local posts, including their tags, belong to the developer.
      if (mode === "development" && existing) {
        counts.preserved += 1;
        continue;
      }

      const category = await tx.blogCategory.upsert({
        where: { slug: fixture.category },
        create: { slug: fixture.category, name: fixture.category === "backend" ? "Backend" : fixture.category },
        update: {},
      });
      const latest = fixture.status === "draft"
        ? await tx.blogPost.aggregate({ _max: { modifiedAt: true } })
        : null;
      const modifiedAt = latest
        ? new Date(Math.max(Date.now(), (latest._max.modifiedAt?.getTime() ?? 0) + 1))
        : dateOrNull(fixture.updatedAt ?? fixture.publishedAt);
      const data = {
        publishedNumber: fixture.publishedNumber === "next"
          ? ((await tx.blogPost.aggregate({ _max: { publishedNumber: true } }))._max.publishedNumber ?? 0) + 1
          : fixture.publishedNumber,
        title: fixture.title,
        description: fixture.description,
        excerpt: fixture.excerpt,
        bodyMarkdown: fixture.body,
        extension: fixture.extension,
        status: fixture.status,
        author: fixture.author,
        categoryId: category.id,
        publishedAt: dateOrNull(fixture.publishedAt),
        updatedAt: dateOrNull(fixture.updatedAt ?? fixture.publishedAt),
        modifiedAt,
        originalUrl: fixture.originalUrl ?? null,
        coverImageUrl: fixture.coverImage ?? null,
        embeddedPdfUrl: fixture.embeddedPdf ?? null,
        allowPdfDownload: fixture.allowPdfDownload,
        deletedAt: null,
      };
      const post = mode === "e2e"
        ? await tx.blogPost.upsert({
          where: { legacySlug: fixture.legacySlug },
          create: { legacySlug: fixture.legacySlug, ...data },
          update: data,
        })
        : await tx.blogPost.create({ data: { legacySlug: fixture.legacySlug, ...data } });

      await replaceFixtureTags(tx, post.id, fixture.tags);
      counts[existing ? "reset" : "created"] += 1;
    }

    return counts;
  });

  console.log(`Local seed complete: ${result.created} created, ${result.preserved} preserved, ${result.reset} reset.`);
} finally {
  await prisma.$disconnect();
}

function dateOrNull(value) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

async function replaceFixtureTags(tx, postId, names) {
  await tx.blogPostTag.deleteMany({ where: { postId } });

  for (const name of names) {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    if (!slug) {
      throw new Error("Local fixture tags require an ASCII slug.");
    }

    const tag = await tx.blogTag.upsert({
      where: { slug },
      create: { name, slug },
      update: {},
    });

    await tx.blogPostTag.create({ data: { postId, tagId: tag.id } });
  }
}
