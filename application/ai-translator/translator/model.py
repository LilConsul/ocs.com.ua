"""Datasheet YAML document model: load, save, validate and walk translatable text."""

from collections.abc import Iterator
from pathlib import Path

import yaml

BLOCK_TYPES: dict[str, tuple[str, ...]] = {
    "lead": ("text",),
    "columns": ("paragraphs",),
    "hero": ("image", "aside"),
    "table": ("title", "rows"),
    "grid": ("title", "header", "rows"),
    "matrix": ("title", "corner", "header", "rows"),
    "drawing": ("image", "clip", "page", "labels"),
    "footnotes": ("items",),
    "note": ("text",),
}


def load_doc(path: Path) -> dict:
    return yaml.safe_load(Path(path).read_text(encoding="utf-8"))


def save_doc(doc: dict, path: Path) -> None:
    text = yaml.safe_dump(doc, allow_unicode=True, sort_keys=False, width=100)
    Path(path).write_text(text, encoding="utf-8")


def flat_blocks(doc: dict) -> list[dict]:
    return [block for page in doc.get("pages", []) for block in page.get("blocks", [])]


def validate(doc: object) -> list[str]:
    if not isinstance(doc, dict):
        return ["document is not a mapping"]
    errors: list[str] = []
    if not isinstance(doc.get("product"), dict):
        errors.append("product: missing")
    if not isinstance(doc.get("pages"), list):
        errors.append("pages: missing")
        return errors
    pages_ok = True
    for i, page in enumerate(doc["pages"]):
        if not isinstance(page, dict):
            errors.append(f"page[{i}]: not a mapping")
            pages_ok = False
        elif not isinstance(page.get("blocks", []), list):
            errors.append(f"page[{i}].blocks: not a list")
            pages_ok = False
    if not pages_ok:
        return errors
    for n, block in enumerate(flat_blocks(doc)):
        if not isinstance(block, dict):
            errors.append(f"block[{n}]: not a mapping")
            continue
        kind = block.get("type")
        if kind not in BLOCK_TYPES:
            errors.append(f"block[{n}]: unknown type {kind!r}")
            continue
        errors.extend(
            f"block[{n}].{key}: missing for type {kind}"
            for key in BLOCK_TYPES[kind]
            if key not in block
        )
    return errors


def shape(block: dict) -> tuple:
    """Block type plus the list lengths that translation must preserve."""
    kind = block.get("type")
    if kind == "lead" or kind == "note":
        return (kind,)
    if kind == "columns":
        return (kind, len(block.get("paragraphs", [])))
    if kind == "hero":
        return (
            kind,
            len(block.get("aside", [])),
            *(len(a.get("items", [])) for a in block.get("aside", [])),
        )
    if kind == "table":
        return (kind, len(block.get("rows", [])))
    if kind == "grid":
        return (kind, len(block.get("header", [])), len(block.get("rows", [])))
    if kind == "matrix":
        rows = block.get("rows", [])
        return (
            kind,
            len(block.get("header", [])),
            len(rows),
            *(len(r.get("cells", [])) for r in rows),
        )
    if kind == "drawing":
        return (kind, len(block.get("labels", [])))
    if kind == "footnotes":
        return (kind, len(block.get("items", [])))
    return (kind,)


def _block_text(n: int, block: dict) -> Iterator[tuple[str, str]]:
    p = f"block[{n}]"
    kind = block.get("type")
    if kind in ("lead", "note"):
        yield f"{p}.text", block["text"]
    elif kind == "columns":
        for i, text in enumerate(block["paragraphs"]):
            yield f"{p}.paragraphs[{i}]", text
    elif kind == "hero":
        for k, box in enumerate(block["aside"]):
            yield f"{p}.aside[{k}].title", box["title"]
            for i, text in enumerate(box["items"]):
                yield f"{p}.aside[{k}].items[{i}]", text
    elif kind == "table":
        yield f"{p}.title", block["title"]
        for r, row in enumerate(block["rows"]):
            yield f"{p}.rows[{r}].label", row["label"]
            yield f"{p}.rows[{r}].value", row["value"]
    elif kind == "grid":
        yield f"{p}.title", block["title"]
        for c, text in enumerate(block["header"]):
            yield f"{p}.header[{c}]", text
        for r, row in enumerate(block["rows"]):
            for c, text in enumerate(row):
                yield f"{p}.rows[{r}][{c}]", text
    elif kind == "matrix":
        yield f"{p}.title", block["title"]
        yield f"{p}.corner", block["corner"]
        for c, text in enumerate(block["header"]):
            yield f"{p}.header[{c}]", text
        for r, row in enumerate(block["rows"]):
            yield f"{p}.rows[{r}].label", row["label"]
    elif kind == "drawing":
        for i, label in enumerate(block["labels"]):
            yield f"{p}.labels[{i}].text", label["text"]
    elif kind == "footnotes":
        for i, text in enumerate(block["items"]):
            yield f"{p}.items[{i}]", text


def iter_text(doc: dict) -> Iterator[tuple[str, str]]:
    """Yield (path, text) for every translatable string, blocks indexed across pages."""
    product = doc.get("product", {})
    if product.get("category"):
        yield "product.category", product["category"]
    for i, page in enumerate(doc.get("pages", [])):
        for j, text in enumerate(page.get("title", [])):
            yield f"page[{i}].title[{j}]", text
    for n, block in enumerate(flat_blocks(doc)):
        yield from _block_text(n, block)
