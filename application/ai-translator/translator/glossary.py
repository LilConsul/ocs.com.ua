from dataclasses import dataclass
from pathlib import Path

COLUMNS = 5


class GlossaryError(ValueError):
    pass


@dataclass(frozen=True)
class Term:
    en: str
    ua: str
    avoid: tuple[str, ...]
    note: str
    status: str


@dataclass
class Glossary:
    terms: list[Term]
    style_rules: str


def _is_separator(cells: list[str]) -> bool:
    return all(c and set(c) <= set("-: ") for c in cells)


def load_glossary(path: Path) -> Glossary:
    terms: list[Term] = []
    style: list[str] = []
    section = ""
    header_seen = False
    for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if line.startswith("## "):
            section = line[3:].strip().lower()
            header_seen = False
            continue
        if section == "style rules":
            style.append(line)
        elif section == "terms" and line.lstrip().startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) != COLUMNS:
                raise GlossaryError(
                    f"{path}: line {lineno}: expected {COLUMNS} columns, got {len(cells)}"
                )
            if not header_seen:
                header_seen = True
                continue
            if _is_separator(cells):
                continue
            en, ua, avoid, note, status = cells
            terms.append(
                Term(en, ua, tuple(a.strip() for a in avoid.split(";") if a.strip()), note, status)
            )
    return Glossary(terms, "\n".join(style).strip())
