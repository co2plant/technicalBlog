"""Build the code font's web subsets from D2Coding ligature 1.4.0 (Regular).

The subsets are Modified Versions under the SIL Open Font License, and "D2Coding" is a
Reserved Font Name, so the output is renamed to "co2plant Code" (OFL FAQ 2.5-2.8).
Copyright, license and trademark notices in the font are kept as they are.

Usage (see public/fonts/co2plant-code/README.md for the source file and versions):
    python3 -m venv .font-venv
    .font-venv/bin/pip install fonttools==4.60.2 brotli==1.2.1
    .font-venv/bin/python scripts/subset-code-font.py path/to/D2Coding-Regular.woff2
"""

import argparse
import hashlib
import io
import pathlib

from fontTools import subset
from fontTools.ttLib import TTFont

FAMILY = "co2plant Code"
POSTSCRIPT_NAME = "co2plantCode-Regular"
SOURCE_SHA256 = "0fa3ea3b5990782e8e0c124ff6918c64ad057bc87365565405531e010cfdfbaa"
OUTPUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "public" / "fonts" / "co2plant-code"
RENAMED_NAME_IDS = {1, 3, 4, 6, 16}


def span(first, last):
    return list(range(first, last + 1))


# Every code block needs these: ASCII, Latin-1, general punctuation (… · ※ “ ”), ₩, €, arrows
# and box drawing (tree output).
LATIN = span(0x0020, 0x007E) + span(0x00A0, 0x00FF) + span(0x2000, 0x206F) + [0x20A9, 0x20AC] \
    + span(0x2190, 0x21FF) + span(0x2500, 0x257F) + [0xFFFD]

# KS X 1001 lists the 2,350 most used Hangul syllables; Python's euc_kr codec encodes exactly
# those in two bytes. Other syllables, Hanja, kana and rarer symbols fall back to the next font.
KS_X_1001_SYLLABLES = [code for code in range(0xAC00, 0xD7A4) if len(chr(code).encode("euc_kr")) == 2]
HANGUL = KS_X_1001_SYLLABLES + span(0x3000, 0x303F) + span(0x3131, 0x318E) + span(0xFF01, 0xFF60) \
    + span(0xFFE0, 0xFFE6)

SUBSETS = {"latin": LATIN, "hangul": HANGUL}


def build(source, part, unicodes):
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]  # keep the original OpenType behavior
    options.name_IDs = ["*"]  # keep copyright, license and trademark notices
    options.name_languages = ["*"]
    options.notdef_outline = True
    options.hinting = True  # keep TrueType hinting so Windows renders like the original

    font = TTFont(source, recalcTimestamp=False)  # keep the original dates so rebuilding gives the same bytes
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)

    for record in font["name"].names:
        if record.nameID in (1, 4, 16):
            record.string = FAMILY
        elif record.nameID == 3:
            record.string = f"{FAMILY} Regular ({part}); {font['name'].getDebugName(5)}"
        elif record.nameID == 6:
            record.string = POSTSCRIPT_NAME

    leftover = [record.nameID for record in font["name"].names
                if record.nameID in RENAMED_NAME_IDS and "D2Coding" in str(record)]
    assert not leftover, f"Reserved Font Name left in name IDs {leftover}"

    covered = set(font.getBestCmap())
    missing = [code for code in KS_X_1001_SYLLABLES if code not in covered] if part == "hangul" else []
    assert not missing, f"{len(missing)} KS X 1001 syllables missing"

    buffer = io.BytesIO()
    font.save(buffer)
    return buffer.getvalue(), len(covered)


def unicode_range(codes):
    codes = sorted(set(codes))
    ranges, start, previous = [], codes[0], codes[0]
    for code in codes[1:] + [None]:
        if code is not None and code == previous + 1:
            previous = code
            continue
        ranges.append(f"U+{start:04X}" if start == previous else f"U+{start:04X}-{previous:04X}")
        if code is not None:
            start = previous = code
    return ", ".join(ranges)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source", type=pathlib.Path, help="D2Coding ligature 1.4.0 Regular (woff2 or ttf)")
    args = parser.parse_args()

    digest = hashlib.sha256(args.source.read_bytes()).hexdigest()
    if digest != SOURCE_SHA256:
        raise SystemExit(f"Unexpected source font (sha256 {digest}); see public/fonts/co2plant-code/README.md.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for part, unicodes in SUBSETS.items():
        data, characters = build(args.source, part, unicodes)
        target = OUTPUT_DIR / f"co2plant-code-{part}.woff2"
        target.write_bytes(data)
        print(f"{target.name}: {len(data) / 1024:.1f} KB, {characters} characters")
        print(f"  covers: {unicode_range(unicodes) if part == 'latin' else 'KS X 1001 syllables + ' + unicode_range(unicodes[len(KS_X_1001_SYLLABLES):])}")


if __name__ == "__main__":
    main()
