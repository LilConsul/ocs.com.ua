"""Lint a Ukrainian datasheet against its English source, the glossary and the render report."""

import hashlib
import json
import re
from collections import Counter
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import pymupdf
import yaml

from translator.config import SourceConfig, is_branding, load_config
from translator.extract.structure import is_branding_page
from translator.glossary import Glossary, GlossaryError, load_glossary
from translator.model import COVER_FACTS, flat_blocks, iter_text, load_doc, shape, validate
from translator.paths import DatasheetPaths
from translator.text import all_numbers, footnote_marks, number_style_errors, numbers

_LATIN_WORD = re.compile(r"[A-Za-z][A-Za-z/-]+")


@dataclass(frozen=True)
class Issue:
    level: Literal["error", "warning"]
    path: str
    message: str


def _stems(ua: str) -> list[str]:
    return [w.lower()[: max(3, len(w) - 2)] for w in ua.split()]


def _latin_words(text: str, cfg: SourceConfig) -> list[str]:
    found = []
    for token in text.split():
        for word in _LATIN_WORD.findall(token):
            if word.isupper() or word in cfg.never_translate or token in cfg.never_translate:
                continue
            found.append(word)
    return found


def _diff(counts: dict) -> str:
    return ", ".join(f"{k} x{v}" for k, v in sorted(counts.items()))


def _facts(block: dict) -> Iterator[tuple[str, object]]:
    """Non-text values a translation must keep as they are, by path below the block."""
    kind = block.get("type")
    if kind in ("hero", "drawing"):
        yield "image", block.get("image")
    if kind == "drawing":
        yield "clip", block.get("clip")
        yield "page", block.get("page")
    if kind == "table":
        for r, row in enumerate(block.get("rows", [])):
            yield f"rows[{r}].note", row.get("note")
    if kind == "matrix":
        for r, row in enumerate(block.get("rows", [])):
            yield f"rows[{r}].cells", row.get("cells")


def _structure(en: dict, ua: dict) -> list[Issue]:
    issues = [
        Issue("error", f"product.{key}", f"{key} {ua_value!r} differs from en {en_value!r}")
        for key in ("model", "variant")
        if (en_value := en["product"].get(key, "")) != (ua_value := ua["product"].get(key, ""))
    ]
    for key, what in (("cover", "cover page"), ("notes", "personal-notes page")):
        if (key in en) != (key in ua):
            where = "en.yaml" if key in en else "ua.yaml"
            issues.append(Issue("error", key, f"{what} present only in {where}"))
    if "cover" in en and "cover" in ua:
        issues.extend(
            Issue("error", f"cover.{key}", f"{ua_value!r} differs from en {en_value!r}")
            for key in COVER_FACTS
            if (en_value := en["cover"].get(key)) != (ua_value := ua["cover"].get(key))
        )
    en_blocks, ua_blocks = flat_blocks(en), flat_blocks(ua)
    if len(en_blocks) != len(ua_blocks):
        issues.append(
            Issue(
                "error", "blocks", f"block count {len(ua_blocks)} differs from en {len(en_blocks)}"
            )
        )
        return issues
    for n, (e, u) in enumerate(zip(en_blocks, ua_blocks, strict=True)):
        if shape(e) != shape(u):
            issues.append(
                Issue("error", f"block[{n}]", f"shape {shape(u)} differs from en {shape(e)}")
            )
            continue
        issues.extend(
            Issue("error", f"block[{n}].{sub}", f"{ua_value!r} differs from en {en_value!r}")
            for (sub, en_value), (_, ua_value) in zip(_facts(e), _facts(u), strict=True)
            if en_value != ua_value
        )
    return issues


def _en_numbers(en: dict) -> Iterator[tuple[str, Counter[str]]]:
    """Every number en.yaml states, by path: text, product model and variant, row notes."""
    for key in ("model", "variant"):
        yield f"product.{key}", all_numbers(str(en["product"].get(key) or ""))
    for path, text in iter_text(en):
        if ".labels[" not in path:  # drawing labels sit inside the clip the source check skips
            yield path, all_numbers(text)
    for n, block in enumerate(flat_blocks(en)):
        if block.get("type") == "table":
            for r, row in enumerate(block.get("rows", [])):
                if row.get("note") is not None:
                    yield f"block[{n}].rows[{r}].note", Counter({str(row["note"]): 1})


