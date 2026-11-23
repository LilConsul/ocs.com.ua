"""Extraction pipeline: source PDF to draft en.yaml, images, contact sheet and previews."""

from pathlib import Path

import pymupdf

from translator.config import SourceConfig
from translator.extract.images import (
    ExtractedImage,
    contact_sheet,
    export_drawing,
    extract_rasters,
    find_drawing_clip,
)
from translator.extract.structure import Drawings, build_draft
from translator.model import flat_blocks, save_doc, validate
from translator.paths import DatasheetPaths

PREVIEW_DPI = 80


def collect_media(doc: pymupdf.Document, images_dir: Path) -> tuple[list[ExtractedImage], Drawings]:
    """Extract photos and vector drawings; drawings are keyed by 0-based page index."""
    images = extract_rasters(doc, images_dir)
    drawings: Drawings = {}
    for page in doc:
        clip = find_drawing_clip(page)
        if clip is None:
            continue
        name = f"drawing-{page.number + 1}.svg"
        labels = export_drawing(doc, page.number, clip, images_dir / name)
        drawings[page.number] = (f"images/{name}", clip, labels)
    return images, drawings


def _source_path(paths: DatasheetPaths) -> str:
    return f"files/en/{paths.source_pdf.name}"


def run_extract(paths: DatasheetPaths, cfg: SourceConfig, force: bool = False) -> list[str]:
    """Write en.yaml, images/, contact-sheet.png and preview-en/. Returns warnings."""
    if not paths.source_pdf.exists():
        raise FileNotFoundError(f"source PDF not found: {paths.source_pdf}")
    if paths.en_yaml.exists() and not force:
        raise FileExistsError(f"{paths.en_yaml} exists; pass --force to overwrite it")
    paths.work_dir.mkdir(parents=True, exist_ok=True)
    warnings: list[str] = []
    with pymupdf.open(paths.source_pdf) as doc:
        images, drawings = collect_media(doc, paths.images_dir)
        draft = build_draft(doc, cfg, images, drawings, _source_path(paths))
        paths.source_preview_dir.mkdir(parents=True, exist_ok=True)
        for page in doc:
            pix = page.get_pixmap(dpi=PREVIEW_DPI)
            pix.save(paths.source_preview_dir / f"page-{page.number + 1}.png")
    media = [im.path for im in images] + [paths.work_dir / d[0] for d in drawings.values()]
    if media:
        contact_sheet(media, paths.contact_sheet)
    else:
        warnings.append("no photos or drawings found")
    if not draft["product"]["model"]:
        warnings.append("product.model not found in the page header")
    for i, page in enumerate(draft["pages"]):
        if not page["blocks"]:
            warnings.append(f"page[{i}] has no blocks")
    warnings.extend(validate(draft))
    save_doc(draft, paths.en_yaml)
    return warnings


def redo_drawing(paths: DatasheetPaths, doc_yaml: dict, page_no: int, clip: pymupdf.Rect) -> dict:
    """Re-export the drawing on 1-based page `page_no` and update its block in place."""
    block = next(
        (b for b in flat_blocks(doc_yaml) if b["type"] == "drawing" and b["page"] == page_no),
        None,
    )
    if block is None:
        raise LookupError(f"no drawing block for page {page_no} in {paths.en_yaml}")
    name = f"drawing-{page_no}.svg"
    with pymupdf.open(paths.source_pdf) as doc:
        labels = export_drawing(doc, page_no - 1, clip, paths.images_dir / name)
    block["image"] = f"images/{name}"
    block["clip"] = [round(v, 1) for v in clip]
    block["labels"] = [{"text": lb.text, "x": lb.x, "y": lb.y} for lb in labels]
    return doc_yaml
