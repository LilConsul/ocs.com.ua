# AI Datasheet Translator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A uv Python project plus an agent skill that turns an English WIPOTEC datasheet PDF into
an OS-Technology branded Ukrainian PDF, via an editable `ua.yaml` and a glossary-enforcing lint.

**Architecture:** `translator extract` reads the PDF with PyMuPDF into a typed-block `en.yaml`
plus images. The agent fixes the structure and writes `ua.yaml`. `translator render` turns
the YAML into HTML (Jinja2) and then an A4 PDF (Playwright Chromium), with page previews and an
overflow report. `translator lint` checks glossary, numbers, structure, branding and overflow.
The skill `.claude/skills/translate-datasheet/SKILL.md` runs the loop.

**Tech Stack:** Python >= 3.11, uv, PyMuPDF, Pillow, PyYAML, Jinja2, Playwright (Chromium),
qrcode, pytest, ruff.

**Spec:** `docs/superpowers/specs/2026-11-23-ai-datasheet-translator-design.md`

## Global Constraints

- Project root `application/ai-translator/`; run all commands below from there unless noted.
- Dependencies pinned to exact versions (`==`), as in `application/infra/pyproject.toml`.
  Pin the versions `uv add` resolves at the time of writing.
- Ruff line length 100. Ruff pre-commit hooks must cover `application/ai-translator/**/*.py`.
- Never edit `files/en/*.pdf`. Outputs go only to `files/ua/<name>.pdf`; nothing is copied to
  `application/frontend/`.
- `<name>` is the input file stem; the output keeps the same file name.
- Number format in Ukrainian text: decimal point, no thousands separator (`0.01 г`, `7500 г`).
- WIPOTEC sources only. Branding patterns and the never-translate allowlist live in
  `sources.yaml`, never in code.
- Contacts are read from `application/frontend/src/data/company.json` at render time.
- Fonts are bundled files (IBM Plex Sans, IBM Plex Sans Condensed, OFL). No network at render.
- No emojis anywhere. Commit messages: `type(scope): subject`, lowercase, imperative, at most
  72 characters, and NO `Co-Authored-By` line (AGENTS.md rule).
- The pre-commit hooks may modify files (mdformat, whitespace). If a commit fails because a
  hook changed files, `git add` them again and repeat the commit.

## Review Focus

1. **Repeated image xrefs at several positions.** On HC-A page 2, xref 7 fills all four tiles
   of the right column. Stitching must place a tile at every position it occupies, not drop
   repeats, or the photo gets a hole. Test in Task 4.
1. **Table cell text without spaces.** `Table.extract()` returns `Materialofmachine`. Cell text
   must come from `page.get_text("text", clip=cell)`, giving `Material of machine`. Test in Task 5.
1. **Split ligatures.** `signiﬁ cantly`, `eﬃ  ciency` and `certiﬁ cate` must become
   `significantly`, `efficiency` and `certificate`. Test in Task 1.
1. **Long Ukrainian words overflowing sideways.** A narrow box (the variant label, a table
   cell) can overflow horizontally without changing its height. The overflow check must compare
   width as well as height. Test in Task 7.
1. **Numbers that legitimately change form.** `4,000 g` -> `4000 г`, `15"` -> `15-дюймовий`,
   footnote marks `2)`, ranges `100-240`. The number check must accept all of these and still
   catch `750` -> `75`. Tests in Tasks 1 and 8.

______________________________________________________________________

## File Structure

```
application/ai-translator/
  pyproject.toml          project, deps, [project.scripts] translator = "translator.cli:main"
  README.md               manual usage, playwright install step
  sources.yaml            WIPOTEC branding regexes, never-translate allowlist
  branding.yaml           rights line, disclaimer, fallback QR URL
  glossary.md             Terms table + Style rules (draft seed)
  .gitignore              work/*/preview*/, contact-sheet.png, datasheet.html, render-report.json
  translator/
    __init__.py
    paths.py              DatasheetPaths, paths_for()
    text.py               normalise_text(), numbers(), number_style_errors()
    config.py             SourceConfig, load_config(), is_branding()
    glossary.py           Term, Glossary, load_glossary()
    model.py              load_doc/save_doc, validate, flat_blocks, shape, iter_text
    extract/
      __init__.py         run_extract()
      pdf.py              Span, page_spans(), table_cells_text()
      images.py           extract_rasters(), find_drawing_clip(), export_drawing(), contact_sheet()
      structure.py        build_draft()
    render/
      __init__.py         run_render()
      html.py             inline(), qr_svg(), render_html()
      pdf.py              print_pdf(), write_previews()
    lint.py               Issue, lint(), run_lint()
    cli.py                main()
  templates/
    datasheet.html.j2
    blocks/{lead,columns,hero,table,grid,matrix,drawing,footnotes,note}.html.j2
    style.css
  fonts/                  IBMPlexSans-{Light,Regular,SemiBold,Bold}.woff2,
                          IBMPlexSansCondensed-{Regular,SemiBold}.woff2, OFL.txt
  files/en/               inputs (exists)
  files/ua/               outputs
  work/<name>/            en.yaml, ua.yaml, images/ (committed); previews (ignored)
  tests/
    conftest.py           HC_A path fixture, tmp work root
    test_text.py test_config.py test_glossary.py test_model.py
    test_extract_images.py test_extract_structure.py
    test_render_html.py test_render_pdf.py test_lint.py test_cli.py
.claude/skills/translate-datasheet/SKILL.md
```

