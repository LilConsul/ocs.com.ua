# Production launch

What has to be true before ocs.com.ua switches from the WordPress site to this one, and what to do on the day. Background: [LLM indexing](llm-indexing.md), [Deployment](deployment.md), [Environment](environment.md).

## Before launch

- [ ] **Review the old-address map.** Check the entries marked `review` in [`legacy-redirects.json`](../../application/frontend/src/data/legacy-redirects.json) and point any old model at its new product page once it exists.
- [ ] **Content.** Fill or hide the categories without products (Metal Detectors, Miscellaneous, Track & Trace, X-Ray Inspection). An empty page is a weak signal to search engines and gives AI tools nothing to quote.
- [ ] **Production pipeline.** A `deploy-prod.yml` with its own `PROD_`-prefixed secrets, manifest and GitHub OAuth app (see [Deployment](deployment.md)). Build with `LLMS_INDEXING` unset or `true`; never copy `LLMS_INDEXING: false` from the dev workflow.
- [ ] **IndexNow key.** Generate one (`openssl rand -hex 16`) and pass it to the production build as `INDEXNOW_KEY`.
- [ ] **Server.** `mod_headers` enabled (done on the current server, see [Server layout](deployment.md#server-layout)).
- [ ] **Search tools.** `ocs.com.ua` verified in Google Search Console and Bing Webmaster Tools. The WordPress site already uses the domain, so verification can be done before launch.

## Launch day

1. Deploy the production build.

1. Check a few old addresses by hand, for example `curl -sI https://ocs.com.ua/kontakty/` must answer `301` with `Location: https://ocs.com.ua/ua/contact/`.

1. Check that the site is indexable: `https://ocs.com.ua/robots.txt` lists the sitemap and has no `Disallow: /`, and pages carry `<meta name="robots" content="index, follow">`.

1. Submit `https://ocs.com.ua/sitemap-index.xml` in Search Console and Bing Webmaster Tools.

1. Tell IndexNow about every page once:

   ```bash
   uv run application/infra/scripts/indexnow.py https://ocs.com.ua --key "$INDEXNOW_KEY"
   ```

## First weeks

- Check the 404 report in Search Console every few days. Add old addresses that show up to `legacy-redirects.json`.
- Watch "Pages" in Search Console: the old addresses should move to "Page with redirect" and the new ones to "Indexed".
- After each production deploy, run `indexnow.py` with `--since` set to the previous deploy time.
- Ask ChatGPT, Perplexity and Gemini in Ukrainian about the products every few weeks and note whether OCS is named and linked (see [LLM indexing](llm-indexing.md#checklist-outside-the-code)).
