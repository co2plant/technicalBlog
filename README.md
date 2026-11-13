# co2plant 기술 블로그

개발하면서 배운 개념, 직접 겪은 시행착오, 오픈소스 기여 경험을 차분히 기록하는 기술 블로그입니다.

<img width="1012" height="912" alt="co2plant 기술 블로그 미리보기" src="https://github.com/user-attachments/assets/b93f58ab-a61c-452e-bee1-7982144c9c81" />

## 어떤 글을 쓰나요?

- **웹과 브라우저**: HTTP 통신 방식, WebAssembly, fetch 이후 알림 처리처럼 웹 개발 중 마주치는 개념을 정리합니다.
- **Java와 백엔드 기초**: 오버라이딩, 다중 상속, 프레임워크 학습처럼 다시 설명할 수 있어야 하는 내용을 풀어 씁니다.
- **오픈소스 기여 기록**: 전자정부표준프레임워크 컨트리뷰션처럼 실제로 참여하며 배운 점을 남깁니다.
- **포트폴리오와 결과물**: 프로젝트 문서, 발표 자료, PDF 산출물을 함께 보여줄 수 있는 글도 정리합니다.
- **프로젝트 기록**: 포트폴리오에는 들어가지 않지만 노력했던 기록을 적어 남깁니다.

## 블로그의 방향

단순히 “알게 된 것”을 모으기보다, 시간이 지나도 다시 꺼내 읽을 수 있는 글을 목표로 합니다.

개념 글은 처음 보는 사람도 흐름을 따라올 수 있게 쓰고, 경험 글은 당시의 선택과 고민이 드러나도록 남깁니다. 잘 몰랐던 내용을 공부한 뒤 제 언어로 다시 설명하는 과정 자체를 블로그의 중심에 두고 있습니다.

## 관심 있는 주제

- 웹 플랫폼과 브라우저 동작 방식
- Java, Spring, 전자정부표준프레임워크
- 오픈소스 기여와 코드 리뷰 경험
- Git, 협업 규칙, 개발 생산성
- 프로젝트 회고와 포트폴리오 정리

## 더 보기

- GitHub: [github.com/co2plant](https://github.com/co2plant)
- 이전 글 아카이브: [Tistory](https://co2plant.tistory.com), [Velog](https://velog.io/@co2plant)

---

읽고 난 뒤 “나도 이 개념을 설명할 수 있겠다”는 느낌이 남는 글을 쓰고 싶습니다.

## 글 작성

에디터 본문 위에 글·그림·코드의 구성 참고 비율을 작은 문구로 표시합니다. 토스·강남언니 글 6편의 개수를 집계한 값이며, 자세한 결과와 출처는 [집계 문서](docs/writing-reference.md)에 기록했습니다.

## 로컬 실행과 테스트

Node.js 20.19 이상(20.x) 또는 22.12 이상(22.x), 실행 중인 Docker Desktop이 필요합니다.

```sh
npm ci
npx playwright install chromium
npm run dev:local
```

- 사이트: http://127.0.0.1:3000
- 관리자: http://127.0.0.1:3000/admin
- 로컬 전용 관리자 비밀번호: `local-admin-only`

`dev:local`은 로컬 PostgreSQL 시작, 마이그레이션, 샘플 글 준비 후 개발 서버를 실행합니다.
`.env.local`을 수정할 필요가 없으며, 자식 프로세스에 로컬 DB와 테스트용 관리자 설정을 전달합니다.
일반 `npm run dev`는 기존 환경변수 설정을 그대로 사용합니다.

```sh
# Docker 없이 실행하는 단위 테스트
npm test

# 로컬 DB와 샘플 데이터만 준비
npm run local:setup

# 로컬 DB 준비 후 브라우저 자동 테스트 실행 (127.0.0.1:4173)
npm run test:e2e

# 정적 검사
npm run lint
npm run typecheck
```

브라우저 테스트 전에 다른 개발 서버를 종료하세요. Next.js 개발 서버의 `.next` 디렉터리를 공유하므로 동시에 실행하지 않습니다.
브라우저 테스트는 기존 서버를 재사용하지 않고 테스트용 서버를 직접 시작·종료합니다.

Docker 설정은 `compose.yml`을 사용하며, 같은 로컬 PostgreSQL 안에서 개발과 E2E DB를 분리합니다.

| 용도 | DB | 주소를 변경할 때 사용하는 환경변수 |
| --- | --- | --- |
| 로컬 개발 | `technicalblog_local` | `DATABASE_URL_LOCAL` |
| 브라우저 자동 테스트 | `technicalblog_e2e` | `DATABASE_URL_TEST` |

기본 접속 주소는 `127.0.0.1:54329`입니다.
주소를 지정하는 경우에도 loopback 호스트와 용도에 맞는 DB 이름만 허용하고 URL 쿼리 옵션은 허용하지 않습니다.
운영 DB URL로 대체되지 않으며 Supabase Storage 자격증명도 로컬 서버에 전달하지 않습니다.
실제 파일 업로드는 별도 Storage 환경이 필요합니다. 현재 에디터 E2E에서는 업로드 API를 모사합니다.

샘플은 `/posts/1`의 Git 글, `/posts/11`의 포트폴리오/PDF, 관리자 편집용 초안입니다.
로컬 개발에는 목록·본문 배치를 확인할 Lorem ipsum 글 2개(짧은 글, 긴 제목·본문)도 추가됩니다. 비어 있는 다음 글 번호를 쓰므로 새 DB에서는 `/posts/12`, `/posts/13`이고, 이미 로컬에서 발행한 글이 있으면 그 뒤 번호를 씁니다. 이 두 글은 E2E 데이터에 포함하지 않습니다.
로컬 개발에서는 샘플을 처음에만 생성하고, 이후에는 수정하거나 삭제한 상태를 유지합니다.
E2E는 별도 `technicalblog_e2e` DB의 샘플만 초기화하므로 개발 중 작성한 글을 변경하지 않습니다.
해당 글 번호에 샘플이 아닌 기존 글이 있으면 덮어쓰지 않고 준비를 중단합니다.

이전 구성의 `technicalblog_test` DB만 있는 경우, `local:setup`이 기존 데이터를 유지한 채 `technicalblog_local`로 이름을 변경합니다.

DB를 잠시 중지하려면 `npm run local:db:stop`, 다시 시작하려면 `npm run local:db:up`을 실행합니다.
컨테이너와 개발·E2E 데이터를 모두 제거하려면 `npm run local:db:down`을 실행합니다.