Modified: `.pre-commit-config.yaml` (ruff `files:`), `Makefile` (`test-translator`, `install-dev`),
`AGENTS.md` (pointer section).

## Datasheet YAML format (shared by every task)

Headings are strings with `**bold**` markup, which renders WIPOTEC's light+bold headings in either
word order (`"Основні **характеристики**"`, `"**Базові** дані"`). This replaces the spec's
"first element light" array convention for block and box titles. Page titles are a list of
lines, all bold.

```yaml
source: files/en/<name>.pdf
lang: en | ua
product: {model: HC-A, variant: BASIS, category: "", url: ""}   # variant/url optional
pages:
  - title: ["Technical", "data"]
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
         labels: [{text: str, x: float, y: float}]}        # x, y in % of the drawing box
      - {type: footnotes, items: [str]}
      - {type: note, text: str}
```

Text paths (used by lint, overflow report and `data-path` attributes) address blocks by their
flat index across pages, so they survive repagination: `product.category`, `page[1].title[0]`,
`block[4].rows[2].value`, `block[2].aside[0].items[3]`, `block[7].labels[0].text`.

______________________________________________________________________

### Task 1: Project scaffold and text normalisation

**Files:**

- Create: `pyproject.toml`, `translator/__init__.py`, `translator/paths.py`, `translator/text.py`,
  `.gitignore`, `tests/conftest.py`, `tests/test_text.py`
- Modify: `.pre-commit-config.yaml` (both ruff hooks: `files: ^application/(infra|ai-translator)/.*\.py$`),
  `Makefile` (add `test-translator: cd application/ai-translator && uv run pytest tests/ -v`, add
  it to `test:`, add `cd application/ai-translator && uv sync` to `install-dev`)

**Interfaces:**

- Produces:

  - `ROOT: Path` (application/ai-translator), `FRONTEND: Path` (application/frontend)
  - `DatasheetPaths` frozen dataclass: `name, source_pdf, work_dir, en_yaml, ua_yaml, images_dir, contact_sheet, preview_dir (work/<name>/preview), source_preview_dir (work/<name>/preview-en), html (work/<name>/datasheet.html), render_report (work/<name>/render-report.json), output_pdf`
  - `paths_for(name: str, root: Path = ROOT) -> DatasheetPaths`
  - `normalise_text(s: str) -> str`
  - `numbers(s: str) -> collections.Counter[str]`
  - `number_style_errors(s: str) -> list[str]`

- [ ] **Step 1: Create `pyproject.toml`**: name `ai-translator`, `requires-python = ">=3.11"`, deps
  `pymupdf pillow pyyaml jinja2 playwright qrcode`, dev group `pytest`, hatchling build with
  `packages = ["translator"]`, script `translator = "translator.cli:main"`, `[tool.ruff] line-length = 100`.
  Run `uv add` / `uv add --dev` so versions are resolved and pinned with `==`.

- [ ] **Step 2: Write failing tests in `tests/test_text.py`**

```python
def test_normalise_ligatures_and_split_space():
    assert normalise_text("signiﬁ cantly") == "significantly"
    assert normalise_text("eﬃ  ciency") == "efficiency"
    assert normalise_text("certiﬁ cate") == "certificate"

def test_normalise_hyphenated_line_break_and_whitespace():
    assert normalise_text("con-\ntinues  the\nuse") == "continues the use"
    assert normalise_text("Ethernet/IP, RS232") == "Ethernet/IP, RS232"

def test_numbers_normalises_thousands_and_footnotes():
    assert numbers("4,000 g") == Counter({"4000": 1})
    assert numbers("Interfaces 2)") == Counter()
    assert numbers("L1/N/PE; 100-240 VAC") == Counter({"1": 1, "100": 1, "240": 1})
    assert numbers("≥ 0.1 g") == numbers("≥ 0.1 г")

def test_numbers_catches_changed_value():
    assert numbers("750 g") != numbers("75 г")

def test_number_style_errors():
    assert number_style_errors("0,1 г") == ["0,1"]
    assert number_style_errors("RS232, RS422 і 7500 г") == []

def test_paths_for(tmp_path):
    p = paths_for("x", root=tmp_path)
    assert p.source_pdf == tmp_path / "files/en/x.pdf"
    assert p.output_pdf == tmp_path / "files/ua/x.pdf"
    assert p.ua_yaml == tmp_path / "work/x/ua.yaml"
```

- [ ] **Step 3: Run** `uv run pytest tests/test_text.py -v`. Expected: FAIL (import errors).
- [ ] **Step 4: Implement `paths.py` and `text.py`.** Ligatures U+FB00-FB06 map to ff, fi, fl,
  ffi, ffl, st, st. Whitespace directly after a ligature and before a lowercase letter is
  removed. `-\n` between letters is joined, then all whitespace collapses to single spaces and
  the result is stripped. `numbers`: first remove footnote marks `(?<![\w.,])\d\)`, then find
  `\d+(?:[.,]\d+)*`. Groups shaped `\d{1,3}(,\d{3})+` drop their commas; anything else keeps
  its value as written, with a comma read as a decimal point. `number_style_errors` returns the
  matches of `\d,\d+`. A comma followed by a space is not a match.
- [ ] **Step 5: Write `.gitignore`** with `work/*/preview/`, `work/*/preview-en/`,
  `work/*/contact-sheet.png`, `work/*/datasheet.html`, `work/*/render-report.json`, and make
  `conftest.py` provide the `hc_a_pdf` fixture (`ROOT / "files/en/datasheet-checkweigher-hc-a.pdf"`).
