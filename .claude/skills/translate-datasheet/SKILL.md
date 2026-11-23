---
name: translate-datasheet
description: Use when asked to translate or localise a WIPOTEC datasheet or PDF from application/ai-translator/files/en into Ukrainian, producing an OS-Technology branded PDF in application/ai-translator/files/ua.
---

# Translate a WIPOTEC datasheet into Ukrainian

The tools live in `application/ai-translator/` (see its `README.md`). Run every command below from
that folder. `<name>` is the file stem of the source PDF: `files/en/<name>.pdf` becomes
`files/ua/<name>.pdf`.

The scripts extract, render and lint. You fix the extracted structure, translate and review the
pages. A human reviews the output PDF and copies it to the website by hand.

## 1. Prerequisites

```bash
uv sync
uv run playwright install chromium
```

## 2. Extract

```bash
uv run translator extract <name>
```

This writes `work/<name>/en.yaml` (a draft), `images/`, `contact-sheet.png` and
`preview-en/page-N.png`. If `en.yaml` already exists the command refuses; add `--force` only when
you want to throw the existing `en.yaml` away.

## 3. Fix en.yaml

Open every `work/<name>/preview-en/page-N.png` and `contact-sheet.png` and compare them with
`en.yaml` block by block. The format and the block types are described in the README. The draft
is a heuristic; typical fixes:

- footnote marks glued to a value (`IP54 1)`) move to the row's `note: 1`; where the format has no
  `note` field (matrix headers, mid-value marks) keep the mark as ` 1)` after the text;
- a paragraph split across columns becomes one paragraph;
- a section heading extracted as a plain block becomes a `note` with `**bold**` markup (it renders
  as a heading) or the title of the block below it;
- stray characters and joined words are removed (`motorsi` is `motors`);
- a missing or wrong page title, block type, row or footnote is corrected.

Leave source typos (`lenght`) in `en.yaml` if you like; you fix them in the translation.

If a drawing is clipped wrongly, re-export it with a clip rectangle in PDF points, read from the
source page:

```bash
uv run translator drawing <name> --page 5 --clip 61,164,591,627
```

## 4. Read the glossary

Read `glossary.md` in full before translating: the terms table and the style rules. Its `UA`
wording is required, its `Avoid` fragments are errors. Names listed under `never_translate` in
`sources.yaml` stay in Latin script.

## 5. Write ua.yaml

Copy `en.yaml` to `work/<name>/ua.yaml` and translate only the text fields. Do not change block
order, block types, list lengths, images, clips or `note` numbers.

- Set `lang: ua`.
- Set `product.category` to the Ukrainian product type (for example `Контрольно динамічні ваги`).
- Set `product.url` to `https://ocs.com.ua/ua/catalogue/equipment/<category>/<slug>` when the
  product exists in `application/frontend/src/content/equipment/<category>/<slug>.ua.md`; reuse
  that page's Ukrainian wording where it applies. Leave `url` empty otherwise (the QR code then
  points to `https://ocs.com.ua/ua`).

Translation rules:

- Translate the meaning, not word by word. Fix source typos silently.
- Keep model codes, certificate numbers, standards, IP ratings, interface and protocol names
  verbatim.
- Numbers use a decimal point and no thousands separator (`4,000 g` becomes `4000 г`); units in
  Cyrillic with a space before them.
- Do not add or drop content: every heading, row, item, footnote and number has exactly one
  Ukrainian counterpart.
- Headings keep their `**bold**` markup on the word that is bold in the source.
- Lint reads a digit directly followed by `)` as a footnote mark and skips it when it compares
  numbers, so do not end a parenthesis with a number (`(опційно ще 3)`); reword instead.

## 6. Render, lint and review

```bash
uv run translator all <name>
```

This prints `files/ua/<name>.pdf`, writes `work/<name>/preview/page-N.png` and lints `ua.yaml`
against `en.yaml`, the glossary and the render report. Then look at every `preview/page-N.png`
and compare it with `preview-en/`. Check that no text is clipped, overflowing or awkwardly
broken, every page has the OS-Technology footer, no WIPOTEC contacts appear, and the last page
has the QR code.

Fix problems by editing the Ukrainian text (shorter wording) or by moving blocks between pages
(or onto a new page) in `ua.yaml`; the order of blocks across all pages must stay the same as in
`en.yaml`. A drawing that renders small (its dimension figures hard to read) needs more of
the page: give it a page with fewer blocks. A drawing label that is longer in Ukrainian may be
moved by changing its `x`/`y` in `ua.yaml` so it covers no lines. The last page always carries
the contact block; if the content leaves it no room, a last page with only a title (for
example `Контакти`) and no blocks is fine. Never shrink fonts or change the template to make
text fit. Repeat this step until lint reports no errors and every
page looks right.

## 7. Hand over

Report to the human:

- the output path `application/ai-translator/files/ua/<name>.pdf`;
- each lint warning left, with the reason it is acceptable;
- every term you were unsure about, as a proposed glossary row (`EN`, `UA`, reason).

Never edit `glossary.md` without the human's approval.
