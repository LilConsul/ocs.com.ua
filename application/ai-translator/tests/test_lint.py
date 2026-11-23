import copy
import hashlib
import json
import re
from collections import Counter

import pymupdf
import pytest

from translator.cli import main
from translator.config import SourceConfig
from translator.glossary import Glossary, Term
from translator.lint import lint
from translator.model import save_doc
from translator.paths import paths_for

OK_REPORT = {"pages": 2, "overflow": []}


@pytest.fixture
def cfg():
    return SourceConfig(
        branding=(re.compile(r"wipotec(-ocs)?\.com", re.IGNORECASE),),
        never_translate=frozenset({"WIPOTEC", "Profibus"}),
    )


@pytest.fixture
def glossary():
    return Glossary(
        [Term("checkweigher", "контрольні ваги", ("розитну",), "", "approved")],
        "",
    )


@pytest.fixture
def ok_report():
    return copy.deepcopy(OK_REPORT)


@pytest.fixture
def en():
    return {
        "lang": "en",
        "product": {"model": "HC-A", "category": "Checkweigher"},
        "pages": [
            {
                "title": ["Technical", "data"],
                "blocks": [
                    {
                        "type": "table",
                        "title": "Basic **data**",
                        "rows": [{"label": "Weight", "value": "750 g"}],
                    },
                    {"type": "note", "text": "The checkweigher uses Profibus."},
                ],
            },
            {"title": ["More"], "blocks": [{"type": "lead", "text": "Fast, 2 lanes"}]},
        ],
    }


@pytest.fixture
def ua():
    return {
        "lang": "ua",
        "product": {"model": "HC-A", "category": "Контрольні ваги"},
        "pages": [
            {
                "title": ["Технічні", "дані"],
                "blocks": [
                    {
                        "type": "table",
                        "title": "Основні **дані**",
                        "rows": [{"label": "Вага", "value": "750 г"}],
                    },
                    {"type": "note", "text": "Контрольні ваги працюють з Profibus."},
                ],
            },
            {"title": ["Ще"], "blocks": [{"type": "lead", "text": "Швидко, 2 доріжки"}]},
        ],
    }


def errors(issues):
    return [i for i in issues if i.level == "error"]


def test_clean_pair_has_no_issues(en, ua, glossary, cfg, ok_report):
    assert lint(en, ua, glossary, cfg, ok_report, "ОС-Технолоджи") == []


def test_invalid_ua_reports_instead_of_crashing(en, ua, glossary, cfg, ok_report):
    del ua["pages"][0]["blocks"][0]["rows"]
    issues = lint(en, ua, glossary, cfg, ok_report, "")
    assert [i.path for i in errors(issues)] == ["ua"]


def test_wrong_lang_and_empty_category(en, ua, glossary, cfg, ok_report):
    ua["lang"] = "en"
    ua["product"]["category"] = ""
    paths = [i.path for i in errors(lint(en, ua, glossary, cfg, ok_report, ""))]
    assert paths == ["lang", "product.category"]


def test_block_count_and_shape_mismatch(en, ua, glossary, cfg, ok_report):
    ua["pages"][0]["blocks"][0]["rows"].append({"label": "x", "value": "1"})
    assert [i.path for i in errors(lint(en, ua, glossary, cfg, ok_report, ""))] == ["block[0]"]
    ua["pages"][1]["blocks"].pop()
    assert [i.path for i in errors(lint(en, ua, glossary, cfg, ok_report, ""))] == ["blocks"]


def test_changed_number_is_error(en, ua, glossary, cfg, ok_report):
    ua["pages"][0]["blocks"][0]["rows"][0]["value"] = "75 г"
    found = errors(lint(en, ua, glossary, cfg, ok_report, ""))
    assert [i.path for i in found] == ["block[0].rows[0].value"]


def test_legit_number_changes_pass(en, ua, glossary, cfg, ok_report):
    en["pages"][0]["blocks"][0]["rows"][0]["value"] = '4,000 g; 15" display, 100-240 VAC'
    ua["pages"][0]["blocks"][0]["rows"][0]["value"] = "4000 г; 15-дюймовий дисплей, 100-240 VAC"
    assert lint(en, ua, glossary, cfg, ok_report, "") == []