- [ ] **Step 6: Run** `uv run pytest -v` and `uv run ruff check . && uv run ruff format --check .`.
  Expected: all pass.
- [ ] **Step 7: Commit** `feat(ai-translator): scaffold project with text normalisation`.

### Task 2: Source config and glossary parser

**Files:**

- Create: `sources.yaml`, `translator/config.py`, `translator/glossary.py`, `tests/test_config.py`,
  `tests/test_glossary.py`

**Interfaces:**

- Produces:

  - `SourceConfig` frozen dataclass: `branding: tuple[re.Pattern, ...]`, `never_translate: frozenset[str]`
  - `load_config(path: Path = ROOT / "sources.yaml") -> SourceConfig`
  - `is_branding(text: str, cfg: SourceConfig) -> bool`
  - `Term` frozen dataclass: `en: str, ua: str, avoid: tuple[str, ...], note: str, status: str`
  - `Glossary` dataclass: `terms: list[Term], style_rules: str`
  - `load_glossary(path: Path) -> Glossary`; raises `GlossaryError` (with line number) on a row
    whose column count is not 5

- [ ] **Step 1: Write `sources.yaml`.** It holds `branding` regexes, matched case-insensitively:
  `WIPOTEC-OCS\s+GMBH`, `wipotec(-ocs)?\.com`, `all rights reserved`, `kaiserslautern`,
  `adam-hoffmann`, `\+49`, `headquarters`, `your sales\s+partner`, `personal\s+notes`,
  `all errors and misprints reserved`, `^(DE|EN|ES|FR|IT)(\s+(DE|EN|ES|FR|IT))+$`. It also holds
  `never_translate`, the mixed-case names allowed in Ukrainian text: WIPOTEC, Ethernet,
  EtherNet/IP, Profibus, ProfiNet. Keep only product, protocol and brand names (dialog
  languages and words like "Servo" are translated); the first real run may add more.

- [ ] **Step 2: Write failing tests.**

```python
def test_branding_detects_wipotec_footer_but_not_product_names():
    cfg = load_config()
    assert is_branding("WIPOTEC-OCS GMBH | ALL RIGHTS RESERVED", cfg)
    assert is_branding("www.wipotec-ocs.com", cfg)
    assert is_branding("DE        EN        ES        FR        IT", cfg)
    assert not is_branding("WIPOTEC EMFR Weigh Cell", cfg)

GLOSSARY = """# Glossary\n\n## Terms\n\n| EN | UA | Avoid | Note | Status |\n|----|----|-------|------|--------|
| checkweigher | контрольні ваги | чеквейєр; чекувач | | draft |
| tamper-evident | Захист від першого розкриття | розитну | site | ok |

## Style rules

- Decimal point: 0.01 г
"""

def test_load_glossary(tmp_path):
    p = tmp_path / "g.md"; p.write_text(GLOSSARY, encoding="utf-8")
    g = load_glossary(p)
    assert g.terms[0] == Term("checkweigher", "контрольні ваги", ("чеквейєр", "чекувач"), "", "draft")
    assert g.terms[1].status == "ok"
    assert "Decimal point" in g.style_rules

def test_load_glossary_rejects_bad_row(tmp_path):
    p = tmp_path / "g.md"; p.write_text(GLOSSARY.replace("| site | ok |", "| ok |"), encoding="utf-8")
    with pytest.raises(GlossaryError, match="line 8"):
        load_glossary(p)
```

- [ ] **Step 3: Run** `uv run pytest tests/test_config.py tests/test_glossary.py -v`. Expected: FAIL.
- [ ] **Step 4: Implement.** The glossary parser reads the table rows under `## Terms`
  (skipping the header and `---` separator rows), splits on `|` and strips the cells, so the
  column padding mdformat adds doesn't matter. `avoid` splits on `;` and drops empty parts.
  `style_rules` is the raw text of the `## Style rules` section.
- [ ] **Step 5: Run the tests again.** Expected: PASS.
- [ ] **Step 6: Commit** `feat(ai-translator): add source config and glossary parser`.

### Task 3: Datasheet document model

**Files:**

- Create: `translator/model.py`, `tests/test_model.py`

**Interfaces:**

- Produces:

  - `BLOCK_TYPES: dict[str, tuple[str, ...]]` (required keys per type, per the YAML format above)
  - `load_doc(path: Path) -> dict`, `save_doc(doc: dict, path: Path) -> None` (UTF-8,
    `allow_unicode=True, sort_keys=False, width=100`)
  - `validate(doc: dict) -> list[str]` (error strings carrying the text path)
  - `flat_blocks(doc: dict) -> list[dict]`
  - `shape(block: dict) -> tuple` (type plus list lengths: rows, items per aside box,
    paragraphs, header, labels, cells per matrix row)
  - `iter_text(doc: dict) -> Iterator[tuple[str, str]]` over every translatable string, with the
    paths above. Skipped: `source`, `lang`, `image`, `clip`, `page`, `note`, matrix `cells`,
    `product.model`, `product.variant`, `product.url`.

- [ ] **Step 1: Write failing tests.** Use a fixture doc with two pages (a `table` with two rows
  on page 1; a `hero` with two aside boxes and a `footnotes` block on page 2).

