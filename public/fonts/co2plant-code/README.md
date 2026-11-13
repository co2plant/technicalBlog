# co2plant Code 웹폰트

코드 블록과 인라인 코드에 쓰는 고정폭 글꼴입니다. NAVER의 D2Coding ligature 1.4.0 Regular에서 이 블로그에 필요한 글자만 남긴 서브셋입니다.

## 원본

- 글꼴: D2Coding ligature 1.4.0 Regular (NAVER Corporation, 디자인 FONTRIX)
- 배포: NAVER D2Coding 공식 미리보기의 WOFF2 원본
  - 커밋: https://github.com/naver/d2-coding-font/tree/48d294137e3b65158deef2f5846d2e335e43f92f
  - 경로: `site/fonts/D2Coding-Regular.woff2`
  - SHA-256: `0fa3ea3b5990782e8e0c124ff6918c64ad057bc87365565405531e010cfdfbaa`
- 라이선스: SIL Open Font License 1.1 (`OFL.txt`). 수정본도 같은 라이선스를 따릅니다.

## 바꾼 점

| 파일 | 담은 글자 | 크기 |
| --- | --- | --- |
| `co2plant-code-latin.woff2` | ASCII, Latin-1, 일반 문장부호, ₩, €, 화살표, 상자 선 | 약 30KB |
| `co2plant-code-hangul.woff2` | 자주 쓰는 한글 2,350자(KS X 1001), 한글 자모, CJK 문장부호, 전각 문자 | 약 276KB |

- 브라우저는 CSS `unicode-range`에 맞는 글자가 화면에 있을 때만 각 파일을 받습니다.
- 나머지 한글 음절, 한자, 가나, 기타 기호는 담지 않았습니다. 이 글자들은 `--font-mono` 스택의 다음 고정폭 글꼴로 표시됩니다.
- Bold 파일은 두지 않습니다. 굵은 글자는 브라우저가 Regular를 굵게 합성합니다.
- OpenType 기능과 TrueType 힌팅은 원본 그대로 남겼습니다.
- 글꼴 이름은 `co2plant Code`로 바꿨습니다. 서브셋은 OFL의 수정본(Modified Version)이고, "D2Coding"은 예약 글꼴 이름(Reserved Font Name)이라 수정본에 쓸 수 없기 때문입니다([OFL FAQ 2.5–2.8](https://openfontlicense.org/ofl-faq/)). 글꼴 안의 저작권·라이선스·상표 문구는 원본 그대로입니다.

## 다시 만들기

위 원본 파일을 받은 뒤 아래를 실행합니다. 스크립트는 원본의 SHA-256을 확인하고 이 폴더의 두 파일을 덮어씁니다.

```bash
python3 -m venv .font-venv
.font-venv/bin/pip install fonttools==4.60.2 brotli==1.2.1
.font-venv/bin/python scripts/subset-code-font.py path/to/D2Coding-Regular.woff2
```

담을 글자 범위를 바꾸면 `src/app/globals.css`의 `unicode-range`도 같이 고칩니다. 스크립트가 각 파일의 범위를 출력합니다.
