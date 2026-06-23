import { describe, expect, it } from "vitest";
import { isValidShareId, parseInterviewSharePagesFromJson } from "../src/lib/interviews";

describe("interview share loader", () => {
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
});
