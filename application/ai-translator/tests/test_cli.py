from translator.cli import main
from translator.model import flat_blocks, load_doc
from translator.paths import paths_for

NAME = "datasheet-checkweigher-hc-a"


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


def test_cli_drawing_updates_block(tmp_root):
    assert main(["extract", NAME, "--root", str(tmp_root)]) == 0
    args = ["drawing", NAME, "--page", "5", "--clip", "61,164,400,500", "--root", str(tmp_root)]
    assert main(args) == 0
    doc = load_doc(paths_for(NAME, tmp_root).en_yaml)
    block = next(b for b in flat_blocks(doc) if b["type"] == "drawing")
    assert block["clip"] == [61.0, 164.0, 400.0, 500.0]
    assert block["image"] == "images/drawing-5.svg"
