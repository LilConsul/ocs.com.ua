# AI Datasheet Translator - Design

Date: 2026-11-23
Status: approved

## Intent

OS-Technology Ukraine distributes WIPOTEC-OCS equipment. The manufacturer publishes
product datasheets as English PDFs. We need Ukrainian versions carrying OS-Technology
branding instead of WIPOTEC's footer, rights line, contacts and QR code.

Machine translation of these documents keeps getting industry terms wrong. For example,
the established term is "Захист від першого розкриття", not a loose paraphrase such as
"Захист від розитну". (The English source terms in this document's glossary examples are
illustrative.)
We keep a growing set of translation notes, and every translation must follow them.

The workflow is driven by an AI agent (Claude Code, Codex, Bob or similar) that follows a
project skill and calls deterministic Python tools. A human who reads Ukrainian reviews each
finished PDF and decides where it goes. The pipeline never publishes anything itself.

## Goals

- Turn an English WIPOTEC datasheet PDF into a Ukrainian PDF rendered from our own HTML
  template. The template borrows the WIPOTEC datasheet look (grey header band, light+bold
  headings, feature boxes, zebra spec tables) and carries OS-Technology branding.
- Enforce the translation notes twice: as instructions to the agent and as an automated
  `lint` check that fails on forbidden variants.
- Keep an editable structured source (`ua.yaml`) between the PDF and the translation, so
  fixing one term means editing one line and re-rendering, without translating again.
- Produce the same result whichever agent runs it: the scripts do the mechanical work and
  the agent does only judgement calls (structure fixes, translation, visual review).
- Work for other WIPOTEC datasheets than HC-A (metal detectors, X-ray, other
  checkweighers), whose layouts and image setups differ. Only WIPOTEC sources are in scope;
  Mesutronic and other manufacturers are not.

## Non-goals

- English output in our branding. English stays the original WIPOTEC PDF.
- Copying finished PDFs into `application/frontend/private/datasheets/` or wiring them into
  equipment content. A human does that by hand.
- Calling an LLM API from scripts. No API keys, no `translate.py`. It can be added later
  on top of the same YAML files without changing anything else.
- Pixel-perfect reproduction of the original layout.

## Anti-goals (failure even if it "works")

- A number, unit, model code or certificate number changes or disappears in translation.
- A term listed as wrong in the glossary appears in output.
- Any WIPOTEC contact, address, phone, URL, QR code or "WIPOTEC-OCS GMBH | ALL RIGHTS
  RESERVED" line remains. Product and component names ("WIPOTEC EMFR Weigh Cell", the
  logo printed on the machine in the photo) are fine: that is the product.
- Text overflowing or being clipped on a page and nobody noticing.
- Each run producing a differently structured document (the reason for scripts over ad hoc
  agent code).

## Findings about the source PDFs (from `datasheet-checkweigher-hc-a.pdf`)

- Six A4 pages, Adobe InDesign 14 export from 2019. Owner-password encrypted
  (AES-128): `pypdf` without `cryptography` fails, PyMuPDF opens and extracts it fine.
- Text is real text in Myriad Pro subsets with no Cyrillic glyphs, so the original
  cannot be edited in place. Some words extract with split ligatures ("signiﬁ cantly",
  "eﬃ  ciency"). Extraction must normalise ligatures (U+FB00-FB06) and the spurious space
  after them, and rejoin hyphenated line breaks ("con-\\ntinues").
- Pages: 1 cover (vector lettering "TECHNICAL DATA / CW / HC-A"), 2 intro, body text,
  "Main features", "Your benefits" and a product photo, 3 "Base data" and "Weighing details"
  tables with footnotes, 4 "Conveyor dimensions" matrix tables (width x length, x/- marks),
  5 dimension drawing, legend table and notes, 6 "Personal notes", WIPOTEC address block,
  QR code, language tabs.
- The product photo on page 2 is a 4x4 grid of greyscale JPEG tiles (574x422 px each,
  about 2300x1690 px stitched). One xref repeats in the right column (blank background).
  The feature boxes are vector shapes and text over the photo, so the stitched image is clean.
- The bottom strip images on page 2 (y > 808 pt) are the WIPOTEC footer rendered as
  images and must be discarded. The page 6 PNG (242x242) is the WIPOTEC QR code.
- The page 5 drawing is pure vector (276 drawing ops, no images). Its labels are real text:
  dimension letters (A-G), numbers (440, 1050, 1591, R535, 90°) and one English phrase
  ("working direction").
- Every page carries "WIPOTEC-OCS GMBH | ALL RIGHTS RESERVED" and "WWW.WIPOTEC-OCS.COM".
- The source has typos ("lenght", "rage", "calibrati-on"). The translation should
  translate the meaning, not reproduce the typo.

