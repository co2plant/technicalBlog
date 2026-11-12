---
version: alpha
name: co2plant 기술 블로그
description: 기술 글의 제목과 내용을 차분하게 읽고 찾는 한국어 블로그
colors:
  background: "#ffffff"
  surface: "#f4f5f6"
  text: "#131416"
  muted: "#464c53"
  primary: "#256ef4"
  link: "#0b50d0"
typography:
  sans:
    fontFamily: '"Pretendard GOV", "Pretendard Variable", Pretendard, system-ui, sans-serif'
  mono:
    fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    fontSize: 1rem
    lineHeight: 1.65
rounded:
  label: 4px
  empty-state: 8px
spacing:
  row: 24px
  metadata: 12px
  tags: 8px
  code-padding: 16px
components:
  post-list:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    padding: "{spacing.row}"
  post-title:
    textColor: "{colors.text}"
    size: 19px
  post-title-hover:
    textColor: "{colors.link}"
  post-summary:
    textColor: "{colors.muted}"
    size: 15px
  post-metadata:
    textColor: "{colors.muted}"
    size: 13px
  tag:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.label}"
  code-block:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.mono}"
    rounded: "{rounded.empty-state}"
    padding: "{spacing.code-padding}"
---

# co2plant 기술 블로그 디자인

## Overview

개발자가 제목을 훑고 필요한 글을 읽는 한국어 기술 블로그다. 공개 글 목록은 책의 차례처럼 한 열로 정리한다. 코드 가독성은 편집기와 미리보기·발행 화면에 같은 기준을 적용한다. 관리자 화면의 입력·저장 동작은 유지한다.

색과 글자 값은 `src/app/globals.css`가 원본이다. 이 문서는 적용한 결정과 토큰의 사용처를 기록하며 CSS를 생성하지 않는다. KRDS 원문은 복사하지 않고 `AGENTS.md`에서 지정한 외부 문서를 참조한다.

## Colors

목록은 `bg-gh-bg`, 태그와 빈 상태는 `bg-gh-surface`, 구분선은 `border-gh-border`를 사용한다. 글 제목은 `text-gh-text`, 목록 페이지 제목·설명·날짜·분류는 `text-gh-muted`를 사용해 글 제목에 시선이 먼저 가도록 한다. 링크 hover는 `text-gh-accent-strong`, 포커스는 `--gh-accent`에 연결한다. 새 색 토큰은 추가하지 않았다. 기존 다크 모드 값은 유지한다.

## Typography

`--font-sans`의 기존 한글 글꼴 스택을 사용한다. 페이지 제목은 모바일 `text-heading-m`(24px), 데스크톱 `text-heading-l`(32px)이다. 글 제목은 `text-heading-s`(19px), 안내는 `text-body-m`(17px), 요약은 `text-body-s`(15px), 날짜·분류·태그는 `text-body-xs`(13px)를 사용한다. 제목은 700, 일반 텍스트는 400이며 영문 표기는 원문을 유지한다.

## Layout

기존 `max-w-5xl`과 좌우 16px 여백을 유지한다. 데스크톱(1024px 이상)에서 도구 메뉴를 펼치면 48px을 제외한 공간에 본문을 가운데 배치한다. 기본은 접힌 상태로, 메뉴 공간을 본문에 돌려주고 상단 왼쪽에 32px 크기의 햄버거 버튼만 표시한다. 같은 버튼으로 펼치고 접으며 본문을 덮지 않는다. 메뉴 공간의 너비를 0↔48px로 200ms 동안 선형 전환해 본문이 일정한 속도로 이동하도록 하고, 모션 감소 설정에서는 애니메이션을 끈다. 브라우저 저장소에 펼침·접기 선택을 기억하며, 사용할 수 없으면 현재 방문에서만 유지한다. 좁은 화면에서는 이 선택과 무관하게 도구 메뉴가 헤더 아래 가로줄로 배치되며 본문 공간을 덮지 않는다. 공개 글은 날짜·카테고리, 제목, 요약, 태그 순으로 한 행에 하나씩 표시한다. 행의 위아래 여백은 각각 24px이며 사이에 1px 구분선을 둔다. 요약이 없으면 해당 영역을 만들지 않는다. 공개 글 목록은 최대 768px(`max-w-3xl`) 너비로 가운데 배치한다. 요약은 모든 화면에서 최대 두 줄까지 표시하고 넘치는 부분은 말줄임한다. 긴 제목과 태그는 줄바꿈한다.

공개 글 목록은 `PostCollection`의 `layout="list"`를 사용한다. 포트폴리오 목차는 없애고 `/portfolio`에서 최근 공개 포트폴리오 글로 이동한다. 도구 목차도 없애고 `/tools`에서는 기본 도구인 비밀번호 생성기로 이동한다.

## Elevation & Depth

목록에 그림자를 추가하지 않는다. 제목의 크기·굵기와 구분선으로 정보 위계를 표현한다.

## Shapes

정적인 태그는 4px 모서리의 중립색 라벨이다. 필터 버튼처럼 보이는 파란 pill은 사용하지 않는다. 빈 상태는 모서리 8px 패널이다. 도구 아이콘 링크는 6px 모서리를 사용한다.

## Components

`src/components/post-collection.tsx`가 공개 글 목록의 소유자다. 각 글은 하나의 링크이며 접근 가능한 이름은 글 제목이다. 태그 안에는 별도 링크나 버튼을 중첩하지 않는다. 글의 순서·주소·포트폴리오 제외 정책은 기존 데이터를 따른다.

`src/lib/tools.ts`가 도구의 주소·이름·아이콘 구분을 소유하고 `src/components/tools-navigation.tsx`에서 렌더링한다. 데스크톱은 SVG 아이콘과 hover·키보드 포커스 시 나타나는 이름, 좁은 화면은 아이콘과 짧은 이름을 함께 표시한다. 현재 도구는 `aria-current="page"`와 강조색으로 구분한다. 이름 풍선은 마우스로 옮겨 읽을 수 있고 Escape로 닫으며 링크 포커스는 유지한다. 관리자·면접 공유 화면은 기존 독립 작업 공간을 유지한다. 모바일 바로가기의 스크롤 여백은 헤더와 도구 메뉴 높이를 고려한다.

`src/app/globals.css`에서 키보드 포커스를 강조색 2px 실선과 2px 간격으로 표시한다. `src/app/layout.tsx`의 첫 링크는 본문 바로가기이며 헤더 위에 표시되고 `main-content`로 이동한다.

색 변화만 짧게 사용하고 모션 감소 설정을 따른다. 아이콘은 필요한 경우 SVG를 사용한다. 목록에는 장식용 아이콘이나 애니메이션을 추가하지 않는다.

## Do's and Don'ts

- 기존 `gh-*` 색과 글자 토큰을 사용한다.
- 긴 제목, 요약 없음, 여러 태그, 글 없음 상태를 확인한다.
- 글 목록 수정으로 포트폴리오 배치를 바꾸지 않는다.
- 검색·필터와 모바일 헤더 개편은 별도 작업으로 다룬다.