def test_avoid_fragment_matches_inflected_form(en, ua, glossary, cfg, ok_report):
    ua["pages"][0]["blocks"][1]["text"] = "Контрольні ваги Розитнуті з Profibus."
    found = errors(lint(en, ua, glossary, cfg, ok_report, ""))
    assert [i.path for i in found] == ["block[1].text"]


def test_decimal_comma_is_error(en, ua, glossary, cfg, ok_report):
    en["pages"][0]["blocks"][0]["rows"][0]["value"] = "0.5 g"
    ua["pages"][0]["blocks"][0]["rows"][0]["value"] = "0,5 г"
    found = errors(lint(en, ua, glossary, cfg, ok_report, ""))
    assert {i.path for i in found} == {"block[0].rows[0].value"}


def test_branding_in_pdf_text_is_error(en, ua, glossary, cfg, ok_report):
    found = errors(lint(en, ua, glossary, cfg, ok_report, "ok\nwww.wipotec-ocs.com\n"))
    assert [i.path for i in found] == ["pdf"]


def test_branding_in_ua_text_is_error(en, ua, glossary, cfg, ok_report):
    ua["pages"][0]["blocks"][1]["text"] = "Контрольні ваги, wipotec.com"
    assert errors(lint(en, ua, glossary, cfg, ok_report, ""))


def test_missing_report_and_overflow_are_errors(en, ua, glossary, cfg):
    assert [i.path for i in errors(lint(en, ua, glossary, cfg, None, ""))] == ["render"]
    report = {"pages": 2, "overflow": [{"page": 1, "path": "block[1].text", "dx": 0, "dy": 9}]}
    assert [i.path for i in errors(lint(en, ua, glossary, cfg, report, ""))] == ["block[1].text"]


def test_repaginated_ua_passes_structure(en, ua, glossary, cfg, ok_report):
    ua["pages"].append({"title": ["Ще"], "blocks": [ua["pages"][1]["blocks"].pop()]})
    ua["pages"][1]["blocks"] = []
    ua["pages"][1], ua["pages"][2] = ua["pages"][2], ua["pages"][1]
    assert lint(en, ua, glossary, cfg, ok_report, "") == []


def test_latin_word_warning_respects_allowlist(en, ua, glossary, cfg, ok_report):
    ua["pages"][0]["blocks"][1]["text"] = "Контрольні ваги conveyor з Profibus."
    issues = lint(en, ua, glossary, cfg, ok_report, "")
    assert [(i.level, i.path) for i in issues] == [("warning", "block[1].text")]
    assert "conveyor" in issues[0].message


def test_glossary_term_missing_warns_not_errors(en, ua, glossary, cfg, ok_report):
    ua["pages"][0]["blocks"][1]["text"] = "Прилад працює з Profibus."
    issues = lint(en, ua, glossary, cfg, ok_report, "")
    assert [(i.level, i.path) for i in issues] == [("warning", "block[1].text")]


def test_cli_lint_requires_yaml(tmp_path, capsys):
    assert main(["lint", "nope", "--root", str(tmp_path)]) == 1
    assert "not found" in capsys.readouterr().err


def test_cli_all_returns_one_when_render_fails(tmp_path):
    assert main(["all", "nope", "--root", str(tmp_path)]) == 1


def test_shape_error_does_not_hide_number_error_elsewhere(en, ua, glossary, cfg, ok_report):
    ua["pages"][0]["blocks"][0]["rows"].append({"label": "x", "value": "1"})
    ua["pages"][1]["blocks"][0]["text"] = "Швидко, 3 доріжки"
    found = errors(lint(en, ua, glossary, cfg, ok_report, ""))
    assert [i.path for i in found] == ["block[0]", "block[2].text"]


def test_latin_word_next_to_digits_still_warns(en, ua, glossary, cfg, ok_report):
    en["pages"][0]["blocks"][1]["text"] = 'The checkweigher has a 15" display.'
    ua["pages"][0]["blocks"][1]["text"] = "Контрольні ваги мають 15-inch дисплей."
    issues = lint(en, ua, glossary, cfg, ok_report, "")
    assert [(i.level, i.path) for i in issues] == [("warning", "block[1].text")]
    assert "inch" in issues[0].message


