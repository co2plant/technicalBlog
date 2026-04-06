export default function GitCollaborationPage() {
  return (
    <section>
      <h1>Git 협업 가이드</h1>
      <p>
        이 페이지는 우리 프로젝트에서 사용하는 Git 협업 방식과 PR 흐름을 설명합니다.
        작업은 작은 단위로 나누고, 브랜치에서 변경을 검증한 뒤 PR을 통해 main에
        반영하는 것을 기본 원칙으로 합니다.
      </p>

      <h2>기본 원칙</h2>
      <ul>
        <li>작업은 가능한 한 작은 단위로 나누어 커밋합니다.</li>
        <li>기능 구현과 무관한 변경은 같은 PR에 섞지 않습니다.</li>
        <li>merge 전에는 최소한 lint, typecheck, build 검증을 통과합니다.</li>
      </ul>

      <h2>권장 흐름</h2>
      <ol>
        <li>새 브랜치를 만들고 작업 범위를 분리합니다.</li>
        <li>작은 단위로 구현하고 필요한 검증을 중간중간 실행합니다.</li>
        <li>PR을 열고 변경 의도, 검증 결과, 범위 제외 항목을 정리합니다.</li>
        <li>검토가 끝나면 main에 merge하고 Vercel 자동 배포를 확인합니다.</li>
      </ol>

      <p>
        구체적인 규칙은 <code>.github/CONTRIBUTING.md</code>와 PR 템플릿을 기준으로
        따릅니다.
      </p>
    </section>
  );
}
