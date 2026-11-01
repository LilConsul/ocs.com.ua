# Catalogue Product Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skills:subagent-driven-development (recommended) or skills:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a client-side text search input to the catalogue sidebar that filters product cards on the current page by title and description.

**Architecture:** Data attributes (`data-product-item`, `data-product-text`) are added to `ProductCard.astro` at build time. A search `<input>` in `CatalogueSidebar.astro` filters cards via JS `.hidden` toggling, identical to the existing wiki search pattern. The sidebar's in-place page-swap hook re-runs filtering after each category navigation.

**Tech Stack:** Astro, TypeScript, Tailwind CSS, vanilla JS (no new dependencies)

______________________________________________________________________

### Task 1: Add i18n strings

**Files:**

- Modify: `locales/messages.pot`

- Modify: `locales/ua.po`

- Run: `bun run i18n:compile` → auto-updates `src/i18n/ui.ts`

- [ ] **Step 1: Add English source strings to `messages.pot`**

Find the block for `"Search the wiki…"` (around line 734) and add the two new entries immediately after it:

```po
#: src/components/catalogue/CatalogueSidebar.astro
msgid "Search products…"
msgstr ""

#: src/components/catalogue/CatalogueSidebar.astro
msgid "No products match your search. Try browsing another category."
msgstr ""
```

- [ ] **Step 2: Add Ukrainian translations to `ua.po`**

Find the block for `"Search the wiki…"` (around line 738) and add immediately after:

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

Expected: `src/i18n/ui.ts` now contains:

- `"inline.search_products": "Search products…"` (en)

- `"inline.no_products_match_your_search_try_browsing_another_category": "No products match your search. Try browsing another category."` (en)

- corresponding Ukrainian entries

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

### Task 3: Add search input and empty state to `CatalogueSidebar.astro`

**Files:**

- Modify: `src/components/catalogue/CatalogueSidebar.astro`

- [ ] **Step 1: Add search input block after the header block**

In the `<aside>` inner div, locate the header block that ends with:

```astro
		</div>

		{/* Exclusive accordion: opening one section closes the other */}
		<div class="space-y-3">
```

Insert the following block between the closing `</div>` of the header and the accordion `<div class="space-y-3">`:

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

### Task 4: Add filter logic to the sidebar script

**Files:**

- Modify: `src/components/catalogue/CatalogueSidebar.astro` (the `<script>` block)

- [ ] **Step 1: Add `setupProductSearch` function and call it at the end of the existing `<script>` block**

At the very end of the `<script>` block (after the `window.addEventListener("popstate", ...)` call), add:

```ts
	/*
	 * Product search. Filters [data-product-item] cards inside [data-catalogue-results]
	 * using the [data-product-search-input] input. Re-called after every page swap so
	 * the current query applies immediately to the new cards.
	 */
	function filterProducts() {
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

	function setupProductSearch() {
		const input = document.querySelector<HTMLInputElement>("[data-product-search-input]");
		if (!input) return;
		// Replace existing listener by cloning (avoids duplicate listeners on re-setup)
		const fresh = input.cloneNode(true) as HTMLInputElement;
		input.replaceWith(fresh);
		fresh.addEventListener("input", filterProducts);
		// Apply current query to whatever cards are in the DOM right now
		filterProducts();
	}

	setupProductSearch();
```

- [ ] **Step 2: Hook `setupProductSearch` into `swapPage` after the results swap**

Inside `swapPage()`, locate:

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

- [ ] **Step 3: Run type-check**

```bash
npx astro check
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/catalogue/CatalogueSidebar.astro
git commit -m "feat: filter product cards from sidebar search input"
```

______________________________________________________________________

### Task 5: Manual verification

- [ ] **Step 1: Start dev server**

```bash
bun run dev
```

- [ ] **Step 2: Verify basic filtering**

Open `http://localhost:4321/ua/catalogue/equipment/checkweighers/` (or any real category URL).
Type a partial product name. Confirm only matching cards remain visible.

- [ ] **Step 3: Verify empty state**

Type `zzzzz` (guaranteed no match). Confirm all cards hide and the "No products match" message appears in the sidebar.

- [ ] **Step 4: Verify query persists across category navigation**

With `zzzzz` still in the input, click a different category in the sidebar. Confirm the new category's cards load and the query filters immediately (empty state likely still shows, or matching cards appear if any match).

- [ ] **Step 5: Verify clearing the input restores cards**

Delete the query. Confirm all cards reappear and empty state hides.

- [ ] **Step 6: Run final type-check**

```bash
npx astro check
```

Expected: 0 errors.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: verify catalogue product search complete"
```