MATRIX = {
    "type": "matrix",
    "title": "Sizes",
    "corner": "w l",
    "header": ["120 mm", "150 mm"],
    "rows": [{"label": "200 mm", "cells": ["x", "-"]}],
}
HERO = {"type": "hero", "image": "images/photo-1.jpg", "aside": []}
DRAWING = {
    "type": "drawing",
    "image": "images/drawing-3.svg",
    "clip": [0.0, 0.0, 400.0, 250.0],
    "page": 3,
    "labels": [{"text": "flow", "x": 5.0, "y": 10.0}],
}


def add_blocks(en, ua, *blocks):
    """Append copies of blocks to the last page of both documents (flat index 3 onwards)."""
    for doc in (en, ua):
        doc["pages"][-1]["blocks"].extend(copy.deepcopy(b) for b in blocks)


def error_paths(issues):
    return [i.path for i in errors(issues)]


def test_matrix_cells_must_match(en, ua, glossary, cfg, ok_report):
    add_blocks(en, ua, MATRIX)
    ua["pages"][1]["blocks"][1]["title"] = "Розміри"
    ua["pages"][1]["blocks"][1]["corner"] = "ш д"
    ua["pages"][1]["blocks"][1]["header"] = ["120 мм", "150 мм"]
    ua["pages"][1]["blocks"][1]["rows"][0]["label"] = "200 мм"
    assert lint(en, ua, glossary, cfg, ok_report, "") == []
    ua["pages"][1]["blocks"][1]["rows"][0]["cells"] = ["-", "x"]
    assert error_paths(lint(en, ua, glossary, cfg, ok_report, "")) == ["block[3].rows[0].cells"]


def test_table_row_note_must_match(en, ua, glossary, cfg, ok_report):
    en["pages"][0]["blocks"][0]["rows"][0]["note"] = 1
    ua["pages"][0]["blocks"][0]["rows"][0]["note"] = 1
    assert lint(en, ua, glossary, cfg, ok_report, "") == []
    ua["pages"][0]["blocks"][0]["rows"][0]["note"] = 2
    assert error_paths(lint(en, ua, glossary, cfg, ok_report, "")) == ["block[0].rows[0].note"]
    del ua["pages"][0]["blocks"][0]["rows"][0]["note"]
    assert error_paths(lint(en, ua, glossary, cfg, ok_report, "")) == ["block[0].rows[0].note"]


def test_product_model_and_variant_must_match(en, ua, glossary, cfg, ok_report):
    en["product"]["variant"] = "BASIS"
    ua["product"]["variant"] = "BASIS"
    ua["product"]["model"] = "HC-B"
    assert error_paths(lint(en, ua, glossary, cfg, ok_report, "")) == ["product.model"]
    ua["product"]["model"] = "HC-A"
    ua["product"]["variant"] = "PRO"
    assert error_paths(lint(en, ua, glossary, cfg, ok_report, "")) == ["product.variant"]


def test_hero_and_drawing_media_must_match(en, ua, glossary, cfg, ok_report):
    add_blocks(en, ua, HERO, DRAWING)
    ua["pages"][1]["blocks"][2]["labels"][0]["text"] = "потік"
    ua["pages"][1]["blocks"][2]["labels"][0]["x"] = 30.0  # label position stays free
    assert lint(en, ua, glossary, cfg, ok_report, "") == []
    ua["pages"][1]["blocks"][1]["image"] = "images/photo-2.jpg"
    ua["pages"][1]["blocks"][2]["image"] = "images/drawing-4.svg"
    ua["pages"][1]["blocks"][2]["clip"] = [0.0, 0.0, 300.0, 250.0]
    ua["pages"][1]["blocks"][2]["page"] = 4
    assert error_paths(lint(en, ua, glossary, cfg, ok_report, "")) == [
        "block[3].image",
        "block[4].image",
        "block[4].clip",
        "block[4].page",
    ]


