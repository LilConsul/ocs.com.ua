from datetime import date

import pymupdf

from translator.model import load_doc, save_doc
from translator.render.pdf import run_render

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
    assert report["overflow"] and report["overflow"][0]["page"] == 1


def test_horizontal_overflow_in_variant_box(fixture_paths):
    doc = load_doc(fixture_paths.ua_yaml)
    doc["product"]["variant"] = "Надзвичайнодовгенькийваріантбезпробілів"
    save_doc(doc, fixture_paths.ua_yaml)
    assert any(o["dx"] > 0 for o in run_render(fixture_paths, today=TODAY)["overflow"])


def test_pdf_has_cyrillic_text_and_no_wipotec_contacts(fixture_paths):
    run_render(fixture_paths, today=TODAY)
    text = "".join(p.get_text() for p in pymupdf.open(fixture_paths.output_pdf))
    assert "ОС-Технолоджи" in text and "wipotec-ocs.com" not in text.lower()
