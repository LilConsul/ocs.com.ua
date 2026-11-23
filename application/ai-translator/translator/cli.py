"""Command line entry point: `translator extract <name>`, `translator drawing <name>`."""

import argparse
import sys
from pathlib import Path

import pymupdf

from translator.config import load_config
from translator.extract import redo_drawing, run_extract
from translator.model import load_doc, save_doc
from translator.paths import ROOT, paths_for


def _parse_clip(value: str) -> pymupdf.Rect:
    parts = [float(v) for v in value.split(",")]
    if len(parts) != 4:
        raise argparse.ArgumentTypeError("clip must be x0,y0,x1,y1")
    return pymupdf.Rect(*parts)


def _parser() -> argparse.ArgumentParser:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--root", type=Path, default=argparse.SUPPRESS, help=argparse.SUPPRESS)
    parser = argparse.ArgumentParser(prog="translator", parents=[common])
    sub = parser.add_subparsers(dest="command", required=True)
    extract = sub.add_parser("extract", parents=[common], help="draft en.yaml from the PDF")
    extract.add_argument("name")
    extract.add_argument("--force", action="store_true", help="overwrite an existing en.yaml")
    drawing = sub.add_parser("drawing", parents=[common], help="re-export one drawing")
    drawing.add_argument("name")
    drawing.add_argument("--page", type=int, required=True, help="1-based page number")
    drawing.add_argument("--clip", type=_parse_clip, required=True, help="x0,y0,x1,y1")
    return parser


def _extract(args: argparse.Namespace, root: Path) -> int:
    paths = paths_for(args.name, root)
    try:
        warnings = run_extract(paths, load_config(), force=args.force)
    except (FileNotFoundError, FileExistsError) as err:
        print(f"error: {err}", file=sys.stderr)
        return 1
    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)
    print(f"wrote {paths.en_yaml}")
    return 0


def _drawing(args: argparse.Namespace, root: Path) -> int:
    paths = paths_for(args.name, root)
    if not paths.en_yaml.exists() or not paths.source_pdf.exists():
        print(f"error: run `translator extract {args.name}` first", file=sys.stderr)
        return 1
    try:
        doc = redo_drawing(paths, load_doc(paths.en_yaml), args.page, args.clip)
    except LookupError as err:
        print(f"error: {err}", file=sys.stderr)
        return 1
    save_doc(doc, paths.en_yaml)
    print(f"updated drawing on page {args.page} in {paths.en_yaml}")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    root = getattr(args, "root", ROOT)
    if args.command == "extract":
        return _extract(args, root)
    return _drawing(args, root)


if __name__ == "__main__":
    sys.exit(main())
