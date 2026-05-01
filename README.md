# 기술 블로그 프로젝트

Next.js App Router와 파일 기반 콘텐츠로 운영하는 기술 블로그입니다.

## 핵심 요약
- Next.js App Router + TypeScript 기반 공개 블로그
- 콘텐츠 저장 위치: `content/posts/*.md(x)`
- 게시글 자산 위치: `public/posts/<slug>/*`
- `.mdx` 확장자도 현재는 Markdown 호환 본문만 지원
- PDF는 미리보기/다운로드, PPT/PPTX는 다운로드 중심으로 지원

## 실행 명령어
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`

## 구조
```text
content/posts/          Markdown/MDX 게시글 원문
public/posts/<slug>/    이미지/PDF/PPT/PPTX 같은 정적 자산
src/app/                App Router 라우트
src/lib/                콘텐츠 로더와 공용 로직
tests/                  unit / e2e 테스트
```

## 콘텐츠 규칙
- 글 파일명 stem과 frontmatter `slug`는 같아야 합니다.
- 필수 frontmatter: `title`, `slug`, `description`, `excerpt`, `publishedAt`, `author`, `tags`, `draft`
- 날짜는 실제 `YYYY-MM-DD` 형식이어야 합니다.
- `.mdx`에서도 JSX, `import`, `export`, 인라인 표현식은 허용하지 않습니다.
- Markdown/MDX가 source of truth이고, 첨부 자산은 게시글에 연결되는 파일로 취급합니다.

## PDF 임베딩
frontmatter에 아래 값을 넣으면 본문 아래에 PDF viewer가 렌더링됩니다.

```yaml
embeddedPdf: "/posts/<slug>/portfolio.pdf"
```

## 배포/운영
- 앱은 읽기 전용으로 운영합니다.
- 콘텐츠 작성/수정은 GitHub PR 또는 웹 에디터 흐름을 전제로 합니다.
- 새 글 추가 후 merge되면 배포 파이프라인이 반영하는 구조입니다.

## 라이선스
MIT
