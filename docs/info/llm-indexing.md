# LLM indexing

How the site is exposed to AI assistants (ChatGPT, Perplexity, Gemini, Claude) and what to do outside the code.

## What the build produces

All files are prerendered from the content collections and `src/data/*.json`, so CMS edits show up on the next deploy.

| URL                                                | Source                                                         | Contents                                                                                       |
| -------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `/llms.txt`                                        | `src/pages/llms.txt.ts`                                        | Map of the site in the [llms.txt](https://llmstxt.org) format. Ukrainian first, English after. |
| `/llms-full.txt`                                   | `src/pages/llms-full.txt.ts`                                   | Every product and wiki article in full, in one file.                                           |
| `/{lang}/catalogue/equipment/{category}/{slug}.md` | `src/pages/[lang]/catalogue/equipment/[category]/[slug].md.ts` | Markdown copy of a product page with specs.                                                    |
| `/{lang}/wiki/{slug}.md`                           | `src/pages/[lang]/wiki/[slug].md.ts`                           | Markdown copy of a wiki article.                                                               |
| `/{lang}/catalogue/industry/{slug}.md`             | `src/pages/[lang]/catalogue/industry/[slug].md.ts`             | Markdown copy of an industry page with the products used in it.                                |
| `/{lang}/about.md`                                 | `src/pages/[lang]/about.md.ts`                                 | Markdown copy of the About page: manufacturers, installed base and clients (names only).       |
| `/robots.txt`                                      | `src/pages/robots.txt.ts`                                      | Allows all crawlers and names the AI search and training crawlers explicitly.                  |

The text is built in `src/lib/llms.ts`; the manufacturer details come from `src/lib/about/manufacturers.ts`, shared with the About page. The Contact page has no copy because its details are already at the top of `/llms.txt`. Labels use `_()` like the pages, so new labels need a `locales/ua.po` translation. The Markdown copies are not in the sitemap; the HTML pages stay canonical.

## Checklist outside the code

- Register `ocs.com.ua` in Bing Webmaster Tools and submit `sitemap-index.xml`. ChatGPT search and Copilot rely on the Bing index.
- Register the site in Google Search Console and submit the sitemap. Google AI Overviews and Gemini use the Google index.
- After each content release, check the Search Console and Bing reports for crawl errors on the new pages.
- Every few weeks, ask ChatGPT, Perplexity and Gemini in Ukrainian about checkweighers, metal detectors and Track & Trace systems in Ukraine. Note whether OCS is named and linked, and which pages are cited.
- Keep `sameAs` in `src/data/company.json` up to date (Facebook, Opendatabot, YouControl and any new profiles). Assistants use these to confirm the company is real.
- Check that the hosting firewall or CDN does not block the user agents listed in `robots.txt`.

## Not done

WebMCP (letting browser AI agents call site actions such as the contact or datasheet form) is not implemented. As of November 2026 it is an early Chrome origin trial with a changing API. Revisit it once it ships in stable browsers.
