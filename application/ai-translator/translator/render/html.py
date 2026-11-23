"""Render a datasheet YAML document to the branded A4 HTML page set."""

import re
from datetime import date
from pathlib import Path

import qrcode
import qrcode.image.svg
from jinja2 import Environment, FileSystemLoader
from markupsafe import Markup, escape

from translator.paths import FRONTEND, ROOT
from translator.text import footnote_mark_spans

TEMPLATES = ROOT / "templates"
FONTS = ROOT / "fonts"
LOGO = FRONTEND / "public" / "assets" / "icons" / "logo-ua.svg"

_BOLD = re.compile(r"\*\*(.+?)\*\*")
_SUP_OPEN, _SUP_CLOSE = "\x01", "\x02"  # placeholders that survive HTML escaping
_XML_DECL = re.compile(r"^\s*<\?xml[^>]*\?>\s*")


def _raise_marks(text: str) -> str:
    """Wrap the footnote marks inside text in placeholders, dropping the space before each.

    Marks are found by the rule lint uses (text.footnote_mark_spans); a mark at the start of
    the text ("1) Water from above") is the footnote's own number and stays as it is.
    """
    out, last = [], 0
    for a, b in footnote_mark_spans(text):
        if not text[:a].strip():
            out.append(text[last:b])
        else:
            out.append(text[last:a].rstrip() + _SUP_OPEN + text[a:b] + _SUP_CLOSE)
        last = b
    out.append(text[last:])
    return "".join(out)


def inline(text: str) -> Markup:
    """HTML-escape text, turn `**x**` into `<strong>x</strong>` and footnote marks into `<sup>`."""
    html = _BOLD.sub(r"<strong>\1</strong>", str(escape(_raise_marks(text))))
    return Markup(html.replace(_SUP_OPEN, "<sup>").replace(_SUP_CLOSE, "</sup>"))


def qr_svg(url: str) -> str:
    """The QR code for url as an inline `<svg>` element."""
    image = qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage, border=0)
    return _XML_DECL.sub("", image.to_string(encoding="unicode"))


def _logo_svg() -> str:
    return _XML_DECL.sub("", LOGO.read_text(encoding="utf-8")).strip()


def _address(address: dict) -> str:
    parts = (address.get("street"), address.get("office"))
    city = " ".join(p for p in (address.get("postalCode"), address.get("city")) if p)
    return ", ".join(p for p in (*parts, city, address.get("country")) if p)


def _pages(doc: dict) -> list[dict]:
    """Pages with their blocks numbered by the flat index used in text paths."""
    pages, n = [], 0
    for i, page in enumerate(doc.get("pages", [])):
        blocks = []
        for block in page.get("blocks", []):
            blocks.append({"n": n, "block": block})
            n += 1
        pages.append({"i": i, "title": page.get("title", []), "blocks": blocks})
    return pages


def _environment(work_dir: Path) -> Environment:
    base = Path(work_dir).absolute()
    env = Environment(
        loader=FileSystemLoader(TEMPLATES),
        autoescape=True,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["inline"] = inline
    env.filters["asset"] = lambda rel: (base / rel).as_uri()
    return env


def render_html(doc: dict, *, work_dir: Path, company: dict, branding: dict, today: date) -> str:
    product = doc.get("product", {})
    url = product.get("url") or branding["fallback_url"]
    template = _environment(work_dir).get_template("datasheet.html.j2")
    return template.render(
        product=product,
        pages=_pages(doc),
        html_lang="uk" if doc.get("lang") == "ua" else doc.get("lang", "en"),
        fonts_base=FONTS.resolve().as_uri() + "/",
        company={
            "name": company["name"]["ua"],
            "phone": company["phone"],
            "email": company["email"],
            "address": _address(company["address"]["ua"]),
        },
        branding=branding,
        rights=branding["rights"].format(year=today.year),
        logo=Markup(_logo_svg()),
        qr_url=url,
        qr=Markup(qr_svg(url)),
    )
