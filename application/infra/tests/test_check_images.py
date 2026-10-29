"""Tests for check-images.py: guards public images against mislabeled or oversized files."""

import importlib.util
import os
import pathlib

import pytest
from PIL import Image

_script = pathlib.Path(__file__).parents[1] / "scripts" / "check-images.py"
_spec = importlib.util.spec_from_file_location("check_images", _script)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
find_problems = _mod.find_problems
optimize = _mod.optimize
main = _mod.main
MAX_BYTES = _mod.MAX_BYTES
MAX_SIDE = _mod.MAX_SIDE


def save(path, size=(200, 100), fmt="WEBP", mode="RGBA", color=(10, 120, 200, 128)):
    Image.new(mode, size, color).save(path, fmt)
    return path


def noise(path, side=1200, fmt="WEBP"):
    Image.frombytes("RGB", (side, side), os.urandom(side * side * 3)).save(path, fmt)
    return path


def real_format(path):
    with Image.open(path) as img:
        return img.format


def test_accepts_small_real_webp(tmp_path):
    assert find_problems(save(tmp_path / "ok.webp")) == []


def test_flags_png_data_with_webp_extension(tmp_path):
    problems = find_problems(save(tmp_path / "fake.webp", fmt="PNG"))
    assert any("PNG" in p and "webp" in p for p in problems)


def test_flags_image_wider_than_limit(tmp_path):
    path = save(tmp_path / "wide.webp", size=(MAX_SIDE + 1, 50))
    assert any("px" in p for p in find_problems(path))


def test_flags_file_over_size_limit(tmp_path):
    path = noise(tmp_path / "big.webp", side=900)
    assert path.stat().st_size > MAX_BYTES
    assert any("KB" in p for p in find_problems(path))


def test_ignores_non_raster_files(tmp_path):
    (tmp_path / "logo.svg").write_text("<svg/>")
    (tmp_path / "doc.pdf").write_bytes(b"%PDF-1.4" + b"0" * (MAX_BYTES * 2))
    assert main([str(tmp_path)]) == 0


def test_fix_converts_mislabeled_png_to_real_webp_and_keeps_alpha(tmp_path):
    path = save(tmp_path / "fake.webp", fmt="PNG")
    optimize(path)
    assert real_format(path) == "WEBP"
    with Image.open(path) as img:
        assert "A" in img.getbands()
    assert find_problems(path) == []


def test_fix_caps_dimensions(tmp_path):
    path = save(tmp_path / "wide.webp", size=(MAX_SIDE * 2, 100))
    optimize(path)
    with Image.open(path) as img:
        assert max(img.size) <= MAX_SIDE


def test_fix_gets_oversized_file_under_size_limit(tmp_path):
    path = noise(tmp_path / "big.webp")
    optimize(path)
    assert path.stat().st_size <= MAX_BYTES
    assert real_format(path) == "WEBP"


def test_fix_keeps_jpeg_as_jpeg(tmp_path):
    path = noise(tmp_path / "photo.jpg", fmt="JPEG")
    optimize(path)
    assert real_format(path) == "JPEG"
    assert path.stat().st_size <= MAX_BYTES


def test_fix_leaves_compliant_file_untouched(tmp_path):
    path = save(tmp_path / "ok.webp")
    before = path.read_bytes()
    main(["--fix", str(path)])
    assert path.read_bytes() == before


def test_check_mode_fails_without_modifying_files(tmp_path):
    path = save(tmp_path / "fake.webp", fmt="PNG")
    before = path.read_bytes()
    assert main([str(path)]) == 1
    assert path.read_bytes() == before


def test_fix_mode_repairs_files_in_a_directory(tmp_path):
    nested = tmp_path / "equipment" / "hc-a"
    nested.mkdir(parents=True)
    path = save(nested / "fake.webp", fmt="PNG")
    assert main(["--fix", str(tmp_path)]) == 0
    assert real_format(path) == "WEBP"
    assert main([str(tmp_path)]) == 0


def test_check_mode_reports_every_problem_file(tmp_path, capsys):
    save(tmp_path / "a.webp", fmt="PNG")
    save(tmp_path / "b.webp", size=(MAX_SIDE + 1, 50))
    assert main([str(tmp_path)]) == 1
    out = capsys.readouterr().out
    assert "a.webp" in out and "b.webp" in out


@pytest.mark.parametrize("name", ["missing.webp"])
def test_main_ignores_paths_that_do_not_exist(tmp_path, name):
    # pre-commit passes deleted files too
    assert main([str(tmp_path / name)]) == 0


def test_fix_never_makes_a_flat_logo_bigger_than_a_lossless_resize(tmp_path):
    from PIL import ImageDraw

    path = tmp_path / "logo.webp"
    img = Image.new("RGBA", (MAX_SIDE * 2, 500), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for i in range(0, MAX_SIDE * 2, 160):
        draw.ellipse((i + 10, 40, i + 140, 460), fill=(200, 30, 60, 255))
        draw.rectangle((i + 40, 200, i + 110, 300), fill=(255, 255, 255, 255))
    img.save(path, "WEBP", lossless=True)

    small = img.copy()
    small.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
    reference = tmp_path / "reference.webp"
    small.save(reference, "WEBP", lossless=True)

    optimize(path)
    assert path.stat().st_size <= reference.stat().st_size


def test_fix_of_noisy_image_finishes_quickly(tmp_path):
    import time

    path = noise(tmp_path / "big.webp")
    start = time.perf_counter()
    optimize(path)
    assert time.perf_counter() - start < 6