```python
def test_iter_text_paths_use_flat_block_index(doc):
    paths = dict(iter_text(doc))
    assert paths["block[0].rows[1].value"] == "250 kg"
    assert paths["block[1].aside[1].items[0]"] == "Maximum output 600 pcs/min"
    assert "block[1].image" not in paths

def test_shape_ignores_page_grouping(doc):
    moved = copy.deepcopy(doc)
    moved["pages"][0]["blocks"].append(moved["pages"][1]["blocks"].pop(0))
    assert [shape(b) for b in flat_blocks(moved)] == [shape(b) for b in flat_blocks(doc)]

def test_validate_reports_unknown_type_and_missing_key(doc):
    doc["pages"][0]["blocks"].append({"type": "banner"})
    doc["pages"][1]["blocks"][0].pop("aside")
    errors = validate(doc)
    assert any("block[3]" in e and "banner" in e for e in errors)
    assert any("block[1]" in e and "aside" in e for e in errors)

def test_save_load_roundtrip_keeps_cyrillic(tmp_path, doc):
    doc["product"]["category"] = "Контрольні ваги"
    save_doc(doc, tmp_path / "d.yaml")
    assert "Контрольні ваги" in (tmp_path / "d.yaml").read_text(encoding="utf-8")
    assert load_doc(tmp_path / "d.yaml") == doc
```

- [ ] **Step 2: Run** `uv run pytest tests/test_model.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement `model.py`.**
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(ai-translator): add datasheet yaml model`.

### Task 4: Image and drawing extraction

**Files:**

- Create: `translator/extract/__init__.py` (empty for now), `translator/extract/images.py`,
  `tests/test_extract_images.py`

**Interfaces:**

- Produces:

  - `ExtractedImage` dataclass: `id: str, page: int (1-based), path: Path, width: int, height: int`
  - `extract_rasters(doc: pymupdf.Document, out_dir: Path) -> list[ExtractedImage]`
  - `find_drawing_clip(page: pymupdf.Page) -> pymupdf.Rect | None`
  - `Label` dataclass: `text: str, x: float, y: float`
  - `export_drawing(doc: pymupdf.Document, page_index: int, clip: pymupdf.Rect, out_svg: Path) -> list[Label]`
  - `contact_sheet(images: list[Path], out: Path) -> None`

- [ ] **Step 1: Write failing tests** against the HC-A sample (`hc_a_pdf` fixture).

```python
def test_photo_tiles_are_stitched_into_one_image(hc_a_pdf, tmp_path):
    imgs = extract_rasters(pymupdf.open(hc_a_pdf), tmp_path)
    photos = [i for i in imgs if i.page == 2]
    assert len(photos) == 1
    assert 2280 <= photos[0].width <= 2310 and 1680 <= photos[0].height <= 1700

def test_repeated_xref_fills_every_position(hc_a_pdf, tmp_path):
    img = Image.open(extract_rasters(pymupdf.open(hc_a_pdf), tmp_path)[0].path).convert("L")
    w, h = img.size
    for fy in (0.1, 0.35, 0.6, 0.85):          # right column, each tile row
        assert img.getpixel((int(w * 0.95), int(h * fy))) > 200   # light background, not a black hole

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
    assert [l.text for l in labels] == ["working direction"]
    assert 0 <= labels[0].x <= 100 and 0 <= labels[0].y <= 100
    assert (tmp_path / "drawing-5.svg").stat().st_size > 10_000
    assert "working direction" not in pymupdf.open(tmp_path / "drawing-5.svg")[0].get_text()
```

