# CLAUDE.md

## 디자인 기준: KRDS

UI를 만들거나 고치기 전에 KRDS(대한민국 정부 디자인 시스템) 문서를 주소로 읽는다. 저장소에 사본을 두지 않는다.

- 문서: https://getdesign.kr/services/krds/DESIGN.md
  - 같은 주소를 `Accept: text/markdown` 헤더로 요청해도 된다.
  - 다른 서비스 목록: https://getdesign.kr/llms.txt

### 가져오는 것

- 색 단계: gray·primary·secondary, 상태색(info·success·warning·danger)
- 글꼴: `"Pretendard GOV"` → Pretendard → 시스템 한글 글꼴 순서의 스택
- 글자 크기 단계: 본문 17px / 줄 간격 1.55, 제목 32·24·19px / 줄 간격 1.3
- 4px 간격 그리드
- 모서리 반경 4·6·8·10·12px (최대 12px, 칩·카운터의 pill만 예외)
- 절제된 그림자(1–2단)와 1px 테두리(`#CDD1D5`)로 위계 표현
- 장식용 그라데이션을 쓰지 않는 평면 표면
- 이모지와 유니코드 글리프 아이콘을 쓰지 않음 (SVG 아이콘 사용)

### 가져오지 않는 것

- 정부 표식 배너(`government-identifier-strip`), 정부 상징·워드마크가 들어간 마스트헤드(`header-brand-block`) 등 정부 전용 요소. 개인 블로그가 정부 공식 사이트처럼 보이면 안 된다.
- 본인 인증·간편인증 같은 민원 흐름
- 화면 문구에 "KRDS" 이름을 넣지 않는다.

### 다크 모드

KRDS는 라이트 모드와 "선명한 화면 모드(고대비)"만 정의한다. 이번 개편에서는 다크 모드를 다루지 않는다.

- `src/app/globals.css`의 `prefers-color-scheme: dark` 블록에 있는 기존 값은 바꾸지 않는다.
- 새 색 토큰을 추가할 때는 다크 블록에도 값을 넣는다. 넣지 않으면 다크 모드에서 라이트 색이 그대로 보인다.

## 색 토큰

- 색은 `src/app/globals.css`의 `--gh-*` 토큰(Tailwind에서는 `bg-gh-*`, `text-gh-*`, `border-gh-*`)으로 지정한다.
- `indigo-500` 같은 Tailwind 기본 팔레트 색을 직접 쓰지 않는다. 옅은 배경은 `bg-gh-accent/10`처럼 토큰에 투명도를 붙인다.
