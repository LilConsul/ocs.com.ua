import hashlib
import json
from datetime import date

import pymupdf
import pytest
from playwright.sync_api import sync_playwright

from translator.cli import main
from translator.model import load_doc, save_doc
from translator.render.pdf import RenderError, run_render

TODAY = date(2026, 11, 23)


def test_render_writes_pdf_previews_and_report(fixture_paths):
    report = run_render(fixture_paths, today=TODAY)
    assert fixture_paths.output_pdf.exists()
    assert report["pages"] == len(load_doc(fixture_paths.ua_yaml)["pages"])
    assert len(list(fixture_paths.preview_dir.glob("page-*.png"))) == report["pages"]
    assert report["overflow"] == []


def test_vertical_overflow_reported_with_path(fixture_paths):
    doc = load_doc(fixture_paths.ua_yaml)
    doc["pages"][0]["blocks"][0]["text"] = "Дуже довгий текст. " * 2000
    save_doc(doc, fixture_paths.ua_yaml)
    report = run_render(fixture_paths, today=TODAY)
    entries = [o for o in report["overflow"] if o["dy"] > 0]
    assert entries and entries[0]["page"] == 1
    assert entries[0]["path"] is not None and entries[0]["path"].startswith("block[0]")


def test_horizontal_overflow_in_variant_box(fixture_paths):
    doc = load_doc(fixture_paths.ua_yaml)
    doc["product"]["variant"] = "Надзвичайнодовгенькийваріантбезпробілів"
    save_doc(doc, fixture_paths.ua_yaml)
    wide = [o for o in run_render(fixture_paths, today=TODAY)["overflow"] if o["dx"] > 0]
    assert [o["page"] for o in wide] == [1, 2, 3]  # the variant box repeats on every page
    assert {o["path"] for o in wide} == {"product.variant"}


def test_pdf_has_cyrillic_text_and_no_wipotec_contacts(fixture_paths):
    run_render(fixture_paths, today=TODAY)
    text = "".join(p.get_text() for p in pymupdf.open(fixture_paths.output_pdf))
    assert "ОС-Технолоджи" in text and "wipotec-ocs.com" not in text.lower()


def test_render_report_json_matches_returned_report(fixture_paths):
    report = run_render(fixture_paths, today=TODAY)
    saved = json.loads(fixture_paths.render_report.read_text(encoding="utf-8"))
    assert saved == report
    assert isinstance(saved["pages"], int) and isinstance(saved["overflow"], list)


def test_grid_cells_keep_model_codes_on_one_line(fixture_paths):
    doc = load_doc(fixture_paths.ua_yaml)
    grid = next(b for p in doc["pages"] for b in p["blocks"] if b["type"] == "grid")
    grid["header"] = ["", *["Дуже довгий заголовок колонки з кількома словами"] * 7]
    grid["rows"] = [[row[0], row[1], *["від 50 мг"] * 6] for row in grid["rows"]]
    save_doc(doc, fixture_paths.ua_yaml)
    run_render(fixture_paths, today=TODAY)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        page.goto(fixture_paths.html.absolute().as_uri())
        lines = page.evaluate(
            """() => Array.from(document.querySelectorAll(".grid td")).map((td) => {
                const range = document.createRange();
                range.selectNodeContents(td);
                return new Set(Array.from(range.getClientRects()).map((r) => r.top)).size;
            })"""
        )
        browser.close()
    assert lines and max(lines) == 1


def test_report_records_ua_yaml_hash(fixture_paths):
    report = run_render(fixture_paths, today=TODAY)
    assert report["ua_sha256"] == hashlib.sha256(fixture_paths.ua_yaml.read_bytes()).hexdigest()


def test_page_content_overflow_names_the_block_that_spills(fixture_paths):
    doc = load_doc(fixture_paths.ua_yaml)
    doc["pages"][1]["blocks"][2]["items"] = ["1) Дуже довга примітка. " * 2000]
    save_doc(doc, fixture_paths.ua_yaml)
    report = run_render(fixture_paths, today=TODAY)
    paths = [o["path"] for o in report["overflow"] if o["page"] == 2]
    assert paths and all(p.startswith("block[5]") for p in paths)


@pytest.mark.parametrize(
    "text",
    [
        "",
        "- a\n- list\n",
        "pages: [unclosed\n",
        "product: {}\npages: [{blocks: [{type: banner}]}]\n",
    ],
)
def test_render_rejects_malformed_ua(fixture_paths, text):
    fixture_paths.ua_yaml.write_text(text, encoding="utf-8")
    with pytest.raises(RenderError, match="ua.yaml"):
        run_render(fixture_paths, today=TODAY)
    assert not fixture_paths.output_pdf.exists()


def test_cli_render_malformed_ua_prints_error(fixture_paths, capsys):
    fixture_paths.ua_yaml.write_text("", encoding="utf-8")
    assert main(["render", "sample", "--root", str(fixture_paths.root)]) == 1
    assert capsys.readouterr().err.startswith("error: ")


def test_cover_and_notes_pages_render_without_overflow(fixture_paths):
    doc = load_doc(fixture_paths.ua_yaml)
    doc["cover"] = {
        "image": "images/drawing-3.svg",
        "clip": [10, 10, 210, 410],
        "subtitle": "Технічні дані",
        "label": "CW",
    }
    doc["notes"] = {"title": ["Особисті", "нотатки"]}
    save_doc(doc, fixture_paths.ua_yaml)
    report = run_render(fixture_paths, today=TODAY)
    assert report["pages"] == len(doc["pages"]) + 2
    assert report["overflow"] == []
    with pymupdf.open(fixture_paths.output_pdf) as pdf:
        cover, last = pdf[0].get_text(), pdf[-1].get_text()
    assert "CW" in cover and "HC-A" in cover and "/" not in cover  # no page number
    assert "ОСОБИСТІ" in last and f"{report['pages']} / {report['pages']}" in last


def test_pdf_keeps_contact_and_qr_links(fixture_paths, branding):
    run_render(fixture_paths, today=TODAY)
    with pymupdf.open(fixture_paths.output_pdf) as pdf:
        pages = [{link.get("uri") for link in page.get_links()} for page in pdf]
    for uris in pages:
        assert {"tel:+380673533853", "mailto:info@ocs.com.ua", branding["fallback_url"]} <= uris
    assert "https://ocs.com.ua/ua/catalogue" in pages[-1]
