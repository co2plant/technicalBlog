export default function HomePage() {
  return (
    <section>
      <h1>기술 블로그 파일 기반 리플랫폼</h1>
      <p>
        현재는 Next.js App Router 기반의 공개 블로그 셸을 준비했고, 이후 글은
        <code> content/posts/*.md(x) </code>
        파일로 관리합니다. 이미지와 PDF/PPT/PPTX 같은 첨부 자산은
        <code> public/posts/&lt;slug&gt;/ </code>
        아래에 두는 구조를 기준으로 운영할 예정입니다.
      </p>
    </section>
  );
}
