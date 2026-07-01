import type { Metadata } from "next";
import { PasswordGenerator } from "@/components/password-generator.client";

export const metadata: Metadata = {
  title: "비밀번호 생성기 | co2plant 기술 블로그",
  description: "길이와 문자 조건을 정해 랜덤 비밀번호를 생성하는 도구입니다.",
};

export default function PasswordGeneratorPage() {
  return (
    <div className="relative z-10 space-y-8">
      <div className="border-b border-gh-border/60 pb-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-gh-text" data-testid="password-generator-page-heading">
          <span className="inline-block h-8 w-1.5 rounded-full bg-gradient-to-b from-cyan-500 to-emerald-500" />
          비밀번호 생성기
        </h1>
        <p className="ml-4 mt-3 text-lg text-gh-muted">글자 수와 문자 조건을 정해서 랜덤 비밀번호를 만듭니다.</p>
      </div>

      <PasswordGenerator />
    </div>
  );
}