- [ ] **Step 2: Run** `uv run pytest tests/test_extract_images.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement `extract_rasters`.**
  - Drop images whose bbox `y0 >= 0.88 * page.rect.height` (the footer zone: it catches the
    WIPOTEC footer strips at y 808 and the page-6 QR at y 752, while the lowest photo tile row
    starts at y 707) or whose pixel width or height is under 64.
  - Cluster the remaining image bboxes on each page where they touch (2 pt tolerance), and
    keep one entry per bbox, even when the same xref repeats.
  - Stitch each cluster on a canvas of `cluster_bbox * scale`, where `scale` is the largest
    tile px/pt. Paste each tile, decoded with `pymupdf.Pixmap(doc, xref)` into Pillow, resized
    to its scaled bbox.
  - Save as `photo-<page>-<k>.jpg` (quality 90).
- [ ] **Step 4: Implement `find_drawing_clip`.** It returns None unless the page has 150 or more
  drawing ops and no image of 64 px or more. Otherwise it unions the rects of drawings with
  `y0 > 125` whose `y1` is above the top of the first `page.find_tables()` table (or above
  `page.rect.height - 60` when there are no tables), clips to the page and pads by 4 pt.
- [ ] **Step 5: Implement `export_drawing`.**
  - Copy the page into a new document with `insert_pdf`.
  - Word labels are spans inside `clip` containing two or more consecutive letters that don't
    match `^R\d+$`. Redact them with text-only redaction: images and line art keep (`images=0`,
    `graphics=0`).
  - Set the cropbox to `clip`, write `get_svg_image(text_as_path=True)`, and return the labels
    with their top-left corners as a percentage of `clip`.
- [ ] **Step 6: Implement `contact_sheet`.** Thumbnails 300 px wide in a 3-column grid with the
  file name captioned under each. SVGs are rasterised by opening them with PyMuPDF.
- [ ] **Step 7: Run the tests again.** Expected: PASS. Look at the stitched JPEG once and confirm
  it shows the clean machine photo.
- [ ] **Step 8: Commit** `feat(ai-translator): extract photos and vector drawings`.

### Task 5: Draft structure extraction and `extract` command

**Files:**

- Create: `translator/extract/pdf.py`, `translator/extract/structure.py`, `translator/cli.py`,
  `tests/test_extract_structure.py`, `tests/test_cli.py`
- Modify: `translator/extract/__init__.py`, `tests/conftest.py` (add `tmp_root`: a temp dir
  holding a copy of the HC-A PDF at `files/en/`)

**Interfaces:**

- Consumes: `normalise_text`, `SourceConfig`/`is_branding`, `save_doc`/`validate`, Task 4 functions.

- Produces:

  - `Span` dataclass: `text: str, bbox: tuple[float, float, float, float], size: float, bold: bool`
  - `page_spans(page) -> list[Span]` (normalised text; `bold` if the font name contains Bold or
    Semibold)
  - `table_cells_text(page, table) -> list[list[str | None]]` (None for merged cells)
  - `build_draft(doc, cfg, images: list[ExtractedImage], drawings: dict[int, tuple[str, Rect, list[Label]]], source: str) -> dict`
  - `run_extract(paths: DatasheetPaths, cfg: SourceConfig, force: bool = False) -> list[str]`
    (returns warnings). It refuses to overwrite an existing `en.yaml` unless `force`. It writes
    `en.yaml`, `images/`, `contact-sheet.png` and `preview-en/page-N.png` (80 dpi).
  - `main(argv: list[str] | None = None) -> int` with subcommands `extract <name> [--force]` and
    `drawing <name> --page N --clip x0,y0,x1,y1`. The second re-exports one drawing and updates
    that block's `image`, `clip` and `labels` in `en.yaml`.

- [ ] **Step 1: Write failing tests** on HC-A (run `build_draft` once in a module-scoped fixture).

```python
def test_product_and_page_titles(draft):
    assert draft["product"]["model"] == "HC-A" and draft["product"]["variant"] == "BASIS"
    assert draft["pages"][0]["title"] == ["FOR THE HIGHEST STANDARDS", "IN DYNAMIC WEIGHING"]
    assert len(draft["pages"]) == 4          # cover and personal-notes pages dropped

def test_table_cells_keep_spaces(draft):
    table = next(b for b in flat_blocks(draft) if b["type"] == "table")
    assert table["rows"][0] == {"label": "Material of machine", "value": "Frame stainless steel V2A/AISI 304"}
    assert len(table["rows"]) == 19

def test_grid_and_matrix_detected(draft):
    types = [b["type"] for b in flat_blocks(draft)]
    assert types.count("grid") == 1 and types.count("matrix") == 2 and types.count("drawing") == 1
    grid = next(b for b in flat_blocks(draft) if b["type"] == "grid")
    assert len(grid["header"]) == 8 and len(grid["rows"]) == 6

def test_no_branding_and_valid(draft):
    cfg = load_config()
    assert not any(is_branding(t, cfg) for _, t in iter_text(draft))
    assert validate(draft) == []

def test_cli_extract_refuses_overwrite(tmp_root):   # tmp_root: copy of files/en/HC-A under tmp
    assert main(["extract", "datasheet-checkweigher-hc-a", "--root", str(tmp_root)]) == 0
    assert main(["extract", "datasheet-checkweigher-hc-a", "--root", str(tmp_root)]) == 1
```

(`--root` is a hidden global option, default `ROOT`, used by tests.)

- [ ] **Step 2: Run** `uv run pytest tests/test_extract_structure.py tests/test_cli.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement `page_spans` and `table_cells_text`.**
- [ ] **Step 4: Implement `build_draft` heuristics, in this order on each page.**
  1. Skip a page when any span `is_branding` with `personal notes`. Also skip it when it has
     no tables, no images, no drawing clip and fewer than 8 spans (the cover).
  1. Header band, spans with `y1 < 125`. On the right (`x0 > 0.6 * width`), the largest span is
     `product.model` and the other is `product.variant`. On the left, the lines form the page
     title.
  1. Drop branding spans.
  1. Tables from `find_tables()`:
     - 2 columns gives `table`;
     - more columns where at least 60% of the body cells are `x` or `-` gives `matrix`
       (row 0 is the title, row 1 col 0 is `corner`);
     - anything else gives `grid`.
       A footnote digit glued to a label (`Interfaces 2)`) moves to `note`. The bold+light heading
       right above a table becomes its `title`, with `**bold**` markup.
  1. Filled drawing rects that contain a heading and bullet lines become `aside` boxes,
     `dark` when the fill luminance is under 0.5. They join the page's photo as a `hero` block.
  1. Lines starting `\d\)` become one `footnotes` block per page.
  1. Remaining text, where the first block is larger than body size, becomes `lead`; body
     paragraphs (text blocks of the widest repeated column width) become `columns`; anything
     left becomes `note`.
  1. Drawing pages get a `drawing` block.
     Set `product.category` and `product.url` to `""`.
- [ ] **Step 5: Implement `run_extract` and the CLI.** The CLI exits 1 with a clear message on a
  missing source PDF or an existing `en.yaml`.
- [ ] **Step 6: Run the tests again.** Expected: PASS. Run
  `uv run translator extract datasheet-checkweigher-hc-a` for real and skim `en.yaml` against
  `preview-en/`. Leave the real `work/` output uncommitted; Task 10 owns it.
- [ ] **Step 7: Commit** `feat(ai-translator): draft en.yaml from datasheet pdf`.

### Task 6: HTML template and branding

