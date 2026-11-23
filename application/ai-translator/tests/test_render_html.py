from datetime import date

import pytest

from translator.model import iter_text
from translator.render.html import inline, qr_svg, render_html

TODAY = date(2026, 11, 23)


@pytest.fixture
def html(doc, company, branding, fixture_paths):
    return render_html(
        doc, work_dir=fixture_paths.work_dir, company=company, branding=branding, today=TODAY
    )


def test_renders_every_block_type_and_paths(html):
    for t in ("lead", "columns", "hero", "table", "grid", "matrix", "drawing", "footnotes", "note"):
        assert f'data-block="{t}"' in html
    assert 'data-path="block[0].text"' in html


def test_every_text_path_is_rendered(doc, html):
    for path, _text in iter_text(doc):
        assert f'data-path="{path}"' in html


def test_footer_uses_company_json_and_rights_year(html):
    assert "+38 067 35 33 853" in html and "info@ocs.com.ua" in html
    assert "© 2026 ОС-Технолоджи Україна" in html  # today=date(2026, 11, 23)
    assert "wipotec" not in html.lower().replace("wipotec emfr", "")


def test_footer_address_site_and_disclaimer(html, branding):
    assert "Берестейський просп., 67" in html and "03062" in html
    assert branding["site"] in html
    assert branding["disclaimer"] in html


def test_pages_and_fit_areas(doc, html):
    assert html.count('<section class="page"') == len(doc["pages"])
    assert html.count("page-content fit") == len(doc["pages"])


def test_inline_escapes_then_bolds():
    assert inline("**Base** <data>") == "<strong>Base</strong> &lt;data&gt;"


def test_inline_raises_footnote_marks_inside_text():
    assert inline("400 mm 1)") == "400 mm<sup>1)</sup>"
    assert inline("120 / 400 2) mm") == "120 / 400<sup>2)</sup> mm"
    assert inline("Standard deviation 3) (1s)") == "Standard deviation<sup>3)</sup> (1s)"
    assert inline("1) Optionally, surcharge") == "1) Optionally, surcharge"
    assert inline("6 bar [5:3:3]") == "6 bar [5:3:3]"


def test_bold_heading_markup_rendered(html):
    assert "<strong>Базові</strong> дані" in html


def test_footnote_note_renders_sup(html):
    assert "<sup>1)</sup>" in html


def test_images_and_fonts_are_file_uris(html, fixture_paths):
    assert (fixture_paths.work_dir / "images" / "photo-1-1.jpg").as_uri() in html
    assert "IBMPlexSans-Regular.woff2" in html and "file:///" in html


def test_drawing_label_positioned_in_percent(html):
    assert "left: 5.0%; top: 10.0%" in html


def test_qr_svg_is_inline_svg():
    svg = qr_svg("https://ocs.com.ua/ua")
    assert svg.startswith("<svg") and svg.rstrip().endswith("</svg>")


def test_qr_falls_back_when_url_empty(doc, company, branding, tmp_path):
    doc["product"]["url"] = ""
    html = render_html(doc, work_dir=tmp_path, company=company, branding=branding, today=TODAY)
    assert html.count("<svg") >= 2  # logo + QR
    assert 'data-qr="https://ocs.com.ua/ua"' in html


def test_overflow_hooks_carry_fit(html):
    assert html.count('class="aside aside-light fit"') == 1
    assert html.count('class="aside aside-dark fit"') == 1
    assert 'class="hero-aside fit"' in html
    assert 'class="variant fit"' in html
    assert html.count('class="band-title fit"') == 3
    assert html.count('class="page-content fit"') == 3


def test_empty_block_title_keeps_its_path(doc, company, branding, fixture_paths):
    doc["pages"][1]["blocks"][0]["title"] = ""
    html = render_html(
        doc, work_dir=fixture_paths.work_dir, company=company, branding=branding, today=TODAY
    )
    assert 'data-path="block[3].title"' in html
