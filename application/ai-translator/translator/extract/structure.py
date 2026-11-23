"""Heuristic draft of the datasheet YAML from a WIPOTEC PDF. An agent fixes the rest."""

import re
from collections import Counter
from dataclasses import dataclass
from itertools import pairwise

import pymupdf

from translator.config import SourceConfig, is_branding
from translator.extract.images import ExtractedImage, Label, find_cover_clip
from translator.extract.pdf import Span, page_spans, table_cells_text
from translator.text import normalise_text

HEADER_BOTTOM = 125
RIGHT_FRACTION = 0.6
MIN_CONTENT_SPANS = 8
MATRIX_SHARE = 0.6
MATRIX_MARKS = {"x", "-"}
HEADING_GAP = 40
MIN_FILL = 50
MAX_BULLET = 10
WIDTH_TOLERANCE = 3
FOOTNOTE_RE = re.compile(r"^\d\)")
GLUED_NOTE_RE = re.compile(r"^(.*?)\s*(\d)\)$")
NOTES_RE = re.compile(r"personal\s+notes", re.IGNORECASE)
COVER_IMAGE = "images/cover.svg"

Drawings = dict[int, tuple[str, pymupdf.Rect, list[Label]]]


@dataclass
class Line:
    spans: list[Span]

    @property
    def rect(self) -> pymupdf.Rect:
        rect = pymupdf.Rect(self.spans[0].bbox)
        for span in self.spans[1:]:
            rect |= span.bbox
        return rect

    @property
    def size(self) -> float:
        return max(s.size for s in self.spans)

    @property
    def text(self) -> str:
        return " ".join(s.text for s in self.spans)

    @property
    def markup(self) -> str:
        return " ".join(f"**{s.text}**" if s.bold else s.text for s in self.spans)