**Files:**

- Create: `branding.yaml`, `fonts/*` (download from the official IBM Plex GitHub release, with
  `OFL.txt`), `templates/datasheet.html.j2`, `templates/blocks/*.html.j2`, `templates/style.css`,
  `translator/render/__init__.py` (empty for now), `translator/render/html.py`,
  `tests/test_render_html.py`, `tests/fixtures/sample/ua.yaml` (one page per two or three
  blocks, every block type once, short Ukrainian text, `images/` with a small JPEG and SVG)
- Modify: `tests/conftest.py` (add `doc`, `company` (the real `company.json`), `branding`
  fixtures from the sample, and `fixture_paths`: `paths_for("sample", root=tmp)` with the
  sample copied into `work/sample/`)

**Interfaces:**

- Consumes: `load_doc`, `flat_blocks`, `FRONTEND`.

- Produces:

  - `inline(text: str) -> markupsafe.Markup` (HTML-escape, then `**x**` to `<strong>x</strong>`)
  - `qr_svg(url: str) -> str` (inline `<svg>`, `qrcode.image.svg.SvgPathImage`)
  - `render_html(doc: dict, *, work_dir: Path, company: dict, branding: dict, today: date) -> str`
  - Every element that renders a text path carries `data-path="<path>"`. Each page is a
    `section.page`; fixed-size boxes that must not overflow carry class `fit`.

- [ ] **Step 1: Write `branding.yaml`.**

```yaml
rights: "© {year} ОС-Технолоджи Україна"
disclaimer: "Можливі помилки та друкарські неточності. Дані можуть бути змінені. Зазначені торгові марки належать їхнім власникам."
site: "ocs.com.ua"
fallback_url: "https://ocs.com.ua/ua"
```

- [ ] **Step 2: Write failing tests** (a doc fixture covering every block type, `ua` text).

```python
def test_renders_every_block_type_and_paths(html):
    for t in ("lead", "columns", "hero", "table", "grid", "matrix", "drawing", "footnotes", "note"):
        assert f'data-block="{t}"' in html
    assert 'data-path="block[0].text"' in html

def test_footer_uses_company_json_and_rights_year(html):
    assert "+38 067 35 33 853" in html and "info@ocs.com.ua" in html
    assert "© 2026 ОС-Технолоджи Україна" in html          # today=date(2026, 11, 23)
    assert "wipotec" not in html.lower().replace("wipotec emfr", "")

def test_inline_escapes_then_bolds():
    assert inline("**Base** <data>") == "<strong>Base</strong> &lt;data&gt;"

def test_qr_falls_back_when_url_empty(doc, company, branding, tmp_path):
    doc["product"]["url"] = ""
    html = render_html(doc, work_dir=tmp_path, company=company, branding=branding, today=date(2026, 11, 23))
    assert html.count("<svg") >= 2                         # logo + QR
```

- [ ] **Step 3: Run** `uv run pytest tests/test_render_html.py -v`. Expected: FAIL.
- [ ] **Step 4: Implement the template and CSS.** The look follows the spec's "Template look"
  section.
  - Page: A4 at `@page { size: A4; margin: 0 }`, each `section.page` exactly 210 x 297 mm.
  - Header band: grey (`#d9d9d9`) and 44 mm tall, page title lines bold uppercase on the left,
    model plus boxed variant on the right. The variant box border uses the magenta accent
    `#c6005c`.
  - `.page-content`: a fixed-height `fit` area. Footer: 18 mm, with the logo
    (`FRONTEND/public/assets/icons/logo-ua.svg` inlined), company `name.ua`, phone, email, the
    address from `address.ua`, `branding.site` and the page number. The rights line sits under it.
  - The last page adds a contact block with the QR code for `product.url` or `fallback_url`,
    plus the disclaimer.
  - Text: IBM Plex Sans, 9 pt body, light/bold headings. Tables and grids: IBM Plex Sans
    Condensed 8.5 pt, zebra `#e6e6e6`.
  - Aside boxes: `light` is `#e6e6e6`, `dark` is `#444` with white text. Check icons are inline
    SVG in magenta.
  - Drawing: an `<img>` of the SVG with absolutely positioned label spans at `left: x%; top: y%`.
  - Footnote `note: N` renders `<sup>N)</sup>`.
  - Image and font URLs are `file://` URIs resolved from `work_dir` and `ROOT`.
- [ ] **Step 5: Run the tests again.** Expected: PASS.
- [ ] **Step 6: Commit** `feat(ai-translator): add branded datasheet html template`.

### Task 7: PDF printing, previews and overflow report

**Files:**

- Create: `translator/render/pdf.py`, `tests/test_render_pdf.py`
- Modify: `translator/render/__init__.py`, `translator/cli.py` (add `render <name>`)

**Interfaces:**

- Consumes: `render_html`, `paths_for`.

- Produces:

  - `print_pdf(html_path: Path, out_pdf: Path) -> list[dict]`. Overflow entries are
    `{"page": int (1-based), "path": str | None, "dx": float, "dy": float}`: one for every `.fit`
    element whose scrollWidth or scrollHeight exceeds its client size by more than 1 px, with
    `path` taken from the nearest `data-path` inside or on it.
  - `write_previews(pdf: Path, out_dir: Path, dpi: int = 110) -> list[Path]` (`page-N.png`, after
    clearing old files)
  - `run_render(paths: DatasheetPaths, today: date | None = None) -> dict`. It writes
    `datasheet.html`, `output_pdf`, previews and `render_report` JSON
    `{"pages": int, "overflow": [...]}`, and returns the report.
  - If Chromium is not installed, it raises `RenderError("Chromium missing: run uv run playwright install chromium")`.

