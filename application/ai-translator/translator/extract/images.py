"""Extract photos and vector drawings from a datasheet PDF."""

import re
from dataclasses import dataclass
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw

FOOTER_FRACTION = 0.88
MIN_PIXELS = 64
TOUCH_TOLERANCE = 2.0
HEADER_BOTTOM = 125
MIN_DRAWING_OPS = 150
THUMB_WIDTH = 300
NEAR_WHITE = 245  # grey level from which a pixel counts as blank background
TRIM_PAD = 8  # px of background kept around the trimmed photo
WORD_RE = re.compile(r"[^\W\d_]{2,}")
RADIUS_RE = re.compile(r"^R\d+$")


@dataclass
class ExtractedImage:
    id: str
    page: int
    path: Path
    width: int
    height: int


@dataclass
class Label:
    text: str
    x: float
    y: float


def _touch(a: pymupdf.Rect, b: pymupdf.Rect) -> bool:
    t = TOUCH_TOLERANCE
    return a.x0 - t <= b.x1 and b.x0 - t <= a.x1 and a.y0 - t <= b.y1 and b.y0 - t <= a.y1


def _clusters(items: list[dict]) -> list[list[dict]]:
    parent = list(range(len(items)))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if _touch(items[i]["rect"], items[j]["rect"]):
                parent[find(i)] = find(j)
    groups: dict[int, list[dict]] = {}
    for i, item in enumerate(items):
        groups.setdefault(find(i), []).append(item)
    return sorted(
        groups.values(), key=lambda g: (min(x["rect"].y0 for x in g), min(x["rect"].x0 for x in g))
    )


def _tile_image(doc: pymupdf.Document, xref: int) -> Image.Image:
    pix = pymupdf.Pixmap(doc, xref)
    if pix.alpha or pix.colorspace is None or pix.colorspace.n not in (1, 3):
        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
    mode = "L" if pix.colorspace.n == 1 else "RGB"
    return Image.frombytes(mode, (pix.width, pix.height), pix.samples).convert("RGB")


def trim_white(img: Image.Image) -> Image.Image:
    """Crop near-white borders (blank stitched tiles), keeping TRIM_PAD px of margin."""
    mask = img.convert("L").point(lambda v: 255 if v < NEAR_WHITE else 0)
    box = mask.getbbox()
    if box is None:
        return img
    x0, y0, x1, y1 = box
    w, h = img.size
    box = (
        max(x0 - TRIM_PAD, 0),
        max(y0 - TRIM_PAD, 0),
        min(x1 + TRIM_PAD, w),
        min(y1 + TRIM_PAD, h),
    )
    return img if box == (0, 0, w, h) else img.crop(box)


def extract_rasters(
    doc: pymupdf.Document, out_dir: Path, trim: bool = True
) -> list[ExtractedImage]:
    """Stitch touching image tiles per page into photos; trim their near-white borders."""
    out_dir.mkdir(parents=True, exist_ok=True)
    result: list[ExtractedImage] = []
    for page in doc:
        items = []
        for info in page.get_image_info(xrefs=True):
            rect = pymupdf.Rect(info["bbox"])
            if not info["xref"] or rect.y0 >= FOOTER_FRACTION * page.rect.height:
                continue
            if info["width"] < MIN_PIXELS or info["height"] < MIN_PIXELS:
                continue
            items.append(
                {"rect": rect, "xref": info["xref"], "w": info["width"], "h": info["height"]}
            )
        for k, group in enumerate(_clusters(items), start=1):
            box = pymupdf.Rect(group[0]["rect"])
            for g in group[1:]:
                box |= g["rect"]
            scale = max(max(g["w"] / g["rect"].width, g["h"] / g["rect"].height) for g in group)
            width, height = round(box.width * scale), round(box.height * scale)
            canvas = Image.new("RGB", (width, height), "white")
            cache: dict[int, Image.Image] = {}
            for g in group:
                if g["xref"] not in cache:
                    cache[g["xref"]] = _tile_image(doc, g["xref"])
                x0 = round((g["rect"].x0 - box.x0) * scale)
                y0 = round((g["rect"].y0 - box.y0) * scale)
                x1 = round((g["rect"].x1 - box.x0) * scale)
                y1 = round((g["rect"].y1 - box.y0) * scale)
                tile = cache[g["xref"]].resize((max(x1 - x0, 1), max(y1 - y0, 1)), Image.LANCZOS)
                canvas.paste(tile, (x0, y0))
            if trim:
                canvas = trim_white(canvas)
            image_id = f"photo-{page.number + 1}-{k}"
            path = out_dir / f"{image_id}.jpg"
            canvas.save(path, quality=90)
            result.append(
                ExtractedImage(image_id, page.number + 1, path, canvas.width, canvas.height)
            )
    return result


