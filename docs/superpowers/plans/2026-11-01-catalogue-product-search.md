# Catalogue Product Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skills:subagent-driven-development (recommended) or skills:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add URL-driven client-side product search to the catalogue sidebar (with `?q=` bookmarkable URLs), fix the wiki search to also honour `?q=` on load, and declare both search targets correctly in the `WebSite` JSON-LD `SearchAction`.

**Architecture:** Data attributes on cards (`data-product-item`, `data-product-text`) are set at build time. The sidebar reads `?q=` on load and updates it via `replaceState` as the user types. `websiteSchema` emits `potentialAction` as an array of two `SearchAction` nodes. The wiki page gets the same URL-read treatment to fix the existing broken JSON-LD claim.

**Tech Stack:** Astro, TypeScript, Tailwind CSS, vanilla JS (no new dependencies)

______________________________________________________________________

### Task 1: Add i18n strings

**Files:**

- Modify: `locales/messages.pot`

- Modify: `locales/ua.po`

- Auto-updated: `src/i18n/ui.ts` (via compile script)

- [ ] **Step 1: Add English source strings to `messages.pot`**

Find the block for `"Search the wiki…"` (around line 734). Add two new entries immediately after it:

```po
#: src/components/catalogue/CatalogueSidebar.astro
msgid "Search products…"
msgstr ""

#: src/components/catalogue/CatalogueSidebar.astro
msgid "No products match your search. Try browsing another category."
msgstr ""
```

- [ ] **Step 2: Add Ukrainian translations to `ua.po`**

Find the block for `"Search the wiki…"` (around line 738). Add immediately after:

```po
#: src/components/catalogue/CatalogueSidebar.astro
msgid "Search products…"
msgstr "Пошук обладнання…"

#: src/components/catalogue/CatalogueSidebar.astro
msgid "No products match your search. Try browsing another category."
msgstr "За вашим запитом обладнання не знайдено. Спробуйте іншу категорію."
```

- [ ] **Step 3: Compile translations**

```bash
bun run i18n:compile
```

- [ ] **Step 4: Verify keys exist in `ui.ts`**

```bash
grep -n "search_products\|no_products_match_your_search_try" src/i18n/ui.ts
```

Expected: 4 lines (2 per locale).

- [ ] **Step 5: Commit**

```bash
git add locales/messages.pot locales/ua.po src/i18n/ui.ts
git commit -m "i18n: add product search strings"
```

______________________________________________________________________

### Task 2: Add data attributes to `ProductCard.astro`

**Files:**

- Modify: `src/components/catalogue/ProductCard.astro`

- [ ] **Step 1: Add `data-product-item` and `data-product-text` to the `<article>` element**

Current opening tag (line 29):

```astro
<article
	class="product-card group bg-background border-border-subtle/70 hover:border-secondary/40 flex flex-col overflow-hidden rounded-xl border shadow-xs transition-[translate,box-shadow,border-color] duration-300 hover:shadow-lg motion-safe:hover:-translate-y-0.5"
	style={`--i:${index % 3}`}
>
```

Replace with:

```astro
<article
	class="product-card group bg-background border-border-subtle/70 hover:border-secondary/40 flex flex-col overflow-hidden rounded-xl border shadow-xs transition-[translate,box-shadow,border-color] duration-300 hover:shadow-lg motion-safe:hover:-translate-y-0.5"
	style={`--i:${index % 3}`}
	data-product-item
	data-product-text={`${title} ${description ?? ""}`.toLowerCase()}
>
```

- [ ] **Step 2: Run type-check**

```bash
npx astro check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/catalogue/ProductCard.astro
git commit -m "feat: add data-product-item and data-product-text to ProductCard"
```

______________________________________________________________________

### Task 3: Update `websiteSchema` to emit dual `SearchAction`

**Files:**

- Modify: `src/lib/structured-data/website.ts`

- Modify: `tests/lib/structured-data.test.ts`

- [ ] **Step 1: Write a failing test first**

In `tests/lib/structured-data.test.ts`, find the `websiteSchema` describe block. Add a new test after the existing one:

```ts
it("emits two SearchAction nodes — one for wiki and one for catalogue", () => {
  const ws = websiteSchema("en", SITE);
  const actions = ws.potentialAction as unknown[];
  expect(Array.isArray(actions)).toBe(true);
  expect(actions).toHaveLength(2);
  const templates = (actions as Array<Record<string, unknown>>).map(
    (a) =>
      ((a.target as Record<string, unknown>)?.urlTemplate as string) ?? ""
  );
  expect(templates.some((t) => t.includes("/wiki/"))).toBe(true);
  expect(templates.some((t) => t.includes("/catalogue/equipment/checkweighers/"))).toBe(true);
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
bun test tests/lib/structured-data.test.ts --test-name-pattern "two SearchAction"
```

Expected: FAIL — `potentialAction` is currently an object, not an array.

- [ ] **Step 3: Update `websiteSchema` to return an array for `potentialAction`**