- [ ] **Step 1: Write failing tests** (they need Chromium installed: `uv run playwright install chromium`).

```python
def test_render_writes_pdf_previews_and_report(fixture_paths):
    report = run_render(fixture_paths, today=date(2026, 11, 23))
    assert fixture_paths.output_pdf.exists()
    assert report["pages"] == len(load_doc(fixture_paths.ua_yaml)["pages"])
    assert len(list(fixture_paths.preview_dir.glob("page-*.png"))) == report["pages"]
    assert report["overflow"] == []

def test_vertical_overflow_reported_with_path(fixture_paths):
    doc = load_doc(fixture_paths.ua_yaml)
    doc["pages"][0]["blocks"][0]["text"] = "Дуже довгий текст. " * 2000
    save_doc(doc, fixture_paths.ua_yaml)
    report = run_render(fixture_paths, today=date(2026, 11, 23))
    assert report["overflow"] and report["overflow"][0]["page"] == 1

def test_horizontal_overflow_in_variant_box(fixture_paths):
    doc = load_doc(fixture_paths.ua_yaml)
    doc["product"]["variant"] = "Надзвичайнодовгенькийваріантбезпробілів"
    save_doc(doc, fixture_paths.ua_yaml)
    assert any(o["dx"] > 0 for o in run_render(fixture_paths, today=date(2026, 11, 23))["overflow"])

def test_pdf_has_cyrillic_text_and_no_wipotec_contacts(fixture_paths):
    run_render(fixture_paths, today=date(2026, 11, 23))
    text = "".join(p.get_text() for p in pymupdf.open(fixture_paths.output_pdf))
    assert "ОС-Технолоджи" in text and "wipotec-ocs.com" not in text.lower()
```

- [ ] **Step 2: Run** `uv run pytest tests/test_render_pdf.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement.** Use the Playwright sync API: `goto` the HTML file URI, await
  `document.fonts.ready`, run the overflow script over `.fit`, then
  `page.pdf(format="A4", print_background=True, prefer_css_page_size=True)`. Render previews with
  PyMuPDF. The `render` CLI prints the PDF path, the page count and each overflow line
  `page N <path>: +dx/+dy px`, and exits 0 even when there is overflow (lint decides).
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(ai-translator): print datasheet pdf with overflow report`.

### Task 8: Lint and the `lint` / `all` commands

**Files:**

- Create: `translator/lint.py`, `tests/test_lint.py`
- Modify: `translator/cli.py` (add `lint <name>`, `all <name>` = render then lint)

**Interfaces:**

- Consumes: `iter_text`, `flat_blocks`, `shape`, `validate`, `numbers`, `number_style_errors`,
  `Glossary`, `SourceConfig`, `is_branding`.
- Produces:
  - `Issue` frozen dataclass: `level: Literal["error", "warning"], path: str, message: str`
  - `lint(en: dict, ua: dict, glossary: Glossary, cfg: SourceConfig, report: dict | None, pdf_text: str | None) -> list[Issue]`
  - `run_lint(paths: DatasheetPaths) -> int` (prints `<ua.yaml>:<path>: <level>: <message>`,
    returns 1 if any error)

Rules, with paths compared only where both docs have them:

| Level   | Rule                                                                                                                                               |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| error   | `validate(ua)` errors; `ua["lang"] != "ua"`; empty `product.category`                                                                              |
| error   | flat block count or any `shape` differs                                                                                                            |
| error   | glossary `avoid` fragment found (case-insensitive substring) in any UA text                                                                        |
| error   | `numbers(en_text) != numbers(ua_text)` for a shared path (message lists missing/extra)                                                             |
| error   | `number_style_errors(ua_text)` non-empty                                                                                                           |
| error   | `is_branding` on any UA text or on any line of `pdf_text`                                                                                          |
| error   | `report is None` ("run render first") or any overflow entry                                                                                        |
| warning | Latin word (`[A-Za-z][A-Za-z/-]+`) in UA text, not all-caps, no digit, not in `never_translate`                                                    |
| warning | EN text contains a glossary `en` term (case-insensitive) but UA text lacks its stems (each word of `ua` cut to `max(4, len - 2)` chars, lowercase) |

- [ ] **Step 1: Write failing tests**, one per rule, built from a small en/ua pair that passes
  cleanly and then gets one targeted mutation each. Assertions to include:

```python
def test_clean_pair_has_no_issues(en, ua, glossary, cfg, ok_report):
    assert lint(en, ua, glossary, cfg, ok_report, "ОС-Технолоджи") == []

def test_changed_number_is_error(en, ua, glossary, cfg, ok_report):
    ua["pages"][0]["blocks"][0]["rows"][0]["value"] = "75 г"            # en: "750 g"
    assert [i.path for i in lint(en, ua, glossary, cfg, ok_report, "") if i.level == "error"] == ["block[0].rows[0].value"]

def test_legit_number_changes_pass(en, ua, glossary, cfg, ok_report):
    en["pages"][0]["blocks"][0]["rows"][0]["value"] = '4,000 g; 15" display, 100-240 VAC'
    ua["pages"][0]["blocks"][0]["rows"][0]["value"] = "4000 г; 15-дюймовий дисплей, 100-240 VAC"
    assert lint(en, ua, glossary, cfg, ok_report, "") == []

def test_avoid_fragment_matches_inflected_form(...):  # avoid "розитну" hits "розитнуті"
def test_decimal_comma_is_error(...):
def test_branding_in_pdf_text_is_error(...):           # pdf_text "www.wipotec-ocs.com"
def test_missing_report_and_overflow_are_errors(...):
def test_repaginated_ua_passes_structure(...):         # move a block to a new page
def test_latin_word_warning_respects_allowlist(...):   # "Profibus" ok, "conveyor" warns
def test_glossary_term_missing_warns_not_errors(...):
```