def _source_check(en: dict, source: Counter[str]) -> list[Issue]:
    found = list(_en_numbers(en))
    total: Counter[str] = Counter()
    for _, counts in found:
        total += counts
    issues = []
    for number, count in sorted((total - source).items()):
        where = next(path for path, counts in found if counts[number])
        issues.append(
            Issue("error", f"en.{where}", f"number {number} x{count} not in the source PDF")
        )
    missing = source - total
    if missing:
        issues.append(
            Issue("warning", "source", f"source PDF numbers missing from en.yaml: {_diff(missing)}")
        )
    return issues


def _is_rect(value: object) -> bool:
    return (
        isinstance(value, list)
        and len(value) == 4
        and all(isinstance(v, int | float) for v in value)
    )


def source_numbers(pdf: Path, en: dict, cfg: SourceConfig) -> Counter[str]:
    """Numbers in the source PDF text, without branding lines, drawing dimensions inside the
    en.yaml drawing clips and pages that extract skips (the "Personal notes" page)."""
    clips: dict[int, list[pymupdf.Rect]] = {}
    for block in flat_blocks(en):
        clip, page = block.get("clip"), block.get("page")
        if block.get("type") == "drawing" and isinstance(page, int) and _is_rect(clip):
            clips.setdefault(page, []).append(pymupdf.Rect(clip))
    found: Counter[str] = Counter()
    with pymupdf.open(pdf) as document:
        for page in document:
            if is_branding_page(page, cfg):
                continue
            drawing = clips.get(page.number + 1, [])
            for block in page.get_text("dict")["blocks"]:
                for line in block.get("lines", []):
                    text = "".join(span["text"] for span in line["spans"])
                    x0, y0, x1, y1 = line["bbox"]
                    centre = pymupdf.Point((x0 + x1) / 2, (y0 + y1) / 2)
                    if is_branding(text, cfg) or any(r.contains(centre) for r in drawing):
                        continue
                    found += all_numbers(text)
    return found


def lint(
    en: dict,
    ua: dict,
    glossary: Glossary,
    cfg: SourceConfig,
    report: dict | None,
    pdf_text: str | None,
    *,
    ua_sha256: str | None = None,
    source_numbers: Counter[str] | None = None,
) -> list[Issue]:
    """Check ua against en. pdf_text None means the output PDF is missing; ua_sha256 (the hash
    of the ua.yaml file) is compared with the render report; source_numbers, the numbers of the
    source PDF, are compared with en."""
    issues: list[Issue] = []
    invalid = False
    for label, doc in (("en", en), ("ua", ua)):
        for message in validate(doc):
            invalid = True
            issues.append(Issue("error", label, f"invalid {label}.yaml: {message}"))
    if isinstance(ua, dict) and ua.get("lang") != "ua":
        issues.append(Issue("error", "lang", f"lang is {ua.get('lang')!r}, expected 'ua'"))
    if not invalid:
        if not str(ua.get("product", {}).get("category", "")).strip():
            issues.append(Issue("error", "product.category", "category is empty"))
        structure = _structure(en, ua)
        issues.extend(structure)
        count_ok = len(flat_blocks(en)) == len(flat_blocks(ua))
        bad = {i.path for i in structure} if count_ok else None
        issues.extend(_text_rules(en, ua, glossary, cfg, bad))
        if source_numbers is not None:
            issues.extend(_source_check(en, source_numbers))
    for line in (pdf_text or "").splitlines():
        if is_branding(line, cfg):
            issues.append(Issue("error", "pdf", f"branding in output PDF: {line.strip()!r}"))
    if report is None:
        issues.append(Issue("error", "render", "no render report: run render first"))
    elif pdf_text is None:
        issues.append(Issue("error", "render", "stale render: run render (output PDF missing)"))
    elif ua_sha256 is not None and report.get("ua_sha256") != ua_sha256:
        issues.append(Issue("error", "render", "stale render: run render (ua.yaml changed)"))
    else:
        issues.extend(
            Issue(
                "error",
                str(o.get("path")),
                f"overflow on page {o['page']}: +{o['dx']:g}/+{o['dy']:g} px",
            )
            for o in report.get("overflow", [])
        )
    return issues


