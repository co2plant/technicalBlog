import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getInterviewSharePage, type InterviewQuestion, type InterviewRecord } from "@/lib/interviews";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PRIVATE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};

type InterviewPageProps = {
  params: Promise<{
    shareId: string;
  }>;
};

export async function generateMetadata({ params }: InterviewPageProps): Promise<Metadata> {
  const { shareId } = await params;
  const page = await getInterviewSharePage(shareId);

  return {
    title: page?.title ?? "면접 질문 정리",
    description: page?.description ?? "공유 링크로 접근하는 면접 질문 정리 페이지입니다.",
    robots: PRIVATE_ROBOTS,
  };
}

export default async function InterviewSharePage({ params }: InterviewPageProps) {
  const { shareId } = await params;
  const page = await getInterviewSharePage(shareId);

  if (!page) {
    notFound();
  }

  const questionCount = page.interviews.reduce((total, interview) => total + interview.questions.length, 0);

  return (
    <article className="mx-auto w-full max-w-4xl py-8">
      <header className="border-b border-gh-border/60 pb-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
          Private Share
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gh-text md:text-5xl">{page.title}</h1>
        {page.description ? (
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-gh-muted md:text-lg">{page.description}</p>
        ) : null}

        <dl className="mt-6 grid gap-3 text-sm text-gh-muted sm:grid-cols-3">
          <SummaryItem label="면접" value={`${page.interviews.length}건`} />
          <SummaryItem label="질문" value={`${questionCount}개`} />
          <SummaryItem label="업데이트" value={page.updatedAt ?? "미기재"} />
        </dl>

        {page.audienceLabel ? (
          <p className="mt-5 text-sm font-medium text-gh-muted">
            공유 대상: <span className="text-gh-text">{page.audienceLabel}</span>
          </p>
        ) : null}
      </header>

      <div className="mt-10 space-y-8">
        {page.interviews.map((interview) => (
          <InterviewSection key={`${interview.company}-${interview.interviewDate ?? "undated"}-${interview.stage ?? "stage"}`} interview={interview} />
        ))}
      </div>
    </article>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gh-border/60 bg-gh-surface/50 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gh-muted">{label}</dt>
      <dd className="mt-1 text-lg font-bold text-gh-text">{value}</dd>
    </div>
  );
}

function InterviewSection({ interview }: { interview: InterviewRecord }) {
  const metaItems = [interview.position, interview.stage].filter(Boolean);

  return (
    <section className="rounded-xl border border-gh-border/70 bg-gh-surface/50 p-5 backdrop-blur-sm md:p-6">
      <header className="flex flex-col gap-3 border-b border-gh-border/50 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-400">{interview.interviewDate ?? "일정 미정"}</p>
          <h2 className="mt-1 text-2xl font-bold text-gh-text">{interview.company}</h2>
          {metaItems.length > 0 ? <p className="mt-2 text-sm text-gh-muted">{metaItems.join(" · ")}</p> : null}
        </div>
        <span className="inline-flex w-fit rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
          질문 {interview.questions.length}개
        </span>
      </header>

      <ol className="mt-6 space-y-4">
        {interview.questions.map((question, index) => (
          <QuestionItem key={`${index}-${question.question}`} index={index + 1} question={question} />
        ))}
      </ol>

      {interview.notes.length > 0 ? (
        <section className="mt-6 rounded-lg border border-gh-border/50 bg-gh-bg/40 p-4">
          <h3 className="text-sm font-semibold text-gh-text">메모</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gh-muted">
            {interview.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

function QuestionItem({ index, question }: { index: number; question: InterviewQuestion }) {
  return (
    <li className="rounded-lg border border-gh-border/50 bg-gh-bg/35 p-4">
      <div className="flex gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-bold text-indigo-300">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold leading-relaxed text-gh-text">{question.question}</p>

          {(question.topic || question.intent) ? (
            <dl className="mt-3 grid gap-2 text-sm text-gh-muted md:grid-cols-2">
              {question.topic ? (
                <div>
                  <dt className="font-semibold text-gh-text">주제</dt>
                  <dd className="mt-1">{question.topic}</dd>
                </div>
              ) : null}
              {question.intent ? (
                <div>
                  <dt className="font-semibold text-gh-text">의도</dt>
                  <dd className="mt-1">{question.intent}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {question.followUps.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-gh-text">꼬리 질문</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-gh-muted">
                {question.followUps.map((followUp) => (
                  <li key={followUp}>{followUp}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
