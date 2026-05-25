import type { Metadata } from "next";
import { GoldenRatioCalculator } from "@/components/golden-ratio-calculator.client";

export const metadata: Metadata = {
  title: "황금비율 계산기 | co2plant 기술 블로그",
  description: "프론트엔드 레이아웃을 위한 황금비율 계산기입니다.",
};

export default function GoldenRatioPage() {
  return (
    <div className="relative z-10 space-y-8">
      <div className="border-b border-gh-border/60 pb-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-gh-text" data-testid="golden-ratio-page-heading">
          <span className="inline-block h-8 w-1.5 rounded-full bg-gradient-to-b from-amber-500 to-cyan-500" />
          황금비율 계산기
        </h1>
        <p className="ml-4 mt-3 text-lg text-gh-muted">1.618 비율로 화면 크기, 카드, 썸네일, 여백 스케일을 계산합니다.</p>
      </div>

      <GoldenRatioCalculator />
    </div>
  );
}
