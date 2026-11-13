# LLM indexing

How the site is exposed to AI assistants (ChatGPT, Perplexity, Gemini, Claude) and what to do outside the code.

## What the build produces

All files are prerendered from the content collections and `src/data/*.json`, so CMS edits show up on the next deploy.

Every public page has a Markdown copy next to it: add `.md` to the page path (`/ua/about` -> `/ua/about.md`). The home page is the exception, since `/ua/` has no name to extend: its copy is `/ua/index.md`. Each HTML page links its copy in `<head>` with `<link rel="alternate" type="text/markdown">`. Only the 404 and 50x error pages have no copy.

| URL                                                | Source (under `src/pages/`)                          | Contents                                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/llms.txt`                                        | `llms.txt.ts`                                        | Map of the site in the [llms.txt](https://llmstxt.org) format, linking only Markdown copies. Ukrainian first, English after. |
| `/llms-full.txt`                                   | `llms-full.txt.ts`                                   | Full text of every page in one file. Pages that are only link lists (home, categories, wiki index) are left out.             |
| `/{lang}/index.md`                                 | `[lang]/index.md.ts`                                 | Home: company, contacts and links to every section.                                                                          |
| `/{lang}/catalogue/equipment/{category}.md`        | `[lang]/catalogue/equipment/[category].md.ts`        | Equipment category with its products.                                                                                        |
| `/{lang}/catalogue/equipment/{category}/{slug}.md` | `[lang]/catalogue/equipment/[category]/[slug].md.ts` | Product with specs.                                                                                                          |
| `/{lang}/catalogue/industry/{slug}.md`             | `[lang]/catalogue/industry/[slug].md.ts`             | Industry with the products used in it.                                                                                       |
| `/{lang}/wiki.md`                                  | `[lang]/wiki.md.ts`                                  | Wiki index.                                                                                                                  |
| `/{lang}/wiki/{slug}.md`                           | `[lang]/wiki/[slug].md.ts`                           | Wiki article.                                                                                                                |
| `/{lang}/about.md`                                 | `[lang]/about.md.ts`                                 | Manufacturers, installed base and clients (names only).                                                                      |
| `/{lang}/contact.md`                               | `[lang]/contact.md.ts`                               | Contact details, authorization letters, company profiles.                                                                    |
| `/{lang}/privacy.md`, `/{lang}/terms.md`           | `[lang]/privacy.md.ts`, `[lang]/terms.md.ts`         | Full legal text, the same as the page.                                                                                       |
| `/robots.txt`                                      | `robots.txt.ts`                                      | Allows all crawlers and names the AI search and training crawlers explicitly.                                                |

The text is built in `src/lib/llms.ts`. The manufacturer details come from `src/lib/about/manufacturers.ts` and the legal text from `src/lib/legal/document.ts`, both shared with the pages. Labels use `_()` like the pages, so new labels need a `locales/ua.po` translation. The Markdown copies are not in the sitemap; the HTML pages stay canonical.

A new page under `src/pages/[lang]/` gets the `<head>` link automatically, so it also needs a `.md.ts` route next to it, or the link points at a missing file.

## Coverage

Every route the site has, and how each one is exposed to search engines and AI tools. Counts are per language, taken from the build of November 2026; the content collections and `src/data/*.json` decide the real numbers.

### Public pages

| Page               | Route                                           | Pages                          | Sitemap | Markdown copy      | `/llms.txt` | `/llms-full.txt`      |
| ------------------ | ----------------------------------------------- | ------------------------------ | ------- | ------------------ | ----------- | --------------------- |
| Home               | `/{lang}/`                                      | 1                              | yes     | `/{lang}/index.md` | yes         | no, it is a link list |
| Equipment category | `/{lang}/catalogue/equipment/{category}`        | 6                              | yes     | yes                | yes         | no, it is a link list |
| Product            | `/{lang}/catalogue/equipment/{category}/{slug}` | 8                              | yes     | yes                | yes         | yes                   |
| Industry           | `/{lang}/catalogue/industry/{slug}`             | 4                              | yes     | yes                | yes         | yes                   |
| Wiki index         | `/{lang}/wiki`                                  | 1                              | yes     | yes                | yes         | no, it is a link list |
| Wiki article       | `/{lang}/wiki/{slug}`                           | 3                              | yes     | yes                | yes         | yes                   |
| About              | `/{lang}/about`                                 | 1                              | yes     | yes                | yes         | yes                   |
| Contact            | `/{lang}/contact`                               | 1                              | yes     | yes                | yes         | yes                   |
| Privacy Policy     | `/{lang}/privacy`                               | 1                              | yes     | yes                | yes         | yes                   |
| Terms of Use       | `/{lang}/terms`                                 | 1                              | yes     | yes                | yes         | yes                   |
| **Total**          |                                                 | **27 per language, 54 in all** | **54**  | **54**             | **54**      | **38**                |

Four of the six categories (Metal Detectors, Miscellaneous, Track & Trace, X-Ray Inspection) have no products yet. Their pages and copies still exist and `/llms.txt` still links them, so products added in the CMS appear there on the next deploy.

### Routes that are not indexed

| Route                                                                   | What it is                                             | Why it is left out                                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `/`                                                                     | Redirect to `/ua/`                                     | Not a page.                                                                                           |
| `/{lang}/catalogue/{category}`, `/{lang}/catalogue/{category}/{slug}`   | Redirects from the old catalogue URLs (28 in all)      | Not pages; they point at the canonical catalogue URLs. Left out of the sitemap in `astro.config.mjs`. |
| `/404`, `/50x`                                                          | Error pages                                            | No content worth citing. They use `ErrorPageLayout`, so no Markdown link is added.                    |
| `/admin/`, `/admin/config.yml`                                          | Decap CMS                                              | Private. `Disallow: /admin/` in `robots.txt`.                                                         |
| `/api/auth`, `/api/contact`, `/api/datasheet-request`, `/api/datasheet` | On-demand endpoints (OAuth, forms, datasheet download) | Not content. `Disallow: /api/` in `robots.txt`. Datasheet PDFs stay behind the lead form.             |
| `/robots.txt`, `/sitemap-index.xml`, `/llms.txt`, `/llms-full.txt`      | Files for crawlers                                     | They are the index, not pages in it.                                                                  |

To recheck after adding pages, run `bun run build` in `application/frontend`. These three numbers should be equal:

```bash
grep -o "<loc>" dist/client/sitemap-0.xml | wc -l      # pages in the sitemap
find dist/client/ua dist/client/en -name "*.md" | wc -l  # Markdown copies
grep -o "\.md)" dist/client/llms.txt | wc -l            # copies linked from /llms.txt
```

## Checklist outside the code

- Register `ocs.com.ua` in Bing Webmaster Tools and submit `sitemap-index.xml`. ChatGPT search and Copilot rely on the Bing index.
- Register the site in Google Search Console and submit the sitemap. Google AI Overviews and Gemini use the Google index.
- After each content release, check the Search Console and Bing reports for crawl errors on the new pages.
- Every few weeks, ask ChatGPT, Perplexity and Gemini in Ukrainian about checkweighers, metal detectors and Track & Trace systems in Ukraine. Note whether OCS is named and linked, and which pages are cited.
- Keep `sameAs` in `src/data/company.json` up to date (Facebook, Opendatabot, YouControl and any new profiles). Assistants use these to confirm the company is real.
- Check that the hosting firewall or CDN does not block the user agents listed in `robots.txt`.

## Not done

WebMCP (letting browser AI agents call site actions such as the contact or datasheet form) is not implemented. As of November 2026 it is an early Chrome origin trial with a changing API. Revisit it once it ships in stable browsers.