Replace the current `potentialAction` object in `src/lib/structured-data/website.ts`:

```ts
// Before:
potentialAction: {
  "@type": "SearchAction",
  target: {
    "@type": "EntryPoint",
    urlTemplate: `${baseUrl}wiki/?q={search_term_string}`,
  },
  "query-input": "required name=search_term_string",
},
```

With:

```ts
// After:
potentialAction: [
  {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${baseUrl}wiki/?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
  {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${baseUrl}catalogue/equipment/checkweighers/?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
],
```

- [ ] **Step 4: Run all structured-data tests**

```bash
bun test tests/lib/structured-data.test.ts
```

Expected: all pass. The existing `potentialAction` test that checks `ws.potentialAction` with `toEqual` will need updating — if it fails, replace its assertion with:

```ts
expect(Array.isArray(ws.potentialAction)).toBe(true);
```

- [ ] **Step 5: Run type-check**

```bash
npx astro check
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/structured-data/website.ts tests/lib/structured-data.test.ts
git commit -m "feat: add catalogue SearchAction to WebSite JSON-LD"
```

______________________________________________________________________

### Task 4: Add search input and empty state HTML to `CatalogueSidebar.astro`

**Files:**

- Modify: `src/components/catalogue/CatalogueSidebar.astro`

- [ ] **Step 1: Insert the search block after the header block**

In the `<aside>` inner div, locate the header block that ends with:

```astro
		</div>

		{/* Exclusive accordion: opening one section closes the other */}
		<div class="space-y-3">
```

Insert this block between the closing `</div>` of the header and the accordion `<div class="space-y-3">`:

```astro
		{/* Product search */}
		<div class="mb-5 px-1">
			<div class="relative">
				<span
					class="material-symbols-outlined text-industrial-gray pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px]"
					aria-hidden="true">search</span
				>
				<input
					type="search"
					class="font-body-md text-foreground placeholder:text-industrial-gray/70 border-border-subtle bg-surface-container focus-visible:outline-secondary h-10 w-full rounded-lg border pr-3 pl-9 text-sm shadow-xs transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2"
					placeholder={_("Search products…")}
					aria-label={_("Search products…")}
					data-product-search-input
				/>
			</div>
			<p
				data-product-empty
				hidden
				class="font-body-md text-industrial-gray mt-3 text-xs leading-relaxed"
			>
				{_("No products match your search. Try browsing another category.")}
			</p>
		</div>
```

- [ ] **Step 2: Run type-check**

```bash
npx astro check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/catalogue/CatalogueSidebar.astro
git commit -m "feat: add product search input and empty state to CatalogueSidebar"
```

______________________________________________________________________

### Task 5: Add filter + URL-sync logic to `CatalogueSidebar.astro` script

**Files:**

- Modify: `src/components/catalogue/CatalogueSidebar.astro` (the `<script>` block)

- [ ] **Step 1: Add helper to read and write `?q=` in the URL**

At the top of the `<script>` block (after existing variable declarations), add:

```ts
function getSearchQuery(): string {
  return new URLSearchParams(location.search).get("q") ?? "";
}

function setSearchQuery(q: string): void {
  const url = new URL(location.href);
  if (q) {
    url.searchParams.set("q", q);
  } else {
    url.searchParams.delete("q");
  }
  history.replaceState(history.state, "", url);
}
```

- [ ] **Step 2: Add `filterProducts` and `setupProductSearch` at the end of the `<script>` block** (after the `window.addEventListener("popstate", ...)` call)

```ts
function filterProducts(): void {
  const input = document.querySelector<HTMLInputElement>("[data-product-search-input]");
  const emptyEl = document.querySelector<HTMLElement>("[data-product-empty]");
  const results = getResults();
  if (!input) return;

  const query = input.value.trim().toLowerCase();
  const items = results
    ? results.querySelectorAll<HTMLElement>("[data-product-item]")
    : document.querySelectorAll<HTMLElement>("[data-product-item]");

  let visibleCount = 0;
  items.forEach((item) => {
    const match = query === "" || (item.dataset.productText ?? "").includes(query);
    item.hidden = !match;
    if (match) visibleCount++;
  });

  if (emptyEl) {
    emptyEl.hidden = visibleCount > 0 || query === "";
  }
}

function setupProductSearch(): void {
  const existing = document.querySelector<HTMLInputElement>("[data-product-search-input]");
  if (!existing) return;

  // Clone to remove any previously attached listeners
  const input = existing.cloneNode(true) as HTMLInputElement;
  existing.replaceWith(input);

  // Pre-fill from URL on (re-)setup
  const initial = getSearchQuery();
  if (input.value !== initial) input.value = initial;

  input.addEventListener("input", () => {
    setSearchQuery(input.value.trim());
    filterProducts();
  });

  // Apply current query to the cards now in the DOM
  filterProducts();
}

setupProductSearch();
```

- [ ] **Step 3: Carry `?q=` through category page swaps**

Inside `swapPage()`, find:

```ts
      results.innerHTML = nextResults.innerHTML;
      revealGrids();
```

Replace with:

```ts
      results.innerHTML = nextResults.innerHTML;
      revealGrids();
      setupProductSearch();
```

Also, when `history.pushState` is called inside `swapPage`, the `?q=` needs to be carried into the new URL. Find:

```ts
      const url = new URL(href, location.href);
      if (push) history.pushState({ catalogue: true }, "", url);
      shownPath = trimSlash(url.pathname);
```

Replace with:

```ts
      const url = new URL(href, location.href);
      const q = getSearchQuery();
      if (q) url.searchParams.set("q", q);
      if (push) history.pushState({ catalogue: true }, "", url);
      shownPath = trimSlash(url.pathname);
```

- [ ] **Step 4: Run type-check**

```bash
npx astro check
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/catalogue/CatalogueSidebar.astro
git commit -m "feat: URL-driven product search in catalogue sidebar"
```

______________________________________________________________________

### Task 6: Fix wiki search to honour `?q=` on load and update URL

**Files:**

- Modify: `src/pages/[lang]/wiki/index.astro` (the `<script>` block)

- [ ] **Step 1: Update `setupWikiIndexSearch` to read `?q=` on mount and write it on input**

Current `setupWikiIndexSearch` function (lines 143–165):

```ts
function setupWikiIndexSearch() {
  const searchInput = document.querySelector<HTMLInputElement>("[data-wiki-index-filter]");
  const grid = document.getElementById("wiki-index-grid");
  const emptyEl = document.getElementById("wiki-index-empty");

  if (!searchInput || !grid) return;

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    const items = grid.querySelectorAll<HTMLElement>("[data-wiki-item]");
    let visibleCount = 0;

    items.forEach((item) => {
      const match = query === "" || (item.dataset.wikiText ?? "").includes(query);
      item.hidden = !match;
      if (match) visibleCount++;
    });

    if (emptyEl) {
      emptyEl.hidden = visibleCount > 0 || query === "";
    }
  });
}
```

Replace with:

```ts
function setupWikiIndexSearch() {
  const searchInput = document.querySelector<HTMLInputElement>("[data-wiki-index-filter]");
  const grid = document.getElementById("wiki-index-grid");
  const emptyEl = document.getElementById("wiki-index-empty");

  if (!searchInput || !grid) return;

  function runFilter() {
    const query = searchInput!.value.trim().toLowerCase();
    const items = grid!.querySelectorAll<HTMLElement>("[data-wiki-item]");
    let visibleCount = 0;

    items.forEach((item) => {
      const match = query === "" || (item.dataset.wikiText ?? "").includes(query);
      item.hidden = !match;
      if (match) visibleCount++;
    });

    if (emptyEl) {
      emptyEl.hidden = visibleCount > 0 || query === "";
    }
  }

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    const url = new URL(location.href);
    if (q) {
      url.searchParams.set("q", q);
    } else {
      url.searchParams.delete("q");
    }
    history.replaceState(history.state, "", url);
    runFilter();
  });

  // Pre-fill from URL on load / Astro page transition
  const initial = new URLSearchParams(location.search).get("q") ?? "";
  if (initial) {
    searchInput.value = initial;
  }
  runFilter();
}
```

- [ ] **Step 2: Run type-check**

```bash
npx astro check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/[lang]/wiki/index.astro
git commit -m "feat: wiki search reads and writes ?q= URL param"
```

______________________________________________________________________

### Task 7: Manual verification

- [ ] **Step 1: Start dev server**

```bash
bun run dev
```

- [ ] **Step 2: Verify catalogue pre-fill from URL**

Navigate to `http://localhost:4321/ua/catalogue/equipment/checkweighers/?q=hc`.
Confirm the sidebar input is pre-filled with `hc` and only matching cards are visible.

- [ ] **Step 3: Verify URL updates while typing**

Clear the input, type `metal`. Confirm the URL bar shows `?q=metal`. Clear the input, confirm `?q=` is removed.

- [ ] **Step 4: Verify query carries through category navigation**

With `?q=hc` active, click a different category in the sidebar. Confirm the new URL includes `?q=hc` and the new page's cards are filtered immediately.

- [ ] **Step 5: Verify empty state**

Type `zzzzz`. Confirm all cards hide and the empty state message appears. Clear, confirm cards reappear.

- [ ] **Step 6: Verify wiki search pre-fill**

Navigate to `http://localhost:4321/ua/wiki/?q=weighing`.
Confirm the wiki search input is pre-filled and only matching articles show.

- [ ] **Step 7: Verify JSON-LD**

Open any page, view source. Confirm the `WebSite` node contains `"potentialAction"` as an array with two entries — one with `wiki` URL, one with `catalogue/equipment/checkweighers`.

- [ ] **Step 8: Run final checks**

```bash
bun test tests/lib/structured-data.test.ts
npx astro check
```

Expected: all tests pass, 0 errors.

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "chore: verify catalogue product search and JSON-LD complete"
```
