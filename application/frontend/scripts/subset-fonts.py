#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools==4.62.1", "brotli==1.2.0"]
# ///
"""Cuts the @fontsource text fonts down to what the site's own pages need.

Each file keeps the code points of its core set (below), the layout features the site can use and,
for the variable fonts, the weights 400 to 700. Everything else of a font still reaches the page:
src/styles/fonts.css declares a "rest" face per file that points at the untouched @fontsource file,
with the code points that are not in the core. Change a set here and the ranges there together;
tests/config/fonts.test.ts checks that they match the files.

Usage (after `bun install`, e.g. when an @fontsource package is updated):
    uv run application/frontend/scripts/subset-fonts.py

Output: application/frontend/src/assets/fonts/*-core.woff2, the same bytes on every run. The script
also prints the unicode-range of each core and rest face.
"""

import sys
from io import BytesIO
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

FRONTEND = Path(__file__).resolve().parent.parent
SOURCES = FRONTEND / "node_modules"
OUT = FRONTEND / "src" / "assets" / "fonts"

# English, German letters (names of partners), and the punctuation, signs and spaces in use.
# Tab, line feed, carriage return, U+00AD, U+2009, U+2010-2012 and U+202F have no glyph in some or all
# of the fonts. They are listed because in the rest range they would download a whole file for
# nothing: WebKit looks for a line feed in preformatted text, Firefox for a hyphen on every page.
LATIN = (
    "U+0009, U+000A, U+000D, U+0020-007E, U+00A0, U+00A9, U+00AB, U+00AD, U+00AE, U+00B0-00B3, U+00B7, "
    "U+00BB, U+00C4, U+00D6, U+00D7, U+00DC, U+00DF, U+00E4, U+00F6, U+00FC, U+02BC, U+2009, U+2010-2014, "
    "U+2018-201A, U+201C-201E, U+2022, U+2026, U+202F, U+20AC, U+2122"
)
# Ukrainian (and the rest of the basic Cyrillic alphabet), the stress mark and the numero sign
CYRILLIC = "U+0301, U+0404, U+0406-0407, U+0410-044F, U+0454, U+0456-0457, U+0490-0491, U+2116"

# The unicode-range of the @fontsource files
LATIN_FILE = (
    "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, "
    "U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"
)
CYRILLIC_FILE = "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116"

# What browsers apply on their own, plus the figure styles and case forms (tabular-nums is used)
FEATURES = ["kern", "mark", "mkmk", "ccmp", "locl", "liga", "calt", "tnum", "lnum", "pnum", "case"]
WEIGHTS = (400, 700)

SUBSETS = {"latin": LATIN, "cyrillic": CYRILLIC}
VARIABLE = {
    "inter": "@fontsource-variable/inter/files/inter-{subset}-wght-normal.woff2",
    "ibm-plex-sans": "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-{subset}-wght-normal.woff2",
}
STATIC = {
    f"jetbrains-mono-{weight}": f"@fontsource/jetbrains-mono/files/jetbrains-mono-{{subset}}-{weight}-normal.woff2"
    for weight in (400, 500)
}


def code_points(ranges: str) -> set[int]:
    return set(subset.parse_unicodes(ranges.replace("U+", "")))


def unicode_range(points: set[int]) -> str:
    parts: list[list[int]] = []
    for point in sorted(points):
        if parts and point == parts[-1][1] + 1:
            parts[-1][1] = point
        else:
            parts.append([point, point])
    return ", ".join(f"U+{a:04X}" if a == b else f"U+{a:04X}-{b:04X}" for a, b in parts)


def make_core(source: Path, target: Path, points: set[int], variable: bool) -> None:
    # recalcTimestamp would write the current time into the file
    font = TTFont(source, recalcTimestamp=False)
    options = subset.Options(layout_features=FEATURES, notdef_outline=True, recalc_timestamp=False)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=points)
    subsetter.subset(font)
    if variable:
        # Save and reload: the instancer works on the compiled subset, not on half edited tables
        font.flavor = None
        buffer = BytesIO()
        font.save(buffer)
        buffer.seek(0)
        font = TTFont(buffer, recalcTimestamp=False)
        instancer.instantiateVariableFont(font, {"wght": WEIGHTS}, inplace=True)
    font.flavor = "woff2"
    font.save(target)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    for fonts, variable in ((VARIABLE, True), (STATIC, False)):
        for name, path in fonts.items():
            for part, ranges in SUBSETS.items():
                source = SOURCES / path.format(subset=part)
                if not source.is_file():
                    print(f"Missing {source}: run `bun install` first", file=sys.stderr)
                    return 1
                target = OUT / f"{name}-{part}-core.woff2"
                make_core(source, target, code_points(ranges), variable)
                print(f"{target.name}: {source.stat().st_size} -> {target.stat().st_size} bytes")
    for part, full in (("latin", LATIN_FILE), ("cyrillic", CYRILLIC_FILE)):
        core = code_points(SUBSETS[part])
        print(f"\n{part} core: {unicode_range(core)}")
        print(f"{part} rest: {unicode_range(code_points(full) - core)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
