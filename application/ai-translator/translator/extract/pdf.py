"""Low-level text access on a datasheet PDF page: styled spans and table cells."""

from dataclasses import dataclass

import pymupdf

from translator.text import normalise_text

BOLD_MARKERS = ("Bold", "Semibold")


@dataclass
class Span:
    text: str
    bbox: tuple[float, float, float, float]
    size: float
    bold: bool


def _is_bold(font: str) -> bool:
    return any(marker in font for marker in BOLD_MARKERS)


def page_spans(page: pymupdf.Page) -> list[Span]:
    """Styled text spans; neighbouring spans of one line in the same font are merged."""
    spans: list[Span] = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            merged: list[dict] = []
            for raw in line["spans"]:
                prev = merged[-1] if merged else None
                if prev and prev["font"] == raw["font"] and abs(prev["size"] - raw["size"]) < 0.1:
                    prev["text"] += raw["text"]
                    prev["bbox"] = tuple(pymupdf.Rect(prev["bbox"]) | pymupdf.Rect(raw["bbox"]))
                else:
                    merged.append(dict(raw))
            for raw in merged:
                text = normalise_text(raw["text"])
                if text:
                    bbox = tuple(round(v, 2) for v in raw["bbox"])
                    spans.append(Span(text, bbox, round(raw["size"], 2), _is_bold(raw["font"])))
    return spans


def _centre(bbox) -> pymupdf.Point:
    x0, y0, x1, y1 = bbox
    return pymupdf.Point((x0 + x1) / 2, (y0 + y1) / 2)


def _cell_text(page: pymupdf.Page, cell: pymupdf.Rect) -> str:
    """Text of the characters whose centre lies in the cell (no descenders from neighbours)."""
    lines: list[str] = []
    raw = page.get_text("rawdict", clip=cell + (-2, -2, 2, 2))
    for block in raw["blocks"]:
        for line in block.get("lines", []):
            chars = [
                c["c"]
                for span in line["spans"]
                for c in span["chars"]
                if cell.contains(_centre(c["bbox"]))
            ]
            lines.append("".join(chars))
    return normalise_text("\n".join(lines))


def table_cells_text(page: pymupdf.Page, table) -> list[list[str | None]]:
    """Cell text read from the page (keeps word spaces); None marks a merged cell."""
    return [
        [None if cell is None else _cell_text(page, pymupdf.Rect(cell)) for cell in row.cells]
        for row in table.rows
    ]
