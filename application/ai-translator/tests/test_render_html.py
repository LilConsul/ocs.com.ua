import re
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


def test_inline_leaves_closing_parenthesis_alone():
    assert inline("(опційно ще 3)") == "(опційно ще 3)"
    assert inline("**Вага** 2) (до 5)") == "<strong>Вага</strong><sup>2)</sup> (до 5)"


def test_hero_without_image_has_no_img(doc, company, branding, fixture_paths):
    doc["pages"][0]["blocks"][2]["image"] = ""
    html = render_html(
        doc, work_dir=fixture_paths.work_dir, company=company, branding=branding, today=TODAY
    )
    assert 'class="hero-image"' in html
    assert "photo-1-1.jpg" not in html and html.count("<img") == 1  # the drawing only


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


def with_cover_and_notes(doc):
    doc["cover"] = {
        "image": "images/drawing-3.svg",
        "clip": [10, 10, 210, 410],
        "subtitle": "Технічні дані",
        "label": "CW",
    }
    doc["notes"] = {"title": ["Особисті", "нотатки"]}
    return doc


@pytest.fixture
def full_html(doc, company, branding, fixture_paths):
    return render_html(
        with_cover_and_notes(doc),
        work_dir=fixture_paths.work_dir,
        company=company,
        branding=branding,
        today=TODAY,
    )


def sections(html):
    return html.split('<section class="page')[1:]


def test_cover_is_the_first_page_without_footer(doc, full_html):
    pages = sections(full_html)
    assert len(pages) == len(doc["pages"]) + 2
    cover = pages[0]
    assert cover.startswith(' cover"') and 'data-path="cover.subtitle"' in cover
    assert "Технічні дані" in cover and ">CW<" in cover and "drawing-3.svg" in cover
    assert "page-footer" not in cover and "rights" not in cover and "page-no" not in cover
    assert "<svg" in cover  # the OS-Technology logo


def test_content_pages_are_numbered_against_all_pages(doc, full_html):
    total = len(doc["pages"]) + 2
    for number, page in enumerate(sections(full_html)[1:], start=2):
        assert f"{number} / {total}" in page


def test_notes_page_is_last_with_rules_and_contacts(doc, full_html):
    pages = sections(full_html)
    notes = pages[-1]
    assert notes.count('class="notes-rule"') == 15
    assert 'data-path="notes.title[0]"' in notes and 'data-path="notes.title[1]"' in notes
    assert "data-qr=" in notes and "page-footer" in notes and "notes-icon" in notes
    assert 'class="band-title fit"' in notes and 'class="variant fit"' in notes
    assert full_html.count('class="contact"') == 1  # no separate contacts on a content page
    assert all("data-qr=" not in page for page in pages[:-1])


def test_without_notes_contacts_stay_on_last_content_page(doc, html):
    pages = sections(html)
    assert len(pages) == len(doc["pages"])
    assert "data-qr=" in pages[-1] and 'class="notes-rule"' not in html
    assert 'class="page cover"' not in html


def test_category_stays_on_the_first_content_page(full_html):
    pages = sections(full_html)
    assert 'data-path="product.category"' in pages[1]
    assert 'data-path="product.category"' not in pages[0]


def test_contacts_and_qr_are_links(html, branding):
    pages = sections(html)
    for page in pages:
        assert 'href="tel:+380673533853"' in page and 'href="mailto:info@ocs.com.ua"' in page
        assert f'href="{branding["fallback_url"]}"' in page
    assert '<a class="qr" href="https://ocs.com.ua/ua/catalogue"' in pages[-1]


def test_cover_without_label_has_no_black_square(doc, company, branding, fixture_paths):
    doc = with_cover_and_notes(doc)
    doc["cover"]["label"] = ""
    html = render_html(
        doc, work_dir=fixture_paths.work_dir, company=company, branding=branding, today=TODAY
    )
    assert 'class="cover-label"' not in html


def test_column_paragraphs_are_separate_paragraphs(doc, company, branding, fixture_paths):
    block = next(b for p in doc["pages"] for b in p["blocks"] if b["type"] == "columns")
    block["paragraphs"] = ["Перший.", "Другий."]
    html = render_html(
        doc, work_dir=fixture_paths.work_dir, company=company, branding=branding, today=TODAY
    )
    assert re.search(r"<p [^>]*>Перший\.</p>\s*<p [^>]*>Другий\.</p>", html)
