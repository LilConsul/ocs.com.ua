#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools==4.62.1", "brotli==1.2.0"]
# ///
"""Extracts the Material Symbols icons the site uses from the old icon font into SVG path data.

The font file (scripts/icons/material-symbols-outlined.woff2) is only a source: it is not served.
Names are resolved through the font's GSUB ligatures (icon name -> glyph), exactly as a browser did.

Names: every `value` in src/data/icons.json, every fixed `<MaterialIcon name="...">` under src/,
plus "category". The script fails and lists any name the font does not have.

Usage:
    uv run application/frontend/scripts/icon-shapes.py

Output: application/frontend/src/data/icon-shapes.json, already in the repo formatting.
"""

import json
import re
import sys
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FRONTEND = Path(__file__).resolve().parent.parent
FONT = FRONTEND / "scripts" / "icons" / "material-symbols-outlined.woff2"
OUT = FRONTEND / "src" / "data" / "icon-shapes.json"
SIZE = 960
FALLBACK = "category"


def needed_names() -> list[str]:
    names = {FALLBACK}
    names.update(i["value"] for i in json.loads((FRONTEND / "src/data/icons.json").read_text("utf8")))
    for path in (FRONTEND / "src").rglob("*.astro"):
        names.update(re.findall(r'<MaterialIcon\b[^>]*?\bname="([a-z0-9_]+)"', path.read_text("utf8"), re.S))
    return sorted(names)


def ligatures(font: TTFont) -> dict[tuple[str, ...], str]:
    """Map a glyph-name sequence to its single-glyph liga or rlig result."""
    table: dict[tuple[str, ...], str] = {}
    gsub = font["GSUB"].table
    liga_lookups = {
        index
        for feature in gsub.FeatureList.FeatureRecord
        if feature.FeatureTag in ("liga", "rlig")
        for index in feature.Feature.LookupListIndex
    }
    for index in sorted(liga_lookups):
        for sub in gsub.LookupList.Lookup[index].SubTable:
            sub = getattr(sub, "ExtSubTable", sub)
            for first, ligs in getattr(sub, "ligatures", {}).items():
                for lig in ligs:
                    table.setdefault((first, *lig.Component), lig.LigGlyph)
    return table


def main() -> int:
    font = TTFont(FONT)
    cmap, glyphs, upem = font.getBestCmap(), font.getGlyphSet(), font["head"].unitsPerEm
    ligs = ligatures(font)
    scale = SIZE / upem
    shapes, missing = {}, []
    for name in needed_names():
        try:
            seq = tuple(cmap[ord(c)] for c in name)
        except KeyError:
            missing.append(name)
            continue
        glyph = ligs.get(seq)
        if glyph is None:
            missing.append(name)
            continue
        pen = SVGPathPen(glyphs, ntos=lambda v: f"{round(v, 1):g}")
        # flip to y-down: glyph baseline sits at the bottom of the box, em square is the viewBox
        glyphs[glyph].draw(TransformPen(pen, (scale, 0, 0, -scale, 0, SIZE)))
        shapes[name] = pen.getCommands()
    if missing:
        print("Icons missing from the font: " + ", ".join(missing), file=sys.stderr)
        return 1
    lines = ",\n".join(f"\t\t{json.dumps(k)}: {json.dumps(v)}" for k, v in sorted(shapes.items()))
    with OUT.open("w", encoding="utf8", newline="\n") as out:
        out.write(f'{{\n\t"viewBox": "0 0 {SIZE} {SIZE}",\n\t"shapes": {{\n{lines}\n\t}}\n}}\n')
    print(f"Wrote {len(shapes)} icons to {OUT.relative_to(FRONTEND)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