def find_drawing_clip(page: pymupdf.Page) -> pymupdf.Rect | None:
    drawings = page.get_drawings()
    if len(drawings) < MIN_DRAWING_OPS:
        return None
    for info in page.get_image_info():
        if info["width"] >= MIN_PIXELS and info["height"] >= MIN_PIXELS:
            return None
    tables = page.find_tables().tables
    limit = min(t.bbox[1] for t in tables) if tables else page.rect.height - 60
    union: pymupdf.Rect | None = None
    for d in drawings:
        r = pymupdf.Rect(d["rect"])
        if r.y0 > HEADER_BOTTOM and r.y1 < limit and page.rect.contains(r):
            union = pymupdf.Rect(r) if union is None else union | r
    if union is None:
        return None
    union.x0, union.y0, union.x1, union.y1 = union.x0 - 4, union.y0 - 4, union.x1 + 4, union.y1 + 4
    return union & page.rect


def _is_word(text: str) -> bool:
    text = text.strip()
    return bool(WORD_RE.search(text)) and not RADIUS_RE.match(text)


def export_drawing(
    doc: pymupdf.Document, page_index: int, clip: pymupdf.Rect, out_svg: Path
) -> list[Label]:
    tmp = pymupdf.open()
    tmp.insert_pdf(doc, from_page=page_index, to_page=page_index)
    page = tmp[0]
    labels: list[Label] = []
    spans = []
    for block in page.get_text("dict", clip=clip)["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                if _is_word(span["text"]):
                    spans.append(span)
    spans.sort(key=lambda s: (s["bbox"][1], s["bbox"][0]))
    for span in spans:
        x0, y0 = span["bbox"][0], span["bbox"][1]
        labels.append(
            Label(
                span["text"].strip(),
                round((x0 - clip.x0) / clip.width * 100, 2),
                round((y0 - clip.y0) / clip.height * 100, 2),
            )
        )
        page.add_redact_annot(pymupdf.Rect(span["bbox"]))
    if spans:
        page.apply_redactions(images=0, graphics=0)
    page.set_cropbox(clip)
    out_svg.parent.mkdir(parents=True, exist_ok=True)
    out_svg.write_text(page.get_svg_image(text_as_path=True), encoding="utf-8")
    tmp.close()
    return labels


def _thumbnail(path: Path) -> Image.Image:
    if path.suffix.lower() == ".svg":
        with pymupdf.open(path) as svg:
            page = svg[0]
            zoom = THUMB_WIDTH / page.rect.width
            pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
            img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    else:
        img = Image.open(path).convert("RGB")
    ratio = THUMB_WIDTH / img.width
    return img.resize((THUMB_WIDTH, max(1, round(img.height * ratio))), Image.LANCZOS)


def contact_sheet(images: list[Path], out: Path) -> None:
    cols, pad, caption = 3, 10, 20
    thumbs = [(p, _thumbnail(p)) for p in images]
    rows = [thumbs[i : i + cols] for i in range(0, len(thumbs), cols)]
    heights = [max(t.height for _, t in row) + caption + pad for row in rows]
    sheet = Image.new("RGB", (cols * (THUMB_WIDTH + pad) + pad, sum(heights) + pad), "white")
    draw = ImageDraw.Draw(sheet)
    y = pad
    for row, height in zip(rows, heights, strict=True):
        for c, (path, thumb) in enumerate(row):
            x = pad + c * (THUMB_WIDTH + pad)
            sheet.paste(thumb, (x, y))
            draw.text((x, y + thumb.height + 4), path.name, fill="black")
        y += height
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
