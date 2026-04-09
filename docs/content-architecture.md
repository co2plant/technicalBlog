# 파일 기반 콘텐츠 아키텍처

## 목표
- 데이터베이스 없이 Git 저장소만으로 글과 첨부 자산을 운영한다.
- GitHub PR/웹 에디터 기반으로 안전하게 콘텐츠를 추가한다.
- `main` merge 후 Vercel이 자동 배포한다.

## Source of Truth
- 게시글 본문: `content/posts/<slug>.md` 또는 `content/posts/<slug>.mdx`
- 게시글 자산: `public/posts/<slug>/*`

## 권장 구조
```text
content/posts/vercel-deploy-guide.mdx
public/posts/vercel-deploy-guide/cover.png
public/posts/vercel-deploy-guide/architecture.pdf
public/posts/vercel-deploy-guide/slides.pptx
```

## 포맷 역할
- **Markdown / MDX**: 본문 source of truth
- **이미지**: 게시글 본문에서 직접 참조하는 정적 자산
- **PDF**: inline preview 또는 다운로드 링크 제공 대상
- **PPT / PPTX**: 기본적으로 다운로드 링크 제공 대상

## 포스트 타입
- 기본값은 `kind: "article"` 입니다.
- 포트폴리오형 문서를 메인 콘텐츠로 보여주고 싶다면 `kind: "pdf"`와 `primaryPdf`를 사용합니다.
- 예시:

```yaml
kind: "pdf"
primaryPdf: "/posts/my-portfolio/portfolio.pdf"
```

## 라우팅 모델
- 목록: `src/app/posts/page.tsx`
- 상세: `src/app/posts/[slug]/page.tsx`
- 정적 생성: `generateStaticParams()` 기반 slug 라우트

## 운영 원칙
- 앱 내부 관리자 UI는 v1에서 만들지 않는다.
- 글/자산 추가는 GitHub PR, GitHub 웹 에디터, `github.dev` 중 하나로 처리한다.
- 콘텐츠 검증은 CI에서 수행한다.

## 자동화 우선순위
1. frontmatter/content contract 고정
2. `src/lib/content` 로더 구현
3. `validate:content` 스크립트 추가
4. 이미지/PDF/PPT/PPTX 경로 검증 추가
5. GitHub Actions + Vercel 자동 배포 연결

## 안전 규칙
- slug는 파일명과 일치해야 한다.
- 게시글 자산은 반드시 `public/posts/<slug>/` 아래에 둔다.
- Markdown/MDX 렌더링은 sanitize 후 출력한다.
- PDF는 preview-safe, PPT/PPTX는 download-first 전략을 기본값으로 둔다.
- `kind: "pdf"` 포스트는 PDF가 메인 콘텐츠이고, Markdown 본문은 소개/설명 영역으로 사용한다.
