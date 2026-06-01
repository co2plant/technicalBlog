import type { Metadata } from "next";
import { TechStackGenerator } from "@/components/tech-stack-generator.client";

export const metadata: Metadata = {
  title: "기술스택 이미지 생성기 | co2plant 기술 블로그",
  description: "포트폴리오와 README에 붙일 기술스택 아이콘과 버전 배지를 생성합니다.",
};

export default function TechStackPage() {
  return (
    <div className="relative z-10 space-y-8">
      <div className="border-b border-gh-border/60 pb-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-gh-text" data-testid="tech-stack-page-heading">
          <span className="inline-block h-8 w-1.5 rounded-full bg-gradient-to-b from-emerald-500 to-cyan-500" />
          기술스택 이미지 생성기
        </h1>
        <p className="ml-4 mt-3 text-lg text-gh-muted">Skill Icons 아이콘 묶음과 Shields.io 버전 배지를 함께 생성합니다.</p>
      </div>

      <TechStackGenerator />
    </div>
  );
}