def _text_rules(
    en: dict, ua: dict, glossary: Glossary, cfg: SourceConfig, bad_blocks: set[str] | None
) -> list[Issue]:
    issues: list[Issue] = []
    en_text = dict(iter_text(en))
    if len(en["pages"]) != len(ua["pages"]):
        # Repaginated: page[i] no longer pairs with en's page[i], so titles are not compared.
        en_text = {p: t for p, t in en_text.items() if not p.startswith("page[")}
    for path, text in iter_text(ua):
        low = text.lower()
        for term in glossary.terms:
            issues.extend(
                Issue("error", path, f"avoid {fragment!r} (use {term.ua!r})")
                for fragment in term.avoid
                if fragment.lower() in low
            )
        issues.extend(
            Issue("error", path, f"decimal comma or style: {bad!r}")
            for bad in number_style_errors(text)
        )
        if is_branding(text, cfg):
            issues.append(Issue("error", path, f"branding in text: {text!r}"))
        issues.extend(
            Issue("warning", path, f"untranslated Latin word {word!r}")
            for word in _latin_words(text, cfg)
        )
        source = en_text.get(path)
        if source is None:
            continue
        if bad_blocks is not None and path.split(".")[0] not in bad_blocks:
            for kind, count in (("numbers", numbers), ("footnote marks", footnote_marks)):
                n_en, n_ua = count(source), count(text)
                if n_en != n_ua:
                    missing, extra = n_en - n_ua, n_ua - n_en
                    issues.append(
                        Issue(
                            "error",
                            path,
                            f"{kind} differ: missing [{_diff(missing)}], extra [{_diff(extra)}]",
                        )
                    )
        for term in glossary.terms:
            if term.en.lower() in source.lower() and not all(
                stem in low for stem in _stems(term.ua)
            ):
                issues.append(
                    Issue("warning", path, f"glossary term {term.en!r} not rendered as {term.ua!r}")
                )
    return issues


def _pdf_text(pdf: Path) -> str:
    with pymupdf.open(pdf) as document:
        return "\n".join(page.get_text() for page in document)


def run_lint(paths: DatasheetPaths) -> int:
    def fail(where: str, message: str) -> int:
        print(f"{paths.ua_yaml}:{where}: error: {message}")
        return 1

    glossary_path = paths.root / "glossary.md"
    if not glossary_path.exists():
        return fail("glossary", f"glossary.md not found at {glossary_path}")
    try:
        glossary = load_glossary(glossary_path)
    except GlossaryError as err:
        return fail("glossary", str(err))
    docs = {}
    for label, path in (("en", paths.en_yaml), ("ua", paths.ua_yaml)):
        try:
            docs[label] = load_doc(path)
        except yaml.YAMLError as err:
            return fail(label, f"{label}.yaml is not valid YAML: {' '.join(str(err).split())}")
    if not paths.source_pdf.exists():
        return fail("source", f"source PDF not found at {paths.source_pdf}")
    cfg = load_config()
    report = None
    if paths.render_report.exists():
        report = json.loads(paths.render_report.read_text(encoding="utf-8"))
    pdf_text = _pdf_text(paths.output_pdf) if paths.output_pdf.exists() else None
    source = None
    if not validate(docs["en"]):
        source = source_numbers(paths.source_pdf, docs["en"], cfg)
    issues = lint(
        docs["en"],
        docs["ua"],
        glossary,
        cfg,
        report,
        pdf_text,
        ua_sha256=hashlib.sha256(paths.ua_yaml.read_bytes()).hexdigest(),
        source_numbers=source,
    )
    for issue in issues:
        print(f"{paths.ua_yaml}:{issue.path}: {issue.level}: {issue.message}")
    return 1 if any(i.level == "error" for i in issues) else 0
