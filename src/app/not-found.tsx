import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center" data-testid="not-found-page">
      <h1 className="text-5xl font-bold text-gh-text mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gh-text mb-2">페이지를 찾을 수 없습니다.</h2>
      <p className="text-gh-muted mb-8 text-lg">요청하신 경로가 존재하지 않거나 이동되었습니다.</p>
      <Link href="/" className="px-6 py-2.5 bg-gh-accent text-white font-medium rounded-lg hover:opacity-90 transition-all shadow-md">
        홈으로 돌아가기
      </Link>
    </div>
  );
}
