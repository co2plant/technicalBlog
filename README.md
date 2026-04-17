# 기술 블로그 프로젝트

이 프로젝트는 리플랫폼 계획에 따라 **Next.js + 파일 기반 콘텐츠 + Vercel** 스택으로 전환하는 기술 블로그입니다.

## 주요 특징 (계획 기준)
- **Next.js App Router + TypeScript** 기반 공개 블로그
- **Git 저장소 기반 콘텐츠 관리** (`content/posts/*.md(x)` + `public/posts/<slug>/*`)
- **Vercel** 중심의 Preview/Production 배포 전략
- Markdown 원문 저장 + 서버 측 sanitize 렌더링 (`.mdx` 확장자도 현재는 Markdown 호환 본문만 지원)
- PDF 미리보기/다운로드와 PPT/PPTX 다운로드 확장을 고려한 문서 첨부 구조
- 태그/검색/SEO(robots, sitemap, RSS) 포함 운영형 구조

## 기술 스택 정리 (계획 기준)

### 언어
- **TypeScript**: Next.js 애플리케이션 및 서버 로직
- **HTML/CSS**: App Router 기반 UI 렌더링
- **Markdown / MDX**: 게시글 원문 저장 형식 (`.mdx`는 JSX/ESM 없이 Markdown 호환 본문만 지원)
- **PDF / PPT / PPTX**: 게시글별 첨부 문서 자산

### 프레임워크 / 라이브러리
- **Next.js (App Router)**: 웹 프레임워크 및 라우팅
- **React**: UI 컴포넌트 렌더링 기반
- **Tailwind CSS v4**: UI 스타일링 기반
- **Vercel**: 호스팅/배포/환경 분리(Preview/Production)
- **Markdown Sanitization Pipeline**: 파일 원문을 안전하게 HTML로 렌더링

### 실행 환경
- **Node.js + npm** 기반 Next.js 애플리케이션
- 기본 명령어(계획): `npm run dev`, `npm run build`, `npm run start`

### 현재 아키텍처 요약
- 공개 앱은 **읽기 전용(public read-only)** 으로 운영
- 콘텐츠 작성/수정은 앱 내부가 아니라 **GitHub PR 또는 GitHub 웹 에디터/github.dev**로 처리
- 새 글 추가는 `content/posts/*.md(x)` 파일 추가 → Git push/merge → **Vercel 자동 배포** 흐름으로 운영
- 이미지/PDF/PPT/PPTX 같은 게시글 자산은 `public/posts/<slug>/` 아래에 두어 경로를 안정적으로 유지

## 콘텐츠 / 자산 규칙
- 글 본문: `content/posts/<slug>.md` 또는 `content/posts/<slug>.mdx`
- 현재 렌더링 파이프라인은 **Markdown 호환 본문만 지원**하며, `.mdx` 파일 안의 JSX/`import`/`export`/표현식 문법은 허용하지 않습니다.
- 게시글 이미지 및 문서 자산: `public/posts/<slug>/*`
- 예시:
  - `content/posts/vercel-deploy-guide.mdx`
  - `public/posts/vercel-deploy-guide/cover.png`
  - `public/posts/vercel-deploy-guide/architecture.pdf`
  - `public/posts/vercel-deploy-guide/slides.pptx`
- **PDF**: 브라우저 호환 범위에서 inline preview 또는 다운로드 링크로 제공
- **PPT/PPTX**: 기본은 다운로드 링크로 제공하고, 이후 외부 viewer/embed 지원이 필요할 때 확장
- 핵심 원칙: Markdown/MDX가 source of truth이고, PDF/PPT/PPTX는 게시글에 연결되는 첨부 자산으로 취급

## PDF 임베딩 포스트
- 일반 글은 Markdown/MDX 본문을 중심으로 렌더링합니다.
- PDF를 글 안에 자연스럽게 붙이고 싶다면 frontmatter에 아래 필드를 추가합니다.

```yaml
embeddedPdf: "/posts/<slug>/portfolio.pdf"
```

- 이 경우 상세 페이지에서는 Markdown 본문을 먼저 보여주고, 그 아래에 PDF viewer를 렌더링합니다.

## 참고
- 작업용 계획 초안은 `.sisyphus/plans/technical-blog-vercel-file-content.ko.md`에 정리되어 있습니다.

## 폴더 구조 예시 (계획 기준)
```
/project-root
  /content
    /posts       # Markdown/MDX 게시글 원문
  /src
    /app         # Next.js App Router 라우트
    /lib         # 공용 도메인/콘텐츠 접근 모듈
  /scripts       # build/운영 보조 스크립트
  /tests         # unit/integration/e2e 테스트
  /public
    /posts       # slug별 이미지/PDF/PPT/PPTX 정적 자산
```

## 라이선스
MIT
