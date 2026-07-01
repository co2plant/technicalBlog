import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "도구 | co2plant 기술 블로그",
  description: "개발 과정에서 직접 사용하는 작은 도구 모음입니다.",
};

const TOOLS = [
  {
    href: "/tools/password-generator",
    title: "비밀번호 생성기",
    description: "글자 수와 문자 조건을 정해서 랜덤 비밀번호를 생성합니다.",
    labels: ["Password", "Random", "Security"],
  },
  {
    href: "/tools/tech-stack",
    title: "기술스택 이미지 생성기",
    description: "Skill Icons 아이콘 묶음과 Shields.io 버전 배지를 포트폴리오용 Markdown으로 생성합니다.",
    labels: ["Portfolio", "Skill Icons", "Badges"],
  },
  {
    href: "/tools/golden-ratio",
    title: "황금비율 계산기",
    description: "프론트엔드 레이아웃에 필요한 1.618 비율, 크기 스케일, CSS 값을 계산합니다.",
    labels: ["Layout", "CSS", "Ratio"],
  },
];

export default function ToolsPage() {
  return (
    <div className="relative z-10 space-y-8">
      <div className="border-b border-gh-border/60 pb-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-gh-text" data-testid="tools-page-heading">
          <span className="inline-block h-8 w-1.5 rounded-full bg-gradient-to-b from-cyan-500 to-amber-500" />
          도구
        </h1>
        <p className="ml-4 mt-3 text-lg text-gh-muted">개발 중 반복해서 쓰는 계산기와 보조 도구를 모아둡니다.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} className="group block h-full" data-testid={`tool-card-${tool.href.split("/").pop()}`}>
            <article className="relative flex h-full flex-col overflow-hidden rounded-lg border border-gh-border/70 bg-gh-surface/60 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/5">
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {tool.labels.map((label) => (
                    <span key={label} className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-cyan-400/90">
                      {label}
                    </span>
                  ))}
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-gh-text transition-colors group-hover:text-cyan-500">{tool.title}</h2>
                  <p className="text-sm leading-relaxed text-gh-muted">{tool.description}</p>
                </div>
              </div>
              <div className="mt-6 border-t border-gh-border/50 pt-4 text-sm font-semibold text-gh-accent">
                열기
              </div>
              <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-cyan-500/0 via-amber-500/0 to-emerald-500/0 transition-all duration-300 group-hover:from-cyan-500/40 group-hover:via-amber-500/40 group-hover:to-emerald-500/40" />
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
