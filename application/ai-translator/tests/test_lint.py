import copy
import re

import pytest

from translator.cli import main
from translator.config import SourceConfig
from translator.glossary import Glossary, Term
from translator.lint import lint

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