## Approaches considered

1. **Project skill plus deterministic Python tools (chosen).** Scripts extract, render and
   lint. The agent fixes extraction structure, translates with the glossary and reviews
   rendered pages. Works with any agent, needs no API key, and the glossary is enforced by
   both the instructions and `lint`.
1. **Fully scripted pipeline calling an LLM API.** One command per folder, good for batches.
   Rejected: needs an API key and costs per run, nobody looks at pages in between, and it
   is not the agent workflow asked for.
1. **Skill only, no scripts.** The agent writes PyMuPDF and HTML code each time.
   Rejected: output differs between runs, which is the problem being solved.

Also rejected earlier: overlaying Ukrainian text onto the original PDF pages. Chosen
instead: re-render from our own template (user decision), for consistent branding and no
fitting of longer Ukrainian text into fixed boxes.

## Design

### Location and layout

A new uv project at `application/ai-translator/`, alongside `application/infra`:

```
application/ai-translator/
  pyproject.toml            uv project, Python >= 3.11, ruff line-length 100
  README.md                 how to run it by hand
  glossary.md               translation notes (term table + style rules)
  branding.yaml             OS-Technology footer/rights texts not in company.json
  files/en/<name>.pdf       inputs (already exists, committed)
  files/ua/<name>.pdf       outputs for human review (committed)
  work/<name>/              per-datasheet working folder (committed except previews)
    en.yaml                 extracted structured source
    ua.yaml                 translated source (the reviewable artifact)
    images/                 extracted photo(s), drawing SVG(s)
    contact-sheet.png       every extracted image with ids (gitignored)
    preview/page-N.png      rendered pages for visual review (gitignored)
  translator/               Python package: cli, extract, render, lint, glossary
  templates/                datasheet.html.j2, blocks/*.html.j2, style.css
  fonts/                    bundled OFL fonts with Cyrillic
  tests/
.claude/skills/translate-datasheet/SKILL.md
```

`<name>` is the input file stem (`datasheet-checkweigher-hc-a`). The output PDF keeps the
same file name under `files/ua/`.

Entry point: `uv run --project application/ai-translator translator <command> <name>`, with
commands `extract`, `render`, `lint`, and `all` (render + lint).

Dependencies: `pymupdf`, `pyyaml`, `jinja2`, `playwright` (Chromium, for HTML to PDF and page
PNGs), `qrcode` (QR as SVG), `pytest` (dev).

### Pipeline

```
files/en/X.pdf
  1. extract  (script)  -> work/X/en.yaml + images/ + contact-sheet.png
  2. fix      (agent)   -> corrects en.yaml block structure against the page images
  3. translate (agent)  -> work/X/ua.yaml, following glossary.md
  4. render   (script)  -> files/ua/X.pdf + work/X/preview/page-N.png
  5. lint     (script)  -> glossary, number, structure, branding, overflow checks
  6. review   (agent)   -> looks at preview PNGs, fixes ua.yaml, repeats 4-6
  7. handoff            -> agent reports the PDF path and anything uncertain to the human
```

### Structured source format (`en.yaml` / `ua.yaml`)

The file is a list of typed blocks grouped into pages, so different datasheets map onto
one template. Both files have the same structure: `ua.yaml` is `en.yaml` with text values
translated. Draft shape:

```yaml
source: files/en/datasheet-checkweigher-hc-a.pdf
lang: ua
product:
  model: HC-A
  variant: BASIS               # the boxed label next to the model; may be absent
  category: Контрольні ваги    # translated product type, used on the cover/header
  url: https://ocs.com.ua/ua/catalogue/equipment/checkweigher/hc-a   # QR target, optional
pages:
  - title: [Найвищі стандарти, динамічного зважування]   # header band lines
    blocks:
      - type: lead
        text: "..."            # inline **bold** allowed
      - type: columns           # body text flowed into 2-3 columns
        paragraphs: ["..."]
      - type: hero
        image: images/photo-1.jpg
        aside:                  # feature boxes beside the photo
          - {style: light, title: [Основні, переваги], items: ["..."]}
          - {style: dark,  title: [Ваші, вигоди],     items: ["..."]}
  - title: [Технічні, дані]
    blocks:
      - type: table             # two-column key/value
        title: [Базові, дані]
        rows: [{label: "...", value: "...", note: 1}]
      - type: grid              # multi-column table with header row
        title: [...]
        header: ["..."]
        rows: [["..."]]
      - type: matrix            # width x length availability (x / -)
        ...
      - type: drawing
        image: images/drawing-1.svg
        labels: [{text: напрямок руху, x: 12.5, y: 30.1}]   # % of drawing box
      - type: footnotes
        items: ["1) ...", "2) ..."]
      - type: note
        text: "..."
```