def test_changed_footnote_mark_is_error(en, ua, glossary, cfg, ok_report):
    en["pages"][0]["blocks"][0]["rows"][0]["value"] = "750 g, up to 5)"
    ua["pages"][0]["blocks"][0]["rows"][0]["value"] = "750 г, до 5)"
    assert lint(en, ua, glossary, cfg, ok_report, "") == []
    ua["pages"][0]["blocks"][0]["rows"][0]["value"] = "750 г, до 6)"
    found = errors(lint(en, ua, glossary, cfg, ok_report, ""))
    assert [i.path for i in found] == ["block[0].rows[0].value"]
    assert "footnote marks differ" in found[0].message


def test_number_closing_a_parenthesis_is_compared(en, ua, glossary, cfg, ok_report):
    en["pages"][0]["blocks"][0]["rows"][0]["value"] = "750 g (optionally 3)"
    ua["pages"][0]["blocks"][0]["rows"][0]["value"] = "750 г (опційно ще 4)"
    assert error_paths(lint(en, ua, glossary, cfg, ok_report, "")) == ["block[0].rows[0].value"]


def test_stale_render_is_error(en, ua, glossary, cfg, ok_report):
    ok_report["ua_sha256"] = "aaa"
    assert lint(en, ua, glossary, cfg, ok_report, "", ua_sha256="aaa") == []
    found = errors(lint(en, ua, glossary, cfg, ok_report, "", ua_sha256="bbb"))
    assert [i.path for i in found] == ["render"] and "stale render" in found[0].message
    del ok_report["ua_sha256"]
    assert error_paths(lint(en, ua, glossary, cfg, ok_report, "", ua_sha256="aaa")) == ["render"]


def test_missing_output_pdf_is_error(en, ua, glossary, cfg, ok_report):
    found = errors(lint(en, ua, glossary, cfg, ok_report, None))
    assert [i.path for i in found] == ["render"] and "stale render" in found[0].message


def test_en_numbers_checked_against_source(en, ua, glossary, cfg, ok_report):
    source = Counter({"750": 1, "2": 1})
    assert lint(en, ua, glossary, cfg, ok_report, "", source_numbers=source) == []
    en["pages"][0]["blocks"][0]["rows"][0]["value"] = "760 g"
    ua["pages"][0]["blocks"][0]["rows"][0]["value"] = "760 г"
    issues = lint(en, ua, glossary, cfg, ok_report, "", source_numbers=source)
    assert [(i.level, i.path) for i in issues] == [
        ("error", "en.block[0].rows[0].value"),
        ("warning", "source"),
    ]
    assert "760" in issues[0].message and "750" in issues[1].message


def test_en_row_notes_and_model_count_as_source_numbers(en, ua, glossary, cfg, ok_report):
    for doc in (en, ua):
        doc["product"]["model"] = "HC-A 2"
        doc["pages"][0]["blocks"][0]["rows"][0]["note"] = 1
    source = Counter({"750": 1, "2": 2, "1": 1})
    assert lint(en, ua, glossary, cfg, ok_report, "", source_numbers=source) == []


def test_drawing_labels_and_clip_text_skip_the_source_check(en, ua, glossary, cfg, ok_report):
    add_blocks(en, ua, DRAWING)
    for doc in (en, ua):
        doc["pages"][1]["blocks"][1]["labels"][0]["text"] = "Ø 51"
    source = Counter({"750": 1, "2": 1})
    assert lint(en, ua, glossary, cfg, ok_report, "", source_numbers=source) == []


def test_short_glossary_word_matches_inflected_form(en, ua, cfg, ok_report):
    glossary = Glossary([Term("scales", "ваги", (), "", "approved")], "")
    en["pages"][0]["blocks"][1]["text"] = "The scales use Profibus."
    ua["pages"][0]["blocks"][1]["text"] = "Вагами керує Profibus."
    assert lint(en, ua, glossary, cfg, ok_report, "") == []


def test_page_titles_not_paired_when_page_count_differs(en, ua, glossary, cfg, ok_report):
    en["pages"][1]["title"] = ["Line 2"]
    ua["pages"][1]["title"] = ["Лінія 2"]
    ua["pages"].insert(1, {"title": ["Контакти"], "blocks": []})
    assert lint(en, ua, glossary, cfg, ok_report, "") == []


