# 기술 블로그 프로젝트

이 프로젝트는 저사양 환경(1GHz CPU 등)에서도 원활하게 동작할 수 있도록 설계된 **Node.js + Express + EJS + SQLite** 기반의 기술 블로그입니다.

## 주요 특징
- **Node.js**와 **Express**로 구현된 경량 서버
- **EJS** 템플릿 엔진을 사용한 서버사이드 렌더링
- **SQLite**를 이용한 파일 기반 경량 데이터베이스
- 정적 파일 및 동적 게시글 모두 지원
- 단일 서버에서 백엔드와 프론트엔드 통합 운영

## 폴더 구조 예시
```
/project-root
  /public        # CSS, JS, 이미지 등 정적 파일
  /views         # EJS 템플릿 파일
  /posts         # 마크다운 또는 게시글 데이터
  app.js         # 서버 코드
  blog.db        # SQLite DB 파일
```

## 라이선스
MIT
