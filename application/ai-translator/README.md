# AI datasheet translator

Turns English WIPOTEC datasheet PDFs into OS-Technology branded Ukrainian PDFs. Python scripts
extract the source into YAML, render the Ukrainian YAML to a PDF and lint the result; an AI agent
fixes the extracted structure, translates and reviews the pages. The agent workflow is the skill
in `.claude/skills/translate-datasheet/SKILL.md` at the repository root.

Every output is reviewed by a human who reads Ukrainian. Nothing is published automatically: once
approved, the PDF is copied by hand to the website (`application/frontend/private/datasheets/`).

## Setup

Requires [uv](https://docs.astral.sh/uv/). From this folder:

```bash
uv sync
uv run playwright install chromium
```

## Commands

`<name>` is the file stem of a source PDF in `files/en/`, for example
`datasheet-checkweigher-hc-a`. A path to the PDF works too
(`.\files\en\datasheet-checkweigher-hc-a.pdf`): the folder and `.pdf` are dropped.

| Command                                                        | What it does                                                                                               |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `uv run translator extract <name> [--force]`                   | Drafts `work/<name>/en.yaml`, extracts `images/`, writes `contact-sheet.png` and `preview-en/`             |
| `uv run translator drawing <name> --page N --clip x0,y0,x1,y1` | Re-exports the vector drawing of page N with a clip (PDF points); adds a missing block to the last page    |
| `uv run translator cover <name> [--clip x0,y0,x1,y1]`          | Re-exports the cover drawing (page 1, clip auto-detected by default) and updates only `cover` in `en.yaml` |
| `uv run translator render <name>`                              | Prints `work/<name>/ua.yaml` to `files/ua/<name>.pdf`, writes `preview/` and `render-report.json`          |
| `uv run translator lint <name>`                                | Checks `ua.yaml` against `en.yaml`, `glossary.md` and the render report; exits 1 on errors                 |
| `uv run translator all <name>`                                 | `render`, then `lint`                                                                                      |
| `uv run pytest`                                                | Tests (the render tests need Chromium)                                                                     |
| `uv run ruff check . && uv run ruff format --check .`          | Lint and format check                                                                                      |

Lint errors: changed block structure or non-text values (`product.model`/`variant`, images,
drawing clips and pages, row `note` numbers, matrix cells, the cover `image`/`clip`/`label`), a
`cover` or `notes` present in only one of `en.yaml` and `ua.yaml`, numbers or footnote marks that differ
from `en.yaml`, numbers in `en.yaml` that are not in the source PDF, decimal commas, `Avoid`
fragments from the glossary, WIPOTEC branding, text overflowing its box, a stale render (the
output PDF is missing or `ua.yaml` changed since `render`; the report stores its SHA-256),
malformed YAML or glossary. Lint warnings: source PDF numbers missing from `en.yaml` (branding
lines, drawing dimensions and the "Personal notes" page are not counted), glossary terms not
rendered with the glossary wording, untranslated Latin words. `render` validates `ua.yaml` first.

## Folder layout

```
files/en/<name>.pdf        source datasheets (never edited)
files/ua/<name>.pdf        translated output for human review (committed)
work/<name>/
  en.yaml                  extracted source, fixed by the agent (committed)
  ua.yaml                  the translation (committed)
  images/                  extracted photos and drawings (committed)
  contact-sheet.png        every extracted image with its file name (ignored)
  preview-en/page-N.png    source pages (ignored)
  preview/page-N.png       rendered output pages (ignored)
  datasheet.html, render-report.json   render by-products (ignored)
glossary.md                translation terms and style rules, edited by the human
sources.yaml               WIPOTEC branding patterns and names never translated
branding.yaml              OS-Technology rights, disclaimer and site texts
templates/                 Jinja2 page template, block partials and CSS
fonts/                     bundled IBM Plex fonts (OFL)
translator/                the Python package
```

Company contacts come from `application/frontend/src/data/company.json` at render time.

## YAML format

`en.yaml` and `ua.yaml` have the same structure; `ua.yaml` differs only in text, `lang` and
`product.category`/`product.url`. Pages are fixed A4 sheets: content never flows between pages, the
`pages` list decides the page breaks.

```yaml
source: files/en/<name>.pdf
lang: en | ua
product: {model: HC-A, variant: BASIS, category: "", url: ""}   # variant, url optional
cover: {image: images/cover.svg, clip: [x0, y0, x1, y1],        # optional cover page
        subtitle: "Technical data", label: CW}
pages:
  - title: ["Technical", "data"]          # header band lines
    blocks:
      - {type: lead, text: str}
      - {type: columns, paragraphs: [str]}
      - {type: hero, image: images/photo-2-1.jpg,
         aside: [{style: light|dark, title: str, items: [str]}]}
      - {type: table, title: str, rows: [{label: str, value: str, note: int?}]}
      - {type: grid, title: str, header: [str], rows: [[str]]}
      - {type: matrix, title: str, corner: str, header: [str],
         rows: [{label: str, cells: ["x" | "-"]}]}
      - {type: drawing, image: images/drawing-5.svg, clip: [x0, y0, x1, y1], page: 5,
         labels: [{text: str, x: float, y: float}]}   # x, y in % of the drawing box
      - {type: footnotes, items: [str]}
      - {type: note, text: str}            # with **bold** markup it renders as a heading
notes: {title: ["PERSONAL", "NOTES"]}     # optional personal-notes page
```

`cover` prints a first page like the source cover: the model, the letter-spaced `subtitle`
(translated), the product-line `label` in a black square (a code, kept as it is) and the cover
drawing `image` cut from page 1 at `clip`; it has no footer. `notes` prints a last page with the
`title` in the header band, 15 lines for notes and the contact block with the QR code; without
`notes` the contact block sits on the last content page. Page numbers count every PDF page,
the cover included. The phone, e-mail, site and QR code are links in the PDF.

Headings use `**bold**` markup for the bold word (`"**BASE** DATA"`). A table row's `note: N`
prints the footnote mark `N)` after the label; a mark written inside text (`400 mm 1)`: one
digit and `)`, not glued to a word or number and not closing a parenthesis) is printed as a
superscript too, and lint compares marks separately from the other numbers. Lint and the overflow report address text by a
path with a flat block index across all pages, for example `block[4].rows[2].value`; the cover
and notes texts are `cover.subtitle` and `notes.title[j]`.