def test_non_mapping_ua_reports_instead_of_crashing(en, glossary, cfg, ok_report):
    found = errors(lint(en, None, glossary, cfg, ok_report, ""))
    assert [i.path for i in found] == ["ua"]
    assert "not a mapping" in found[0].message


COVER = {"image": "images/cover.svg", "clip": [194.4, 201.4, 422.2, 642.6], "label": "CW"}


def add_cover_and_notes(en, ua):
    en["cover"] = {**COVER, "subtitle": "Technical data"}
    ua["cover"] = {**COVER, "subtitle": "Технічні дані"}
    en["notes"] = {"title": ["Personal", "notes"]}
    ua["notes"] = {"title": ["Особисті", "нотатки"]}


def test_cover_and_notes_pair_cleanly(en, ua, glossary, cfg, ok_report):
    add_cover_and_notes(en, ua)
    assert lint(en, ua, glossary, cfg, ok_report, "") == []


@pytest.mark.parametrize("key", ["cover", "notes"])
def test_cover_and_notes_must_exist_in_both(en, ua, glossary, cfg, ok_report, key):
    add_cover_and_notes(en, ua)
    missing = copy.deepcopy(ua)
    del missing[key]
    assert error_paths(lint(en, missing, glossary, cfg, ok_report, "")) == [key]
    extra = copy.deepcopy(en)
    del extra[key]
    assert error_paths(lint(extra, ua, glossary, cfg, ok_report, "")) == [key]


@pytest.mark.parametrize(
    ("key", "value"),
    [("image", "images/other.svg"), ("clip", [0, 0, 10, 10]), ("label", "КВ")],
)
def test_cover_facts_must_match(en, ua, glossary, cfg, ok_report, key, value):
    add_cover_and_notes(en, ua)
    ua["cover"][key] = value
    assert error_paths(lint(en, ua, glossary, cfg, ok_report, "")) == [f"cover.{key}"]


GLOSSARY_MD = """## Terms

| EN | UA | Avoid | Note | Status |
| --- | --- | --- | --- | --- |
| checkweigher | контрольні ваги | розитну | | approved |

## Style rules

none
"""


def write_pdf(path, lines):
    path.parent.mkdir(parents=True, exist_ok=True)
    with pymupdf.open() as document:
        page = document.new_page()
        for k, line in enumerate(lines):
            page.insert_text((72, 300 + 20 * k), line)
        document.save(path)


def write_report(paths, report):
    digest = hashlib.sha256(paths.ua_yaml.read_bytes()).hexdigest()
    paths.render_report.write_text(json.dumps({**report, "ua_sha256": digest}), encoding="utf-8")


@pytest.fixture
def lint_root(tmp_path, en, ua, ok_report):
    paths = paths_for("sheet", tmp_path)
    paths.work_dir.mkdir(parents=True)
    save_doc(en, paths.en_yaml)
    save_doc(ua, paths.ua_yaml)
    (tmp_path / "glossary.md").write_text(GLOSSARY_MD, encoding="utf-8")
    write_report(paths, ok_report)
    write_pdf(paths.source_pdf, ["Weight 750 g", "Fast, 2 lanes"])
    write_pdf(paths.output_pdf, ["OS-Technology"])
    return paths


def test_run_lint_clean_exits_zero(lint_root, capsys):
    from translator.lint import run_lint

    assert run_lint(lint_root) == 0
    assert capsys.readouterr().out == ""


def test_run_lint_prints_error_line_and_exits_one(lint_root, ua, capsys):
    from translator.lint import run_lint

    ua["pages"][0]["blocks"][0]["rows"][0]["value"] = "75 г"
    save_doc(ua, lint_root.ua_yaml)
    write_report(lint_root, OK_REPORT)
    assert run_lint(lint_root) == 1
    out = capsys.readouterr().out.splitlines()
    assert len(out) == 1
    assert out[0].startswith(f"{lint_root.ua_yaml}:block[0].rows[0].value: error: numbers differ")


