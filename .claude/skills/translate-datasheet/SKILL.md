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
`preview-en/page-N.png`. The source cover (page 1) becomes `cover` (its drawing is
`images/cover.svg`) and the "Personal notes" page becomes `notes`; neither turns into blocks. If `en.yaml` already exists the command refuses; add `--force` only when
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

Lint later compares the numbers in `en.yaml` with the source PDF text: a number in `en.yaml` that
the source does not have is an error, a source number missing from `en.yaml` is a warning (fix
it unless it is a leftover you can explain). Branding lines, dimensions inside the drawing clip
and the "Personal notes" page are not counted.

If a drawing is clipped wrongly, re-export it with a clip rectangle in PDF points, read from the
source page:

```bash
uv run translator drawing <name> --page 5 --clip 61,164,591,627
```

Check `cover` against `preview-en/page-1.png`: `subtitle` is the letter-spaced line under the
model written as normal words (`Technical data`), `label` is the code in the black square. If
the cover drawing is cut wrongly or includes the WIPOTEC logo, re-export only the cover (no
`--clip`: auto-detected; an existing `subtitle` and `label` are kept):

```bash
uv run translator cover <name> --clip 194,201,422,643
```

## 4. Read the glossary

Read `glossary.md` in full before translating: the terms table and the style rules. Its `UA`
wording is required, its `Avoid` fragments are errors. Names listed under `never_translate` in
`sources.yaml` stay in Latin script.

## 5. Write ua.yaml

Copy `en.yaml` to `work/<name>/ua.yaml` and translate only the text fields. Do not change block
order, block types, list lengths, `product.model`, `product.variant`, images, clips, drawing
`page`, `note` numbers or matrix `x`/`-` cells; lint reports each change as an error.

- Set `lang: ua`.
- Translate `cover.subtitle` (`Технічні дані`) and `notes.title` (`Особисті`, `нотатки`); keep
  `cover.image`, `cover.clip` and `cover.label` as they are. Keep `cover` and `notes` exactly
  when `en.yaml` has them.
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
- Keep footnote marks (`400 мм 1)`) where the source has them: lint compares them separately
  from the other numbers, so a changed or dropped mark is an error. A digit that closes a
  parenthesis (`(опціонально ще 3)`) is an ordinary number, not a mark.

## 6. Render, lint and review

```bash
uv run translator all <name>
```

This prints `files/ua/<name>.pdf`, writes `work/<name>/preview/page-N.png` and lints `ua.yaml`
against `en.yaml`, the glossary and the render report. Then look at every `preview/page-N.png`
and compare it with `preview-en/`. Check that no text is clipped, overflowing or awkwardly
broken, every page but the cover has the OS-Technology footer, no WIPOTEC contacts appear, and
the last page has the QR code (with `notes` it is the personal-notes page).

Fix problems by editing the Ukrainian text (shorter wording) or by moving blocks between pages
(or onto a new page) in `ua.yaml`; the order of blocks across all pages must stay the same as in
`en.yaml`. A drawing that renders small (its dimension figures hard to read) needs more of
the page: give it a page with fewer blocks. A drawing label that is longer in Ukrainian may be
moved by changing its `x`/`y` in `ua.yaml` so it covers no lines. With `notes` the contact block is on the
notes page. Without it the last content page carries the contact block; if the content leaves
it no room, a last page with only a title (for example `Контакти`) and no blocks is fine. Never shrink fonts or change the template to make
text fit. Repeat this step until lint reports no errors and every
page looks right.

## 7. Hand over

Report to the human:

- the output path `application/ai-translator/files/ua/<name>.pdf`;
- each lint warning left, with the reason it is acceptable;
- every term you were unsure about, as a proposed glossary row (`EN`, `UA`, reason).

Never edit `glossary.md` without the human's approval.