Title arrays carry the light/bold split of WIPOTEC headings: the first element is light,
the rest bold. Block types beyond these may be added when a new datasheet needs one. Each
new type needs a template partial and a lint rule for its text fields.

### Extract (`translator extract`)

- Opens the PDF with PyMuPDF, ignoring owner-password restrictions.
- Text: per page, read spans with font, size and bold flags. Normalise ligatures and
  hyphenation. Drop WIPOTEC branding lines (configurable pattern list: `WIPOTEC-OCS GMBH`,
  `WWW.WIPOTEC-OCS.COM`, addresses, phone/fax, `info@wipotec.com`, language tabs). Drop the
  "Personal notes" page.
- Structure: best-effort heuristics produce a draft `en.yaml`. Large bold text in the top
  band becomes the page title, filled rectangles with bullet lists become boxes, a
  grid of cells becomes a table, `N)` lines become footnotes. The agent fixes the result in
  step 2. Heuristics only need to save typing; they do not need to be perfect.
- Images: pulls all raster images with their bounding boxes. Stitches images whose boxes
  tile edge to edge into one image, de-duplicating repeated xrefs. Discards strips under the
  footer line, images smaller than a threshold and known QR codes. Writes JPEG/PNG under
  `images/`.
- Vector drawings: a page region with many drawing ops and no large raster image is
  exported as SVG (`page.get_svg_image` with a clip). Word labels (spans that are not a
  single letter, a number, a radius/angle or a unit) are removed from the exported SVG and
  recorded as `labels` with positions relative to the drawing box. The fallback when SVG
  export looks wrong is a 300 DPI PNG of the region.
- Writes `contact-sheet.png` showing every extracted image with its id, plus a
  `preview-en/page-N.png` of each source page for the agent to compare against.

### Render (`translator render`)

- Jinja2 renders `templates/datasheet.html.j2` from `ua.yaml`, `branding.yaml` and
  `application/frontend/src/data/company.json` (read at render time, so contact changes on
  the site flow into re-rendered datasheets).
- Playwright Chromium prints A4 PDF with backgrounds, writes `files/ua/<name>.pdf`, and
  screenshots each page to `work/<name>/preview/page-N.png`.
- Every page is a fixed A4 `.page` element. Content does not flow automatically between
  pages: page breaks are decided by the `pages` list in YAML. This keeps layouts
  predictable and makes overflow detectable.
- After render, the script measures each `.page` and each fixed box (scrollHeight vs
  clientHeight, scrollWidth vs clientWidth) and reports overflow to `lint`.

### Template look

- WIPOTEC-like structure: grey header band with page title (light + bold lines) on the
  left and the model with a boxed variant label on the right. Light grey and dark grey
  feature boxes with check icons, zebra key/value tables, Condensed type in tables.
- OS-Technology branding: logo `application/frontend/public/assets/icons/logo-ua.svg`,
  magenta `--primary` from the site (`oklch(0.525 0.223 3.958)`, `#c6005c` in the logo)
  as a sparing accent (check icons, a header rule, the variant box).
- First page: header band with the product name and model, then lead, body columns and the
  hero photo with feature boxes. There is no separate cover page and no "Personal notes"
  page. (My call: saves a page that only repeated the model name.)
- Footer on every page: logo, company name, phone, email, short address, `ocs.com.ua`, page
  number. The last page adds a larger contact block and a QR code to `product.url`, or to
  `https://ocs.com.ua/ua` if it is absent.
