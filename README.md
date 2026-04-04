# 기술 블로그 프로젝트

이 프로젝트는 리플랫폼 계획에 따라 **Next.js + Supabase + Vercel** 스택으로 전환하는 기술 블로그입니다.

## 주요 특징 (계획 기준)
- **Next.js App Router + TypeScript** 기반 공개 블로그
- **Supabase Postgres/Storage** 기반 데이터 및 미디어 관리
- **Vercel** 중심의 Preview/Production 배포 전략
- Markdown 원문 저장 + 서버 측 sanitize 렌더링
- 태그/검색/SEO(robots, sitemap, RSS) 포함 운영형 구조

## 기술 스택 정리 (계획 기준)

### 언어
- **TypeScript**: Next.js 애플리케이션 및 서버 로직
- **SQL (Postgres)**: Supabase DB 스키마/쿼리
- **HTML/CSS**: App Router 기반 UI 렌더링
- **Markdown**: 게시글 원문 저장 및 렌더링 파이프라인 입력

### 프레임워크 / 라이브러리
- **Next.js (App Router)**: 웹 프레임워크 및 라우팅
- **React**: UI 컴포넌트 렌더링 기반
- **Supabase**: Postgres + Storage + RLS 정책 기반 백엔드
- **Vercel**: 호스팅/배포/환경 분리(Preview/Production)
- **Markdown Sanitization Pipeline**: DB 원문을 안전하게 HTML로 렌더링

### 실행 환경
- **Node.js + npm** 기반 Next.js 애플리케이션
- 기본 명령어(계획): `npm run dev`, `npm run build`, `npm run start`

### 현재 아키텍처 요약
- 공개 앱은 **읽기 전용(public read-only)** 으로 운영
- 콘텐츠 작성/수정은 앱 내부가 아니라 **Supabase Studio 또는 server-only script**로 처리
- Preview/Production은 **서로 다른 Supabase 환경**으로 분리

## 참고
- 위 내용은 `.sisyphus/plans/technical-blog-vercel-nextjs-supabase.ko.md` 기준의 **목표 기술 스택**입니다.

## 폴더 구조 예시 (계획 기준)
```
/project-root
  /src
    /app         # Next.js App Router 라우트
    /lib         # 공용 도메인/데이터 접근 모듈
  /supabase      # migration, policy, storage 설정
  /scripts       # server-only 운영/마이그레이션 스크립트
  /tests         # unit/integration/e2e 테스트
  /public        # 정적 에셋
```

## 라이선스
MIT