def test_run_lint_warnings_only_exits_zero(lint_root, ua, capsys):
    from translator.lint import run_lint

    ua["pages"][0]["blocks"][1]["text"] = "Контрольні ваги conveyor з Profibus."
    save_doc(ua, lint_root.ua_yaml)
    write_report(lint_root, OK_REPORT)
    assert run_lint(lint_root) == 0
    out = capsys.readouterr().out
    assert f"{lint_root.ua_yaml}:block[1].text: warning: " in out


def test_run_lint_missing_glossary_is_error(lint_root, capsys):
    from translator.lint import run_lint

    (lint_root.root / "glossary.md").unlink()
    assert run_lint(lint_root) == 1
    out = capsys.readouterr().out
    assert out.startswith(f"{lint_root.ua_yaml}:glossary: error: glossary.md not found at ")


def test_run_lint_reports_overflow_from_report_file(lint_root, capsys):
    from translator.lint import run_lint

    report = {"pages": 2, "overflow": [{"page": 1, "path": "block[1].text", "dx": 0, "dy": 9}]}
    write_report(lint_root, report)
    assert run_lint(lint_root) == 1
    assert (
        f"{lint_root.ua_yaml}:block[1].text: error: overflow on page 1" in capsys.readouterr().out
    )


def test_run_lint_stale_render_is_error(lint_root, ua, capsys):
    from translator.lint import run_lint

    ua["pages"][0]["blocks"][1]["text"] = "Контрольні ваги з Profibus."
    save_doc(ua, lint_root.ua_yaml)
    assert run_lint(lint_root) == 1
    assert f"{lint_root.ua_yaml}:render: error: stale render" in capsys.readouterr().out


def test_run_lint_missing_output_pdf_is_error(lint_root, capsys):
    from translator.lint import run_lint

    lint_root.output_pdf.unlink()
    assert run_lint(lint_root) == 1
    assert f"{lint_root.ua_yaml}:render: error: stale render" in capsys.readouterr().out


def test_run_lint_checks_en_numbers_against_source_pdf(lint_root, capsys):
    from translator.lint import run_lint

    write_pdf(lint_root.source_pdf, ["Weight 760 g", "Fast, 2 lanes", "www.wipotec.com 9999"])
    assert run_lint(lint_root) == 1
    out = capsys.readouterr().out
    assert f"{lint_root.ua_yaml}:en.block[0].rows[0].value: error: " in out
    assert f"{lint_root.ua_yaml}:source: warning: " in out and "760" in out
    assert "9999" not in out  # the branding line is skipped


def test_run_lint_missing_source_pdf_is_error(lint_root, capsys):
    from translator.lint import run_lint

    lint_root.source_pdf.unlink()
    assert run_lint(lint_root) == 1
    assert f"{lint_root.ua_yaml}:source: error: source PDF not found" in capsys.readouterr().out


def test_run_lint_bad_glossary_is_error_line(lint_root, capsys):
    from translator.lint import run_lint

    (lint_root.root / "glossary.md").write_text("## Terms\n\n| a | b |\n", encoding="utf-8")
    assert run_lint(lint_root) == 1
    assert f"{lint_root.ua_yaml}:glossary: error: " in capsys.readouterr().out


@pytest.mark.parametrize("text", ["", "- just\n- a list\n", "pages: [unclosed\n"])
def test_run_lint_malformed_ua_is_error_line(lint_root, capsys, text):
    from translator.lint import run_lint

    lint_root.ua_yaml.write_text(text, encoding="utf-8")
    write_report(lint_root, OK_REPORT)
    assert run_lint(lint_root) == 1
    assert f"{lint_root.ua_yaml}:ua: error: " in capsys.readouterr().out


def test_source_numbers_skip_drawing_dimensions_and_notes_page(hc_a_pdf):
    from translator.config import load_config
    from translator.lint import source_numbers
    from translator.model import load_doc
    from translator.paths import ROOT

    en_doc = load_doc(ROOT / "work" / "datasheet-checkweigher-hc-a" / "en.yaml")
    found = source_numbers(hc_a_pdf, en_doc, load_config())
    assert found["600"] >= 1  # body text counts
    assert found["1591"] == 0 and found["440"] == 0  # drawing dimensions inside the clip
    assert found["190715"] == 0  # date code on the "Personal notes" page
