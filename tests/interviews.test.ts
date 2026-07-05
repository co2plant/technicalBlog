import { afterEach, describe, expect, it } from "vitest";
import {
  type DatabaseInterviewSharePage,
  getInterviewSharePage,
  hasInterviewDatabaseConfig,
  isValidShareId,
  mapInterviewSharePageFromDatabase,
  parseInterviewSharePagesFromJson,
} from "../src/lib/interviews";

describe("interview share loader", () => {
  const originalDatabaseUrl = process.env.POSTGRES_PRISMA_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.POSTGRES_PRISMA_URL;
    } else {
      process.env.POSTGRES_PRISMA_URL = originalDatabaseUrl;
    }
  });

  it("parses private interview share data", () => {
    const pages = parseInterviewSharePagesFromJson(
      JSON.stringify([
        {
          id: "iv_20260618_private_token",
          title: "면접 질문 정리",
          updatedAt: "2026-06-18",
          interviews: [
            {
              company: "예시 회사",
              position: "백엔드 개발자",
              stage: "1차 면접",
              interviewDate: "2026-06-18",
              questions: [
                "AOP가 무엇인지 설명해주세요.",
                {
                  question: "트랜잭션이 필요한 이유를 설명해주세요.",
                  topic: "Database",
                  followUps: ["@Transactional은 어떻게 동작하나요?"],
                },
              ],
            },
          ],
        },
      ]),
    );

    expect(pages).toHaveLength(1);
    expect(pages[0].id).toBe("iv_20260618_private_token");
    expect(pages[0].interviews[0].questions[0]).toEqual({
      question: "AOP가 무엇인지 설명해주세요.",
      followUps: [],
    });
    expect(pages[0].interviews[0].questions[1].followUps).toEqual(["@Transactional은 어떻게 동작하나요?"]);
  });

  it("rejects short or unsafe share ids", () => {
    expect(isValidShareId("short")).toBe(false);
    expect(isValidShareId("iv_20260618_private_token")).toBe(true);
    expect(isValidShareId("iv_20260618/private/token")).toBe(false);
  });

  it("rejects invalid interview dates", () => {
    expect(() =>
      parseInterviewSharePagesFromJson(
        JSON.stringify({
          id: "iv_20260618_private_token",
          interviews: [
            {
              company: "예시 회사",
              interviewDate: "2026-99-18",
              questions: ["질문"],
            },
          ],
        }),
      ),
    ).toThrowError("interviewDate must be a real calendar date.");
  });

  it("allows undated interview records for expected question prep", () => {
    const pages = parseInterviewSharePagesFromJson(
      JSON.stringify({
        id: "iv_expected_questions_20260705",
        title: "예상 면접 질문",
        interviews: [
          {
            company: "예시 회사",
            stage: "면접 예상 질문",
            interviewDate: "",
            questions: ["예상 질문"],
          },
        ],
      }),
    );

    expect(pages[0].interviews[0].interviewDate).toBeUndefined();
  });

  it("maps Supabase Postgres interview rows to the share page shape", () => {
    const now = new Date("2026-07-04T00:00:00.000Z");
    const databasePage = {
      id: "b861b0fa-e3e8-4480-b7eb-acd053e8840b",
      shareId: "iv_database_token_20260704",
      title: "DB 면접 질문",
      description: null,
      audienceLabel: "공유 대상",
      updatedAt: new Date("2026-07-04T00:00:00.000Z"),
      isActive: true,
      createdAt: now,
      modifiedAt: now,
      interviews: [
        {
          id: "ef42d4b8-3b0d-4586-aed0-153f0120ce84",
          sharePageId: "b861b0fa-e3e8-4480-b7eb-acd053e8840b",
          company: "예시 회사",
          position: null,
          stage: "기술 면접",
          interviewDate: new Date("2026-07-03T00:00:00.000Z"),
          sortOrder: 0,
          notes: ["DB에서 읽은 메모"],
          createdAt: now,
          modifiedAt: now,
          questions: [
            {
              id: "a091c19b-a68b-4c85-a4e9-83214f7a4ccf",
              interviewRecordId: "ef42d4b8-3b0d-4586-aed0-153f0120ce84",
              question: "두 번째 질문",
              topic: null,
              intent: null,
              followUps: [],
              sortOrder: 2,
              createdAt: now,
              modifiedAt: now,
            },
            {
              id: "d24f6916-fde0-4a07-b86f-83de65734162",
              interviewRecordId: "ef42d4b8-3b0d-4586-aed0-153f0120ce84",
              question: "첫 번째 질문",
              topic: "Database",
              intent: "기본기 확인",
              followUps: ["꼬리 질문"],
              sortOrder: 1,
              createdAt: now,
              modifiedAt: now,
            },
          ],
        },
      ],
    } satisfies DatabaseInterviewSharePage;

    const page = mapInterviewSharePageFromDatabase(databasePage);

    expect(page).toEqual({
      id: "iv_database_token_20260704",
      title: "DB 면접 질문",
      description: undefined,
      audienceLabel: "공유 대상",
      updatedAt: "2026-07-04",
      interviews: [
        {
          company: "예시 회사",
          position: undefined,
          stage: "기술 면접",
          interviewDate: "2026-07-03",
          notes: ["DB에서 읽은 메모"],
          questions: [
            {
              question: "첫 번째 질문",
              topic: "Database",
              intent: "기본기 확인",
              followUps: ["꼬리 질문"],
            },
            {
              question: "두 번째 질문",
              topic: undefined,
              intent: undefined,
              followUps: [],
            },
          ],
        },
      ],
    });
  });

  it("maps undated Supabase Postgres interview rows", () => {
    const now = new Date("2026-07-04T00:00:00.000Z");
    const databasePage = {
      id: "b861b0fa-e3e8-4480-b7eb-acd053e8840b",
      shareId: "iv_undated_token_20260705",
      title: "예상 면접 질문",
      description: null,
      audienceLabel: null,
      updatedAt: null,
      isActive: true,
      createdAt: now,
      modifiedAt: now,
      interviews: [
        {
          id: "ef42d4b8-3b0d-4586-aed0-153f0120ce84",
          sharePageId: "b861b0fa-e3e8-4480-b7eb-acd053e8840b",
          company: "예시 회사",
          position: "Backend",
          stage: "면접 예상 질문",
          interviewDate: null,
          sortOrder: 0,
          notes: [],
          createdAt: now,
          modifiedAt: now,
          questions: [
            {
              id: "d24f6916-fde0-4a07-b86f-83de65734162",
              interviewRecordId: "ef42d4b8-3b0d-4586-aed0-153f0120ce84",
              question: "예상 질문",
              topic: null,
              intent: null,
              followUps: [],
              sortOrder: 0,
              createdAt: now,
              modifiedAt: now,
            },
          ],
        },
      ],
    } satisfies DatabaseInterviewSharePage;

    const page = mapInterviewSharePageFromDatabase(databasePage);

    expect(page.interviews[0].interviewDate).toBeUndefined();
  });

  it("enables database reads only when the Prisma Postgres URL exists", () => {
    delete process.env.POSTGRES_PRISMA_URL;
    expect(hasInterviewDatabaseConfig()).toBe(false);

    process.env.POSTGRES_PRISMA_URL = "postgresql://user:password@example.com:6543/postgres";
    expect(hasInterviewDatabaseConfig()).toBe(true);
  });

  it("loads lowercase Vercel-compatible environment variables", async () => {
    const previousLowercase = process.env.interview_share_pages;
    const previousDashed = process.env["interview-share-pages"];
    const previousUppercase = process.env.INTERVIEW_SHARE_PAGES;
    const previousDatabaseUrl = process.env.POSTGRES_PRISMA_URL;

    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.INTERVIEW_SHARE_PAGES;
    delete process.env["interview-share-pages"];
    process.env.interview_share_pages = JSON.stringify({
      id: "iv_lowercase_token_20260701",
      title: "소문자 환경변수",
      interviews: [
        {
          company: "예시 회사",
          interviewDate: "2026-07-01",
          questions: ["질문"],
        },
      ],
    });

    try {
      const page = await getInterviewSharePage("iv_lowercase_token_20260701");

      expect(page?.title).toBe("소문자 환경변수");
    } finally {
      if (previousLowercase === undefined) {
        delete process.env.interview_share_pages;
      } else {
        process.env.interview_share_pages = previousLowercase;
      }

      if (previousUppercase === undefined) {
        delete process.env.INTERVIEW_SHARE_PAGES;
      } else {
        process.env.INTERVIEW_SHARE_PAGES = previousUppercase;
      }

      if (previousDashed === undefined) {
        delete process.env["interview-share-pages"];
      } else {
        process.env["interview-share-pages"] = previousDashed;
      }

      if (previousDatabaseUrl === undefined) {
        delete process.env.POSTGRES_PRISMA_URL;
      } else {
        process.env.POSTGRES_PRISMA_URL = previousDatabaseUrl;
      }
    }
  });

  it("loads dashed Vercel-compatible environment variables", async () => {
    const previousLowercase = process.env.interview_share_pages;
    const previousDashed = process.env["interview-share-pages"];
    const previousUppercase = process.env.INTERVIEW_SHARE_PAGES;
    const previousDatabaseUrl = process.env.POSTGRES_PRISMA_URL;

    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.interview_share_pages;
    delete process.env.INTERVIEW_SHARE_PAGES;
    process.env["interview-share-pages"] = JSON.stringify({
      id: "iv_dashed_token_20260701",
      title: "하이픈 환경변수",
      interviews: [
        {
          company: "예시 회사",
          interviewDate: "2026-07-01",
          questions: ["질문"],
        },
      ],
    });

    try {
      const page = await getInterviewSharePage("iv_dashed_token_20260701");

      expect(page?.title).toBe("하이픈 환경변수");
    } finally {
      if (previousLowercase === undefined) {
        delete process.env.interview_share_pages;
      } else {
        process.env.interview_share_pages = previousLowercase;
      }

      if (previousUppercase === undefined) {
        delete process.env.INTERVIEW_SHARE_PAGES;
      } else {
        process.env.INTERVIEW_SHARE_PAGES = previousUppercase;
      }

      if (previousDashed === undefined) {
        delete process.env["interview-share-pages"];
      } else {
        process.env["interview-share-pages"] = previousDashed;
      }

      if (previousDatabaseUrl === undefined) {
        delete process.env.POSTGRES_PRISMA_URL;
      } else {
        process.env.POSTGRES_PRISMA_URL = previousDatabaseUrl;
      }
    }
  });
});
