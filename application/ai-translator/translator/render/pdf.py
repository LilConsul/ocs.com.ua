"""Print the rendered datasheet HTML to PDF, write page previews and an overflow report."""

import json
from datetime import date
from pathlib import Path

import pymupdf
import yaml
from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

from translator.model import load_doc
from translator.paths import FRONTEND, ROOT, DatasheetPaths
from translator.render.html import render_html

_TOLERANCE = 1  # px; sub-pixel rounding produces 1 px of noise

_OVERFLOW_JS = """
(tolerance) => {
  const pages = Array.from(document.querySelectorAll("section.page"));
  const out = [];
  for (const el of document.querySelectorAll(".fit")) {
    const dx = el.scrollWidth - el.clientWidth;
    const dy = el.scrollHeight - el.clientHeight;
    if (dx <= tolerance && dy <= tolerance) continue;
    const holder = el.closest("section.page");
    const own = el.hasAttribute("data-path") ? el : el.querySelector("[data-path]");
    out.push({
      page: holder ? pages.indexOf(holder) + 1 : 0,
      path: own ? own.getAttribute("data-path") : null,
      dx: Math.max(dx, 0),
      dy: Math.max(dy, 0),
    });
  }
  return out;
}
"""


class RenderError(RuntimeError):
    """Rendering could not be completed."""


def print_pdf(html_path: Path, out_pdf: Path) -> list[dict]:
    """Print html_path to out_pdf as A4 and return the overflowing `.fit` elements."""
    out_pdf.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        try:
            browser = pw.chromium.launch()
        except PlaywrightError as err:
            raise RenderError("Chromium missing: run uv run playwright install chromium") from err
        try:
            page = browser.new_page()
            page.goto(Path(html_path).absolute().as_uri())
            page.evaluate("document.fonts.ready")
            overflow = page.evaluate(_OVERFLOW_JS, _TOLERANCE)
            page.pdf(
                path=str(out_pdf),
                format="A4",
                print_background=True,
                prefer_css_page_size=True,
            )
        finally:
            browser.close()
    return overflow


def write_previews(pdf: Path, out_dir: Path, dpi: int = 110) -> list[Path]:
    """Render each PDF page to `page-N.png` in out_dir, clearing old previews first."""
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("page-*.png"):
        old.unlink()
    written = []
    with pymupdf.open(pdf) as document:
        for number, page in enumerate(document, start=1):
            target = out_dir / f"page-{number}.png"
            page.get_pixmap(dpi=dpi).save(target)
            written.append(target)
    return written


def run_render(paths: DatasheetPaths, today: date | None = None) -> dict:
    """Render ua.yaml to HTML, PDF, previews and the report; return the report."""
    today = today or date.today()
    doc = load_doc(paths.ua_yaml)
    company = json.loads((FRONTEND / "src" / "data" / "company.json").read_text(encoding="utf-8"))
    branding = yaml.safe_load((ROOT / "branding.yaml").read_text(encoding="utf-8"))
    html = render_html(
        doc, work_dir=paths.work_dir, company=company, branding=branding, today=today
    )
    paths.html.write_text(html, encoding="utf-8")
    overflow = print_pdf(paths.html, paths.output_pdf)
    previews = write_previews(paths.output_pdf, paths.preview_dir)
    report = {"pages": len(previews), "overflow": overflow}
    paths.render_report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return report
