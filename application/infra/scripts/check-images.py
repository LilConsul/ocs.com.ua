#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=13"]
# ///
"""Checks (and optionally fixes) raster images served from application/frontend/public.

A file fails the check when its extension lies about its real format (e.g. PNG data in a
.webp file), when it is wider/taller than MAX_SIDE, or when it is larger than MAX_BYTES.

Usage:
    uv run application/infra/scripts/check-images.py [PATH ...]          # check, exit 1 on problems
    uv run application/infra/scripts/check-images.py --fix [PATH ...]    # re-encode problem files

PATH may be files or directories. Defaults to application/frontend/public.
Files are re-encoded in place and keep their name, so content references stay valid.
"""

import argparse
import io
import sys
from pathlib import Path

from PIL import Image

MAX_SIDE = 1600
MAX_BYTES = 300 * 1024
QUALITIES = (82, 75, 68, 60, 50)
DEFAULT_PATH = Path(__file__).resolve().parents[2] / "frontend" / "public"

# extension -> format name reported by Pillow
EXT_FORMATS = {".webp": "WEBP", ".png": "PNG", ".jpg": "JPEG", ".jpeg": "JPEG"}


def find_problems(path: Path) -> list[str]:
    expected = EXT_FORMATS[path.suffix.lower()]
    problems = []
    with Image.open(path) as img:
        if img.format != expected:
            problems.append(f"is {img.format} data but named {path.suffix.lower()} (expected {expected})")
        if max(img.size) > MAX_SIDE:
            problems.append(f"is {img.width}x{img.height} px, max side is {MAX_SIDE} px")
    size = path.stat().st_size
    if size > MAX_BYTES:
        problems.append(f"is {size // 1024} KB, max is {MAX_BYTES // 1024} KB")
    return problems


def _encode(img: Image.Image, fmt: str, quality: int) -> bytes:
    buf = io.BytesIO()
    if fmt == "WEBP":
        img.save(buf, "WEBP", quality=quality, method=4)
    elif fmt == "JPEG":
        img.convert("RGB").save(buf, "JPEG", quality=quality, optimize=True, progressive=True)
    else:
        img.save(buf, "PNG", optimize=True)
    return buf.getvalue()


def _lossless_webp(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, "WEBP", lossless=True, method=4)
    return buf.getvalue()


def _best(img: Image.Image, fmt: str, quality: int) -> bytes:
    """Encode at the given quality; for WebP also try lossless (flat-colour logos) and keep the smaller."""
    data = _encode(img, fmt, quality)
    if fmt == "WEBP":
        data = min(data, _lossless_webp(img), key=len)
    return data


def _fit(img: Image.Image, fmt: str) -> bytes:
    """Highest-quality encoding of img under MAX_BYTES, or the lowest-quality one if none fits."""
    qualities = QUALITIES if fmt != "PNG" else (0,)
    smallest = _best(img, fmt, qualities[-1])
    if len(smallest) > MAX_BYTES:
        return smallest  # caller shrinks the image; trying middle qualities would be wasted work
    for quality in qualities[:-1]:
        data = _best(img, fmt, quality)
        if len(data) <= MAX_BYTES:
            return data
    return smallest


def optimize(path: Path) -> None:
    """Re-encode in place: cap dimensions, then lower quality, then shrink until under MAX_BYTES."""
    fmt = EXT_FORMATS[path.suffix.lower()]
    with Image.open(path) as src:
        img = src.copy()
    img.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
    data = _fit(img, fmt)
    # File size is roughly proportional to pixel count: jump straight to the estimated scale
    for _ in range(3):
        if len(data) <= MAX_BYTES:
            break
        scale = min(0.9, (MAX_BYTES / len(data)) ** 0.5 * 0.95)
        img = img.resize(
            (max(1, round(img.width * scale)), max(1, round(img.height * scale))),
            Image.Resampling.LANCZOS,
        )
        data = _fit(img, fmt)
    path.write_bytes(data)


def collect(paths: list[Path]) -> list[Path]:
    files: list[Path] = []
    for p in paths:
        if p.is_dir():
            files.extend(sorted(f for f in p.rglob("*") if f.is_file()))
        elif p.is_file():
            files.append(p)
    return [f for f in files if f.suffix.lower() in EXT_FORMATS]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("paths", nargs="*", type=Path, default=[DEFAULT_PATH])
    parser.add_argument("--fix", action="store_true", help="re-encode files that fail the check")
    args = parser.parse_args(argv)

    failed = 0
    for path in collect(args.paths):
        problems = find_problems(path)
        if not problems:
            continue
        if args.fix:
            before = path.stat().st_size
            optimize(path)
            print(f"fixed {path}: {before // 1024} KB -> {path.stat().st_size // 1024} KB")
            problems = find_problems(path)
        for problem in problems:
            print(f"{path}: {problem}")
        failed += bool(problems)

    if failed and not args.fix:
        print(f"\n{failed} image(s) failed. Run: uv run application/infra/scripts/check-images.py --fix")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