- Rights and disclaimer texts come from `branding.yaml`. Default (my call, editable):
  `© {year} ОС-Технолоджи Україна` and a translation of the original disclaimer
  ("Можливі помилки та друкарські неточності. Дані можуть бути змінені. Зазначені торгові
  марки належать їхнім власникам.").
- Fonts: IBM Plex Sans and IBM Plex Sans Condensed (OFL, full Cyrillic, IBM Plex is already
  the site's heading font), bundled as files in `fonts/` so rendering never depends on
  system fonts or the network.

### Glossary (`glossary.md`)

The human edits it, the agent reads it, and `lint` parses it. Two sections:

```markdown
## Terms

| EN | UA | Avoid | Note |
|----|----|-------|------|
| tamper-evident protection | Захист від першого розкриття | захист від розкриття; розитну | |
| checkweigher | контрольні ваги | чеквейєр | |
| weigh cell | вагова комірка | | |

## Style rules

- Decimal separator is a comma: 0,1 г. ...
- Units in Cyrillic: г, кг, мм, шт/хв, ...
- Never translate: model codes, WIPOTEC, EMFR, MID, IP54, interface names ...
```

- `Avoid` holds `;`-separated forbidden fragments. They are matched case-insensitively as
  substrings, so a stem catches all inflected forms. Lint fails if any appears in `ua.yaml`.
- `UA` is the required rendering. Lint warns (does not fail) when the EN term appears in
  `en.yaml` but no form of the UA term appears in the matching `ua.yaml` block, because
  inflection makes exact matching unreliable. The agent must resolve or explain each warning.
- The user's translation notes do not exist yet; they will be written later. The first
  version is a draft seeded from terms already used in the site's Ukrainian equipment pages
  (`application/frontend/src/content/equipment/**/*.ua.md`, pairing each with its
  `*.en.md` counterpart), plus the terms in the HC-A sheet. Rows from the draft are marked
  as unconfirmed until the human reviews them. Notes that cannot be written as forbidden
  fragments go in "Style rules" and are enforced only through the agent's instructions.
- Number style (user decision): consistent with the website: decimal point and no
  thousands separator (`0.01 г`, `4000 г`, `7500 г`), units in Cyrillic as on the site
  (`г`, `мм`, `уп/хв` where the site uses it).

### Lint (`translator lint`)

Fails on:

- forbidden glossary fragments anywhere in `ua.yaml`;
- structure mismatch between `en.yaml` and `ua.yaml`, compared as one flat ordered list of
  blocks (block types, row/item counts). Page grouping is deliberately not compared: the
  agent may move a block to the next page or add a page when Ukrainian text overflows.
  Reducing type size below the template minimum is not an allowed fix;
- number mismatch per block: the multiset of numbers in each EN block, normalised
  (`4,000` -> 4000, footnote marks ignored), must equal the multiset in the UA block;
- number format in UA text that breaks the style rule (thousands separator, decimal comma);
- any WIPOTEC branding pattern in `ua.yaml` or in the rendered PDF text (product names on
  an allowlist excepted);
- overflow reported by render.

Warns on:

- Latin-script words in UA text not on the never-translate allowlist from the glossary;
- glossary UA terms not found where their EN term appears.

It exits non-zero on failures and prints `file:block-path: message` lines the agent can act on.

### Skill (`.claude/skills/translate-datasheet/SKILL.md`)

Plain Markdown, readable by agents other than Claude Code. `AGENTS.md` gets a short
section pointing to it. The skill:

- triggers on requests to translate or localise a datasheet or PDF from
  `application/ai-translator/files/en`;
- gives the pipeline steps above with exact commands;
- requires reading `glossary.md` in full before translating;
- gives translation rules: translate meaning, fix source typos silently, keep model codes,
  certificate numbers and interface names verbatim, and do not add or drop content;
- requires the visual review loop until lint passes and no page has clipped, overflowing
  or awkwardly broken text;
- covers handoff: report the output path, lint warnings left and why, and any term the
  agent was unsure about, proposed as a new glossary row for the human. The agent never
  edits `glossary.md` without the human's approval.

## Decisions by the user

- Output is our own HTML template rendered to PDF in a WIPOTEC-like style with
  OS-Technology branding, not an overlay on the original.
- Ukrainian only; no English rebranded output for now.
- Outputs stay in `application/ai-translator`; a human reviews and places them.
- Approach 1: skill plus deterministic Python tools, no LLM API calls from scripts.
- WIPOTEC sources only.
- Glossary starts as a draft from the site's equipment content; real notes come later.
- Number format matches the website (decimal point, no thousands separator).

## Calls made by the designer (check these)

- `ua.yaml` and `en.yaml` are committed as the reviewable source; preview PNGs are not.

- No separate cover or "Personal notes" page.

- Contacts read live from `company.json`; rights and disclaimer texts in `branding.yaml`.

- IBM Plex Sans plus Plex Sans Condensed as the template fonts.

- QR code points to the product page on ocs.com.ua.

- Skill lives in `.claude/skills/` with a pointer from `AGENTS.md`.

- Pagination may differ between `en.yaml` and `ua.yaml`; lint compares blocks, not pages.

- WIPOTEC branding patterns and the never-translate allowlist live in a config file
  (`sources.yaml`), not hard-coded, so new patterns found in other datasheets are a
  one-line change.

- The ruff pre-commit hook (today `application/infra/**/*.py` only) is extended to
  `application/ai-translator/**/*.py`, and `make test` runs its tests.

## Left to the builder

- Exact extraction heuristics and thresholds; it is acceptable for the agent to fix a lot.
- Template CSS details within the look described above.
- CLI ergonomics (flags, output verbosity).
- Test strategy: unit tests for ligature/hyphenation normalisation, number normalisation,
  glossary parsing, lint rules, and image tile stitching. A smoke test extracts and renders
  the HC-A sample. Visual quality is checked by the agent loop, not by tests.
