import copy

import pytest

from translator.model import flat_blocks, iter_text, load_doc, save_doc, shape, validate


@pytest.fixture
def doc():
    return {
        "source": "files/en/hc-a.pdf",
        "lang": "en",
        "product": {"model": "HC-A", "variant": "BASIS", "category": "Checkweighers", "url": ""},
        "pages": [
            {
                "title": ["Technical", "data"],
                "blocks": [
                    {
                        "type": "table",
                        "title": "**Basic** data",
                        "rows": [
                            {"label": "Min load", "value": "1 kg"},
                            {"label": "Max load", "value": "250 kg", "note": 1},
                        ],
                    }
                ],
            },
            {
                "title": ["Overview"],
                "blocks": [
                    {
                        "type": "hero",
                        "image": "images/photo-2-1.jpg",
                        "aside": [
                            {"style": "light", "title": "Features", "items": ["Fast", "Robust"]},
                            {
                                "style": "dark",
                                "title": "Performance",
                                "items": ["Maximum output 600 pcs/min"],
                            },
                        ],
                    },
                    {"type": "footnotes", "items": ["1) Depends on product"]},
                ],
            },
        ],
    }


def test_iter_text_paths_use_flat_block_index(doc):
    paths = dict(iter_text(doc))
    assert paths["block[0].rows[1].value"] == "250 kg"
    assert paths["block[1].aside[1].items[0]"] == "Maximum output 600 pcs/min"
    assert "block[1].image" not in paths
    assert paths["product.category"] == "Checkweighers"
    assert paths["page[0].title[1]"] == "data"
    assert paths["block[1].aside[0].title"] == "Features"
    assert "product.model" not in paths


def test_iter_text_other_block_types():
    doc = {
        "product": {"model": "M", "category": ""},
        "pages": [
            {
                "title": [],
                "blocks": [
                    {"type": "grid", "title": "G", "header": ["h"], "rows": [["a", "b"]]},
                    {
                        "type": "matrix",
                        "title": "M",
                        "corner": "c",
                        "header": ["x"],
                        "rows": [{"label": "l", "cells": ["x"]}],
                    },
                    {
                        "type": "drawing",
                        "image": "i.svg",
                        "labels": [{"text": "t", "x": 1, "y": 2}],
                    },
                ],
            }
        ],
    }
    paths = dict(iter_text(doc))
    assert paths["block[0].rows[0][1]"] == "b"
    assert paths["block[0].header[0]"] == "h"
    assert paths["block[1].rows[0].label"] == "l"
    assert paths["block[1].corner"] == "c"
    assert not any("cells" in p for p in paths)
    assert paths["block[2].labels[0].text"] == "t"


def test_shape_ignores_page_grouping(doc):
    moved = copy.deepcopy(doc)
    moved["pages"][0]["blocks"].append(moved["pages"][1]["blocks"].pop(0))
    assert [shape(b) for b in flat_blocks(moved)] == [shape(b) for b in flat_blocks(doc)]


def test_validate_reports_unknown_type_and_missing_key(doc):
    doc["pages"][1]["blocks"].append({"type": "banner"})
    doc["pages"][1]["blocks"][0].pop("aside")
    errors = validate(doc)
    assert any("block[3]" in e and "banner" in e for e in errors)
    assert any("block[1]" in e and "aside" in e for e in errors)


def test_validate_rejects_non_mapping_documents():
    assert validate(None) == ["document is not a mapping"]
    assert validate(["a"]) == ["document is not a mapping"]


def test_validate_reports_malformed_pages_and_blocks():
    errors = validate({"product": {}, "pages": ["x", {"blocks": "y"}]})
    assert errors == ["page[0]: not a mapping", "page[1].blocks: not a list"]
    errors = validate({"product": {}, "pages": [{"blocks": ["z"]}]})
    assert errors == ["block[0]: not a mapping"]


def test_validate_clean_doc(doc):
    assert validate(doc) == []


def test_save_load_roundtrip_keeps_cyrillic(tmp_path, doc):
    doc["product"]["category"] = "Контрольні ваги"
    save_doc(doc, tmp_path / "d.yaml")
    assert "Контрольні ваги" in (tmp_path / "d.yaml").read_text(encoding="utf-8")
    assert load_doc(tmp_path / "d.yaml") == doc


COVER = {
    "image": "images/cover.svg",
    "clip": [194.4, 201.4, 422.2, 642.6],
    "subtitle": "Technical data",
    "label": "CW",
}


def test_iter_text_cover_subtitle_and_notes_title(doc):
    doc["cover"] = dict(COVER)
    doc["notes"] = {"title": ["Personal", "notes"]}
    paths = dict(iter_text(doc))
    assert paths["cover.subtitle"] == "Technical data"
    assert paths["notes.title[0]"] == "Personal" and paths["notes.title[1]"] == "notes"
    assert not any(p.startswith("cover.") and p != "cover.subtitle" for p in paths)


def test_validate_cover_and_notes(doc):
    doc["cover"] = dict(COVER)
    doc["notes"] = {"title": ["Personal", "notes"]}
    assert validate(doc) == []
    del doc["cover"]["label"]
    doc["notes"] = {"title": "Personal notes"}
    assert validate(doc) == ["cover.label: missing", "notes.title: not a list"]
    doc["cover"] = "cover.svg"
    assert validate(doc)[0] == "cover: not a mapping"


def test_shape_sees_a_missing_grid_cell():
    grid = {"type": "grid", "title": "G", "header": ["a", "b"], "rows": [["1", "2"], ["3", "4"]]}
    cut = {**grid, "rows": [["1", "2"], ["3"]]}
    assert shape(grid) != shape(cut)