- [ ] **Step 2: Run** `uv run pytest tests/test_lint.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement `lint.py` and the CLI commands.** `run_lint` reads `en.yaml`,
  `ua.yaml`, `glossary.md`, `render-report.json` (if present) and the output PDF text (if
  present).
- [ ] **Step 4: Run** `uv run pytest -v`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat(ai-translator): add translation lint`.

### Task 9: Draft glossary from site content

**Files:**

- Create: `glossary.md`

- Modify: `tests/test_glossary.py` (add a test for the real file)

- [ ] **Step 1: Write the failing test.**

```python
def test_repo_glossary_is_valid_draft():
    g = load_glossary(ROOT / "glossary.md")
    assert len(g.terms) >= 25
    assert {t.status for t in g.terms} <= {"draft", "ok"}
    assert "decimal point" in g.style_rules.lower()
```

- [ ] **Step 2: Run it.** Expected: FAIL (no file).
- [ ] **Step 3: Write `glossary.md`.** A short intro says the file is a draft awaiting human
  review, and that rows move from `draft` to `ok` when confirmed. Then come `## Terms` and
  `## Style rules`.
  - **Terms**, all `draft`: pair each `src/content/equipment/**/*.ua.md` with its `.en.md`
    (spec labels, titles, body) and collect the recurring technical terms. Add every technical
    term in the HC-A `en.yaml`, using the site's Ukrainian wording where it exists. Grep the
    frontend content for `першого розкриття` and pair it with its English source if found;
    otherwise add the row with EN `(unknown)` and note it. Fill `Avoid` only with variants
    actually seen as wrong (for example from `git log -p` content fixes); leave it empty
    otherwise.
  - **Style rules:**
    - decimal point, no thousands separator (`0.01 г`, `7500 г`);
    - Cyrillic units as on the site (`г`, `кг`, `мм`, `уп/хв`);
    - model codes, certificate numbers, protocol names and IP ratings stay verbatim;
    - translate meaning and silently fix source typos (`lenght`, `rage`);
    - never add or drop content;
    - names in `sources.yaml` `never_translate` stay in Latin script.
- [ ] **Step 4: Run** `uv run pytest tests/test_glossary.py -v`. Expected: PASS.
- [ ] **Step 5: Commit** `docs(ai-translator): add draft translation glossary`.

### Task 10: Skill, README and first real run on HC-A

**Files:**

- Create: `.claude/skills/translate-datasheet/SKILL.md`, `application/ai-translator/README.md`,
  `work/datasheet-checkweigher-hc-a/{en.yaml,ua.yaml,images/*}`,
  `files/ua/datasheet-checkweigher-hc-a.pdf`

- Modify: `AGENTS.md` (new section "AI datasheet translator": pointer to the skill and README;
  add `application/ai-translator` to the repo overview line)

- [ ] **Step 1: Write `SKILL.md`.** The frontmatter `description` triggers on translating or
  localising a WIPOTEC datasheet or PDF from `application/ai-translator/files/en` into Ukrainian.
  The body covers the spec's skill section and nothing more:

  1. prerequisites (`uv sync`, `uv run playwright install chromium`);
  1. `translator extract <name>`;
  1. compare `en.yaml` against `preview-en/` and `contact-sheet.png`, fix the blocks, and use
     `translator drawing` to re-clip;
  1. read `glossary.md` in full;
  1. write `ua.yaml` by copying `en.yaml` and translating only text fields, setting `lang: ua`,
     `product.category` and `product.url`
     (`https://ocs.com.ua/ua/catalogue/equipment/<category>/<slug>` when the product exists in
     `application/frontend/src/content/equipment/`);
  1. `translator all <name>`, then look at every `preview/page-N.png`. Fix by editing text or
     moving blocks between pages; never shrink fonts. Repeat until lint has no errors and the
     pages look right;
  1. hand over: report the PDF path, each remaining warning with its reason, and proposed
     glossary rows. Never edit `glossary.md` without the human's approval.

- [ ] **Step 2: Write `README.md`.** It covers setup, the commands, the folder layout, and that
  outputs are reviewed by a human and copied by hand.

- [ ] **Step 3: Run the skill end to end on `datasheet-checkweigher-hc-a`,** following SKILL.md
  literally, as the acceptance test. Fix pipeline bugs found on the way in the owning module, each
  with a regression test.

- [ ] **Step 4: Verify.**

  - `uv run translator lint datasheet-checkweigher-hc-a` exits 0.
  - `uv run pytest -v` passes.
  - Ruff check and format are clean.
  - Every preview page has been viewed: no clipped text, no WIPOTEC contacts, OS-Technology
    footer on every page, QR on the last page.

- [ ] **Step 5: Commit** `feat(ai-translator): add translate-datasheet skill and hc-a output`
  (includes `en.yaml`, `ua.yaml`, `images/`, the UA PDF, SKILL.md, README, AGENTS.md).
