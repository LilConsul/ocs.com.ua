import io
import sys

from translator.cli import main
from translator.model import flat_blocks, load_doc, save_doc
from translator.paths import paths_for

NAME = "datasheet-checkweigher-hc-a"


def test_cli_prints_cyrillic_on_a_cp1252_console(tmp_path, monkeypatch):
    # Windows consoles (Git Bash, older PowerShell) default to cp1252; Cyrillic must not crash
    raw = io.BytesIO()
    monkeypatch.setattr(sys, "stderr", io.TextIOWrapper(raw, encoding="cp1252"))
    assert main(["extract", "вага", "--root", str(tmp_path)]) == 1
    sys.stderr.flush()
    assert "вага".encode() in raw.getvalue()


def test_cli_extract_refuses_overwrite(tmp_root):
    assert main(["extract", NAME, "--root", str(tmp_root)]) == 0
    assert main(["extract", NAME, "--root", str(tmp_root)]) == 1
    paths = paths_for(NAME, tmp_root)
    assert paths.en_yaml.exists() and paths.contact_sheet.exists()
    assert (paths.source_preview_dir / "page-1.png").exists()
    assert main(["extract", NAME, "--force", "--root", str(tmp_root)]) == 0


def test_cli_extract_missing_pdf(tmp_path, capsys):
    assert main(["extract", "nope", "--root", str(tmp_path)]) == 1
    assert "nope.pdf" in capsys.readouterr().err


def test_cli_accepts_pdf_path_as_name(tmp_path, capsys):
    # A path such as .\files\en\x.pdf (tab completion) resolves to the name "x"
    for arg in ["files/en/nope.pdf", ".\\files\\en\\nope.pdf", "files/en/nope", "nope.PDF"]:
        assert main(["extract", arg, "--root", str(tmp_path)]) == 1
        err = capsys.readouterr().err
        assert "files/en/files" not in err.replace("\\", "/")
        assert "nope.pdf.pdf" not in err
        assert "nope" in err


def test_cli_drawing_updates_block(tmp_root):
    assert main(["extract", NAME, "--root", str(tmp_root)]) == 0
    args = ["drawing", NAME, "--page", "5", "--clip", "61,164,400,500", "--root", str(tmp_root)]
    assert main(args) == 0
    doc = load_doc(paths_for(NAME, tmp_root).en_yaml)
    block = next(b for b in flat_blocks(doc) if b["type"] == "drawing")
    assert block["clip"] == [61.0, 164.0, 400.0, 500.0]
    assert block["image"] == "images/drawing-5.svg"


def test_cli_extract_exports_the_cover_drawing(tmp_root):
    assert main(["extract", NAME, "--root", str(tmp_root)]) == 0
    paths = paths_for(NAME, tmp_root)
    doc = load_doc(paths.en_yaml)
    assert doc["cover"]["image"] == "images/cover.svg"
    svg = paths.work_dir / doc["cover"]["image"]
    assert svg.stat().st_size > 10_000


def test_cli_cover_updates_only_the_cover(tmp_root):
    assert main(["extract", NAME, "--root", str(tmp_root)]) == 0
    paths = paths_for(NAME, tmp_root)
    doc = load_doc(paths.en_yaml)
    auto_clip = doc["cover"]["clip"]
    del doc["cover"]
    doc["pages"][0]["blocks"][0]["text"] = "Hand-fixed lead"
    save_doc(doc, paths.en_yaml)
    assert main(["cover", f"files/en/{NAME}.pdf", "--root", str(tmp_root)]) == 0
    doc = load_doc(paths.en_yaml)
    assert doc["cover"] == {
        "image": "images/cover.svg",
        "clip": auto_clip,
        "subtitle": "Technical data",
        "label": "CW",
    }
    assert doc["pages"][0]["blocks"][0]["text"] == "Hand-fixed lead"
    assert list(doc).index("cover") < list(doc).index("pages")
    doc["cover"]["subtitle"] = "Hand-fixed subtitle"
    save_doc(doc, paths.en_yaml)
    clip = ["cover", NAME, "--clip", "190,200,420,640", "--root", str(tmp_root)]
    assert main(clip) == 0
    cover = load_doc(paths.en_yaml)["cover"]
    assert cover["clip"] == [190.0, 200.0, 420.0, 640.0]
    assert cover["subtitle"] == "Hand-fixed subtitle"
