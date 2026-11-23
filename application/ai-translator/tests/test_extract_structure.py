import pymupdf
import pytest

from translator.config import is_branding, load_config
from translator.extract import collect_media
from translator.extract.pdf import page_spans, table_cells_text
from translator.extract.structure import build_draft
from translator.model import flat_blocks, iter_text, validate
from translator.paths import ROOT

PDF = ROOT / "files/en/datasheet-checkweigher-hc-a.pdf"


@pytest.fixture(scope="module")
def draft(tmp_path_factory):
    doc = pymupdf.open(PDF)
    images, drawings = collect_media(doc, tmp_path_factory.mktemp("images"))
    result = build_draft(doc, load_config(), images, drawings, "files/en/" + PDF.name)
    doc.close()
    return result


def test_page_spans_bold_and_normalised():
    with pymupdf.open(PDF) as doc:
        spans = page_spans(doc[2])
    base = next(s for s in spans if s.text == "BASE")
    data = next(s for s in spans if s.text == "DATA" and s.size == 14)
    assert base.bold and not data.bold
    assert all(s.text == s.text.strip() and s.text for s in spans)


def test_table_cells_text_marks_merged_cells():
    with pymupdf.open(PDF) as doc:
        page = doc[3]
        cells = table_cells_text(page, page.find_tables().tables[0])
    assert cells[0][1] == "Dimensions weighing conveyor" and cells[0][2] is None
    assert cells[1][0] == "width length"
    assert cells[2][0] == "200 mm"  # no descender bleeding in from the cell above


def test_product_and_page_titles(draft):
    assert draft["product"]["model"] == "HC-A" and draft["product"]["variant"] == "BASIS"
    assert draft["pages"][0]["title"] == ["FOR THE HIGHEST STANDARDS", "IN DYNAMIC WEIGHING"]
    assert len(draft["pages"]) == 4  # cover and personal-notes pages dropped


def test_table_cells_keep_spaces(draft):
    table = next(b for b in flat_blocks(draft) if b["type"] == "table")
    assert table["rows"][0] == {
        "label": "Material of machine",
        "value": "Frame stainless steel V2A/AISI 304",
    }
    assert len(table["rows"]) == 19


def test_table_title_and_footnote_note(draft):
    table = next(b for b in flat_blocks(draft) if b["type"] == "table")
    assert table["title"] == "**BASE** DATA"
    interfaces = next(r for r in table["rows"] if r["label"] == "Interfaces")
    assert interfaces["note"] == 2


def test_grid_and_matrix_detected(draft):
    types = [b["type"] for b in flat_blocks(draft)]
    assert types.count("grid") == 1 and types.count("matrix") == 2 and types.count("drawing") == 1
    grid = next(b for b in flat_blocks(draft) if b["type"] == "grid")
    assert len(grid["header"]) == 8 and len(grid["rows"]) == 6


def test_hero_asides(draft):
    hero = next(b for b in flat_blocks(draft) if b["type"] == "hero")
    assert hero["image"].startswith("images/photo-2-")
    styles = [(a["style"], a["title"]) for a in hero["aside"]]
    assert styles == [("light", "MAIN **FEATURES**"), ("dark", "YOUR **BENEFITS**")]
    assert (
        "Simple, menu-directed operation via a 15“ colour TFT touchscreen"
        in (hero["aside"][0]["items"])
    )


def test_footnotes_per_page(draft):
    notes = [b for b in flat_blocks(draft) if b["type"] == "footnotes"]
    assert len(notes) == 3
    assert notes[0]["items"][1] == "2) Optionally, surcharge"


def test_no_branding_and_valid(draft):
    cfg = load_config()
    assert not any(is_branding(t, cfg) for _, t in iter_text(draft))
    assert validate(draft) == []
