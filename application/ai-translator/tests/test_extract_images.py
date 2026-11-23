import pymupdf
from PIL import Image

from translator.extract.images import (
    contact_sheet,
    export_drawing,
    extract_rasters,
    find_drawing_clip,
    trim_white,
)


def test_photo_tiles_are_stitched_into_one_image(hc_a_pdf, tmp_path):
    imgs = extract_rasters(pymupdf.open(hc_a_pdf), tmp_path, trim=False)
    photos = [i for i in imgs if i.page == 2]
    assert len(photos) == 1
    assert 2280 <= photos[0].width <= 2310 and 1680 <= photos[0].height <= 1700


def test_repeated_xref_fills_every_position(hc_a_pdf, tmp_path):
    imgs = extract_rasters(pymupdf.open(hc_a_pdf), tmp_path, trim=False)
    img = Image.open(imgs[0].path).convert("L")
    w, h = img.size
    for fy in (0.1, 0.35, 0.6, 0.85):
        assert img.getpixel((int(w * 0.95), int(h * fy))) > 200


def test_stitched_photo_is_trimmed_to_the_machine(hc_a_pdf, tmp_path):
    photo = extract_rasters(pymupdf.open(hc_a_pdf), tmp_path)[0]
    img = Image.open(photo.path)
    assert img.size == (photo.width, photo.height)
    assert 1250 <= photo.width <= 1320 and photo.height >= 1650


def test_trim_white_keeps_a_margin_and_ignores_blank_images():
    img = Image.new("RGB", (100, 50), "white")
    img.paste((0, 0, 0), (40, 10, 60, 20))
    assert trim_white(img).size == (20 + 16, 10 + 16)
    blank = Image.new("RGB", (30, 30), "white")
    assert trim_white(blank) is blank


def test_footer_strips_and_qr_are_dropped(hc_a_pdf, tmp_path):
    imgs = extract_rasters(pymupdf.open(hc_a_pdf), tmp_path)
    assert {i.page for i in imgs} == {2}


def test_drawing_clip_found_only_on_drawing_page(hc_a_pdf):
    d = pymupdf.open(hc_a_pdf)
    assert find_drawing_clip(d[2]) is None
    clip = find_drawing_clip(d[4])
    assert clip.y0 > 125 and clip.y1 < 633


def test_export_drawing_moves_word_labels_out(hc_a_pdf, tmp_path):
    d = pymupdf.open(hc_a_pdf)
    labels = export_drawing(d, 4, find_drawing_clip(d[4]), tmp_path / "drawing-5.svg")
    assert [lb.text for lb in labels] == ["working direction"]
    assert 0 <= labels[0].x <= 100 and 0 <= labels[0].y <= 100
    assert (tmp_path / "drawing-5.svg").stat().st_size > 10_000
    assert "working direction" not in pymupdf.open(tmp_path / "drawing-5.svg")[0].get_text()


def test_contact_sheet_renders_images_and_svg(hc_a_pdf, tmp_path):
    d = pymupdf.open(hc_a_pdf)
    imgs = extract_rasters(d, tmp_path)
    svg = tmp_path / "drawing-5.svg"
    export_drawing(d, 4, find_drawing_clip(d[4]), svg)
    out = tmp_path / "sheet.png"
    contact_sheet([imgs[0].path, svg], out)
    assert out.exists() and Image.open(out).width >= 300
