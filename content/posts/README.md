# 콘텐츠 폴더 안내

이 디렉터리는 블로그 글 원문을 저장하는 위치입니다.

상세 설계 기준은 `docs/content-architecture.md`를 따릅니다.

## 운영 원칙
- 새 글 본문은 `content/posts/<slug>.md` 또는 `content/posts/<slug>.mdx` 파일로 추가합니다.
- 게시글 관련 이미지/문서 자산은 `public/posts/<slug>/` 아래에 둡니다.
- 글 추가/수정은 GitHub PR, GitHub 웹 에디터, 또는 `github.dev`를 사용합니다.
- main 브랜치에 머지되면 Vercel이 자동 배포합니다.

## 권장 구조
```text
content/posts/vercel-deploy-guide.mdx
public/posts/vercel-deploy-guide/cover.png
public/posts/vercel-deploy-guide/architecture.pdf
public/posts/vercel-deploy-guide/slides.pptx
```

## 문서 확장 규칙
- **Markdown / MDX**: 게시글의 source of truth
- **이미지**: 본문에서 직접 참조하는 정적 자산
- **PDF**: 브라우저 호환 범위에서 inline preview 또는 다운로드 링크 제공
- **PPT / PPTX**: 기본은 다운로드 링크 제공, 필요하면 별도 PDF 버전을 함께 제공
- 핵심 원칙: Markdown/MDX가 본문이고, PDF/PPT/PPTX는 게시글에 연결되는 첨부 문서 자산입니다.

## PDF 중심 포트폴리오 글
- 일반 글은 `kind`를 생략하거나 `kind: "article"`로 둡니다.
- PDF가 메인 콘텐츠인 포트폴리오 글은 아래 필드를 추가합니다.

```yaml
kind: "pdf"
primaryPdf: "/posts/<slug>/portfolio.pdf"
```

- 이 경우 Markdown/MDX 본문은 PDF를 설명하는 도입부 역할을 하고, 개별 글 페이지에서는 PDF viewer가 메인 콘텐츠로 렌더링됩니다.


## 다음 구현 단계
- `src/app/posts/page.tsx`에서 이 디렉터리의 파일 목록을 읽어 게시글 목록을 렌더링합니다.
- `src/app/posts/[slug]/page.tsx`에서 slug 기준으로 개별 글 페이지를 생성합니다.
- 렌더링 전 Markdown/MDX 본문은 sanitize 처리합니다.
- 개별 글 페이지에서 PDF는 미리보기/다운로드, PPT/PPTX는 다운로드 링크를 노출할 수 있게 메타데이터 구조를 둡니다.
