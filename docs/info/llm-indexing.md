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

## Checklist outside the code

- Register `ocs.com.ua` in Bing Webmaster Tools and submit `sitemap-index.xml`. ChatGPT search and Copilot rely on the Bing index.
- Register the site in Google Search Console and submit the sitemap. Google AI Overviews and Gemini use the Google index.
- After each content release, check the Search Console and Bing reports for crawl errors on the new pages.
- Every few weeks, ask ChatGPT, Perplexity and Gemini in Ukrainian about checkweighers, metal detectors and Track & Trace systems in Ukraine. Note whether OCS is named and linked, and which pages are cited.
- Keep `sameAs` in `src/data/company.json` up to date (Facebook, Opendatabot, YouControl and any new profiles). Assistants use these to confirm the company is real.
- Check that the hosting firewall or CDN does not block the user agents listed in `robots.txt`.

## Not done

WebMCP (letting browser AI agents call site actions such as the contact or datasheet form) is not implemented. As of November 2026 it is an early Chrome origin trial with a changing API. Revisit it once it ships in stable browsers.
