"""Lint a Ukrainian datasheet against its English source, the glossary and the render report."""

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import pymupdf

from translator.config import SourceConfig, is_branding, load_config
from translator.glossary import Glossary, load_glossary
from translator.model import flat_blocks, iter_text, load_doc, shape, validate
from translator.paths import DatasheetPaths
from translator.text import number_style_errors, numbers

_LATIN_WORD = re.compile(r"[A-Za-z][A-Za-z/-]+")


@dataclass(frozen=True)
class Issue:
    level: Literal["error", "warning"]
    path: str
    message: str


def _stems(ua: str) -> list[str]:
    return [w.lower()[: max(4, len(w) - 2)] for w in ua.split()]


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


def _structure(en: dict, ua: dict) -> list[Issue]:
    en_blocks, ua_blocks = flat_blocks(en), flat_blocks(ua)
    if len(en_blocks) != len(ua_blocks):
        return [
            Issue(
                "error", "blocks", f"block count {len(ua_blocks)} differs from en {len(en_blocks)}"
            )
        ]
    return [
        Issue("error", f"block[{n}]", f"shape {shape(u)} differs from en {shape(e)}")
        for n, (e, u) in enumerate(zip(en_blocks, ua_blocks, strict=True))
        if shape(e) != shape(u)
    ]


def lint(
    en: dict,
    ua: dict,
    glossary: Glossary,
    cfg: SourceConfig,
    report: dict | None,
    pdf_text: str | None,
) -> list[Issue]:
    issues: list[Issue] = []
    invalid = False
    for label, doc in (("en", en), ("ua", ua)):
        for message in validate(doc):
            invalid = True
            issues.append(Issue("error", label, f"invalid {label}.yaml: {message}"))
    if ua.get("lang") != "ua":
        issues.append(Issue("error", "lang", f"lang is {ua.get('lang')!r}, expected 'ua'"))
    if not invalid:
        if not str(ua.get("product", {}).get("category", "")).strip():
            issues.append(Issue("error", "product.category", "category is empty"))
        structure = _structure(en, ua)
        issues.extend(structure)
        count_ok = len(flat_blocks(en)) == len(flat_blocks(ua))
        bad = {i.path for i in structure} if count_ok else None
        issues.extend(_text_rules(en, ua, glossary, cfg, bad))
    for line in (pdf_text or "").splitlines():
        if is_branding(line, cfg):
            issues.append(Issue("error", "pdf", f"branding in output PDF: {line.strip()!r}"))
    if report is None:
        issues.append(Issue("error", "render", "no render report: run render first"))
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
            n_en, n_ua = numbers(source), numbers(text)
            if n_en != n_ua:
                missing, extra = n_en - n_ua, n_ua - n_en
                issues.append(
                    Issue(
                        "error",
                        path,
                        f"numbers differ: missing [{_diff(missing)}], extra [{_diff(extra)}]",
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
    glossary_path = paths.root / "glossary.md"
    if not glossary_path.exists():
        print(f"{paths.ua_yaml}:glossary: error: glossary.md not found at {glossary_path}")
        return 1
    glossary = load_glossary(glossary_path)
    report = None
    if paths.render_report.exists():
        report = json.loads(paths.render_report.read_text(encoding="utf-8"))
    pdf_text = _pdf_text(paths.output_pdf) if paths.output_pdf.exists() else None
    issues = lint(
        load_doc(paths.en_yaml),
        load_doc(paths.ua_yaml),
        glossary,
        load_config(),
        report,
        pdf_text,
    )
    for issue in issues:
        print(f"{paths.ua_yaml}:{issue.path}: {issue.level}: {issue.message}")
    return 1 if any(i.level == "error" for i in issues) else 0
