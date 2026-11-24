import pytest

from translator.glossary import GlossaryError, Term, load_glossary
from translator.paths import ROOT

GLOSSARY = """# Glossary

## Terms

| EN | UA | Avoid | Note | Status |
|----|----|-------|------|--------|
| checkweigher | контрольні ваги | чеквейєр; чекувач | | draft |
| tamper-evident | Захист від першого розкриття | розитну | site | ok |

## Style rules

- Decimal point: 0.01 г
"""


def test_load_glossary(tmp_path):
    p = tmp_path / "g.md"
    p.write_text(GLOSSARY, encoding="utf-8")
    g = load_glossary(p)
    assert g.terms[0] == Term(
        "checkweigher", "контрольні ваги", ("чеквейєр", "чекувач"), "", "draft"
    )
    assert g.terms[1].status == "ok"
    assert "Decimal point" in g.style_rules


def test_load_glossary_rejects_bad_row(tmp_path):
    p = tmp_path / "g.md"
    p.write_text(GLOSSARY.replace("| site | ok |", "| ok |"), encoding="utf-8")
    with pytest.raises(GlossaryError, match="line 8"):
        load_glossary(p)


def test_repo_glossary_is_valid_draft():
    g = load_glossary(ROOT / "glossary.md")
    assert len(g.terms) >= 25
    assert {t.status for t in g.terms} <= {"draft", "ok"}
    assert "decimal point" in g.style_rules.lower()


def test_repo_glossary_avoid_fragments_never_hit_ua_cells():
    terms = load_glossary(ROOT / "glossary.md").terms
    hits = [
        (fragment, term.ua)
        for fragment in (a.lower() for t in terms for a in t.avoid)
        for term in terms
        if fragment in term.ua.lower()
    ]
    assert hits == []