def _centre(bbox) -> pymupdf.Point:
    r = pymupdf.Rect(bbox)
    return pymupdf.Point((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)


def _lines(spans: list[Span]) -> list[Line]:
    """Group spans into visual lines: same height band, no wide horizontal gap."""
    rows: list[list[Span]] = []
    for span in sorted(spans, key=lambda s: (_centre(s.bbox).y, s.bbox[0])):
        if rows and abs(_centre(span.bbox).y - _centre(rows[-1][0].bbox).y) <= 3:
            rows[-1].append(span)
        else:
            rows.append([span])
    lines: list[Line] = []
    for row in rows:
        row.sort(key=lambda s: s.bbox[0])
        current = [row[0]]
        for span in row[1:]:
            if span.bbox[0] - current[-1].bbox[2] > 1.5 * span.size:
                lines.append(Line(current))
                current = [span]
            else:
                current.append(span)
        lines.append(Line(current))
    return sorted(lines, key=lambda line: (line.rect.y0, line.rect.x0))


def _is_heading(line: Line, body_size: float) -> bool:
    bold = {s.bold for s in line.spans}
    return line.size > body_size and bold == {True, False}


def _paragraphs(lines: list[Line]) -> list[list[Line]]:
    groups: list[list[Line]] = []
    for line in lines:
        for group in reversed(groups):
            last = group[-1]
            gap = line.rect.y0 - last.rect.y1
            if (
                abs(line.rect.x0 - group[0].rect.x0) < WIDTH_TOLERANCE
                and abs(line.size - last.size) < 0.5
                and -1 <= gap < 0.8 * line.size
            ):
                group.append(line)
                break
        else:
            groups.append([line])
    return groups


def _group_rect(group: list[Line]) -> pymupdf.Rect:
    rect = group[0].rect
    for line in group[1:]:
        rect |= line.rect
    return rect


def _join(group: list[Line]) -> str:
    return normalise_text("\n".join(line.text for line in group))


def _cell(text: str | None) -> str:
    return text or ""


def _table_block(page: pymupdf.Page, table) -> dict:
    cells = table_cells_text(page, table)
    if table.col_count == 2:
        rows = []
        for row in cells:
            label, value = _cell(row[0]), _cell(row[1])
            if not label and not value:
                continue
            entry: dict = {"label": label, "value": value}
            glued = GLUED_NOTE_RE.match(label)
            if glued:
                entry = {"label": glued.group(1), "value": value, "note": int(glued.group(2))}
            rows.append(entry)
        return {"type": "table", "title": "", "rows": rows}
    body = [c for row in cells[1:] for c in row[1:] if c]
    marks = sum(1 for c in body if c in MATRIX_MARKS)
    if body and marks / len(body) >= MATRIX_SHARE and len(cells) > 2:
        title = next((c for c in cells[0] if c), "")
        return {
            "type": "matrix",
            "title": title,
            "corner": _cell(cells[1][0]),
            "header": [_cell(c) for c in cells[1][1:]],
            "rows": [{"label": _cell(r[0]), "cells": [_cell(c) for c in r[1:]]} for r in cells[2:]],
        }
    return {
        "type": "grid",
        "title": "",
        "header": [_cell(c) for c in cells[0]],
        "rows": [[_cell(c) for c in row] for row in cells[1:]],
    }


def _heading_above(rect: pymupdf.Rect, headings: list[Line]) -> Line | None:
    above = [h for h in headings if h.rect.y1 <= rect.y0 + 2 and rect.y0 - h.rect.y1 < HEADING_GAP]
    above = [h for h in above if h.rect.x0 < rect.x1 and h.rect.x1 > rect.x0]
    return max(above, key=lambda h: h.rect.y1, default=None)


def _luminance(rgb) -> float:
    r, g, b = rgb[:3]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _asides(page: pymupdf.Page, lines: list[Line], body_size: float) -> list[tuple[float, dict]]:
    """Filled boxes holding a heading plus bullet lines. Consumed lines leave `lines`."""
    drawings = page.get_drawings()
    bullets = [
        pymupdf.Rect(d["rect"])
        for d in drawings
        if d.get("fill") and d["rect"].width < MAX_BULLET and d["rect"].height < MAX_BULLET
    ]
    found: list[tuple[float, dict]] = []
    seen: set[tuple] = set()
    for d in drawings:
        rect = pymupdf.Rect(d["rect"])
        key = tuple(round(v) for v in rect)
        if not d.get("fill") or rect.width < MIN_FILL or rect.height < MIN_FILL or key in seen:
            continue
        seen.add(key)
        inside = [line for line in lines if rect.contains(_centre(line.rect))]
        heading = next((line for line in inside if _is_heading(line, body_size)), None)
        rest = [line for line in inside if line is not heading]
        if heading is None or not rest:
            continue
        marks = [b for b in bullets if rect.contains(b)]
        items: list[list[Line]] = []
        for line in rest:
            starts = not marks or any(b.y0 <= _centre(line.rect).y <= b.y1 for b in marks)
            if starts or not items:
                items.append([line])
            else:
                items[-1].append(line)
        style = "dark" if _luminance(d["fill"]) < 0.5 else "light"
        aside = {"style": style, "title": heading.markup, "items": [_join(i) for i in items]}
        found.append((rect.y0, aside))
        for line in inside:
            lines.remove(line)
    return sorted(found, key=lambda item: item[0])


def _text_blocks(lines: list[Line], body_size: float) -> list[tuple[float, dict]]:
    blocks: list[tuple[float, dict]] = []
    groups = sorted(_paragraphs(lines), key=lambda g: (g[0].rect.y0, g[0].rect.x0))
    if (
        groups
        and groups[0][0].size > body_size
        and not (len(groups[0]) == 1 and _is_heading(groups[0][0], body_size))
    ):
        first = groups.pop(0)
        blocks.append((first[0].rect.y0, {"type": "lead", "text": _join(first)}))
    widths = [round(_group_rect(g).width) for g in groups]
    repeated = [w for w in widths if sum(abs(w - o) <= WIDTH_TOLERANCE for o in widths) >= 2]
    column_width = max(repeated, default=None)
    columns = []
    for group, width in zip(groups, widths, strict=True):
        if column_width is not None and abs(width - column_width) <= WIDTH_TOLERANCE:
            columns.append(group)
        elif len(group) == 1 and _is_heading(group[0], body_size):
            blocks.append((group[0].rect.y0, {"type": "note", "text": group[0].markup}))
        else:
            blocks.append((group[0].rect.y0, {"type": "note", "text": _join(group)}))
    if columns:
        columns.sort(key=lambda g: (g[0].rect.x0, g[0].rect.y0))
        y = min(g[0].rect.y0 for g in columns)
        blocks.append((y, {"type": "columns", "paragraphs": [_join(g) for g in columns]}))
    return blocks


def _header(spans: list[Span], width: float) -> tuple[list[str], list[Span]]:
    header = [s for s in spans if s.bbox[3] < HEADER_BOTTOM]
    right = sorted((s for s in header if s.bbox[0] > RIGHT_FRACTION * width), key=lambda s: -s.size)
    left = [s for s in header if s.bbox[0] <= RIGHT_FRACTION * width]
    return [line.text for line in _lines(left)], right


def is_branding_page(page: pymupdf.Page, cfg: SourceConfig) -> bool:
    """A page whose header title is branding (the "Personal notes" page): it is not extracted."""
    title, _ = _header(page_spans(page), page.rect.width)
    return is_branding(" ".join(title), cfg)


def _letter_spaced(page: pymupdf.Page, span: Span) -> str:
    """Span text with letter spacing ("T E C H N I C A L D A T A") joined into words by the
    gaps between the letters: "Technical data". Other text is returned as it is."""
    if not all(len(token) == 1 for token in span.text.split()):
        return span.text
    letters = sorted(page.get_text("words", clip=pymupdf.Rect(span.bbox)), key=lambda w: w[0])
    if len(letters) < 2:
        return span.text
    gaps = [b[0] - a[2] for a, b in pairwise(letters)]
    step = sorted(gaps)[len(gaps) // 2]
    words = [letters[0][4]]
    for gap, letter in zip(gaps, letters[1:], strict=True):
        if gap > 1.8 * step:
            words.append("")
        words[-1] += letter[4]
    return " ".join(words).capitalize()


def cover_page(page: pymupdf.Page) -> dict | None:
    """The cover's subtitle, product-line label and drawing clip; None without a drawing."""
    clip = find_cover_clip(page)
    if clip is None:
        return None
    spans = [s for s in page_spans(page) if s.bbox[3] < HEADER_BOTTOM]
    right = [s for s in spans if s.bbox[0] > RIGHT_FRACTION * page.rect.width]
    left = sorted(
        (s for s in spans if s.bbox[0] <= RIGHT_FRACTION * page.rect.width),
        key=lambda s: -s.size,
    )
    return {
        "image": COVER_IMAGE,
        "clip": [round(v, 1) for v in clip],
        "subtitle": " ".join(_letter_spaced(page, s) for s in left[1:]),
        "label": " ".join(s.text for s in right),
    }


def _build_page(
    page: pymupdf.Page,
    spans: list[Span],
    tables: list,
    cfg: SourceConfig,
    photos: list[ExtractedImage],
    drawing: tuple[str, pymupdf.Rect, list[Label]] | None,
) -> list[dict]:
    excluded = [pymupdf.Rect(t.bbox) for t in tables]
    if drawing is not None:
        excluded.append(pymupdf.Rect(drawing[1]))
    free = [
        s
        for s in spans
        if s.bbox[3] >= HEADER_BOTTOM
        and not is_branding(s.text, cfg)
        and not any(r.contains(_centre(s.bbox)) for r in excluded)
    ]
    sizes: Counter[float] = Counter()
    for s in free:
        sizes[s.size] += len(s.text)
    body_size = sizes.most_common(1)[0][0] if sizes else 0.0
    lines = _lines(free)
    blocks: list[tuple[float, dict]] = []

    headings = [line for line in lines if _is_heading(line, body_size)]
    for table in tables:
        rect = pymupdf.Rect(table.bbox)
        block = _table_block(page, table)
        if block["type"] != "matrix":
            heading = _heading_above(rect, headings)
            if heading is not None:
                block["title"] = heading.markup
                headings.remove(heading)
                lines.remove(heading)
        blocks.append((rect.y0, block))

    asides = _asides(page, lines, body_size)
    for k, photo in enumerate(photos):
        boxes = [a for _, a in asides] if k == 0 else []
        y = asides[0][0] if k == 0 and asides else 0.0
        blocks.append((y, {"type": "hero", "image": f"images/{photo.path.name}", "aside": boxes}))
    if asides and not photos:
        blocks.append(
            (asides[0][0], {"type": "hero", "image": "", "aside": [a for _, a in asides]})
        )

    notes = [line for line in lines if FOOTNOTE_RE.match(line.text)]
    if notes:
        items = [normalise_text(line.text) for line in notes]
        blocks.append((notes[0].rect.y0, {"type": "footnotes", "items": items}))
        lines = [line for line in lines if line not in notes]

    blocks.extend(_text_blocks(lines, body_size))

    if drawing is not None:
        image, clip, labels = drawing
        blocks.append(
            (
                clip.y0,
                {
                    "type": "drawing",
                    "image": image,
                    "clip": [round(v, 1) for v in clip],
                    "page": page.number + 1,
                    "labels": [{"text": lb.text, "x": lb.x, "y": lb.y} for lb in labels],
                },
            )
        )
    blocks.sort(key=lambda item: item[0])
    return [block for _, block in blocks]


def build_draft(
    doc: pymupdf.Document,
    cfg: SourceConfig,
    images: list[ExtractedImage],
    drawings: Drawings,
    source: str,
) -> dict:
    product = {"model": "", "variant": "", "category": "", "url": ""}
    pages: list[dict] = []
    cover: dict | None = None
    notes: dict | None = None
    for page in doc:
        spans = page_spans(page)
        title, right = _header(spans, page.rect.width)
        if is_branding(" ".join(title), cfg):
            if NOTES_RE.search(" ".join(title)):
                notes = {"title": title}
            continue
        photos = [im for im in images if im.page == page.number + 1]
        drawing = drawings.get(page.number)
        tables = page.find_tables().tables
        if not tables and not photos and drawing is None and len(spans) < MIN_CONTENT_SPANS:
            if page.number == 0:
                cover = cover_page(page)
            continue
        if not product["model"] and right:
            product["model"] = right[0].text
            if len(right) > 1:
                product["variant"] = right[1].text
        blocks = _build_page(page, spans, tables, cfg, photos, drawing)
        pages.append({"title": title, "blocks": blocks})
    draft: dict = {"source": source, "lang": "en", "product": product}
    if cover is not None:
        draft["cover"] = cover
    draft["pages"] = pages
    if notes is not None:
        draft["notes"] = notes
    return draft
