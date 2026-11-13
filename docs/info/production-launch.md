# Production launch

How ocs.com.ua switches from the WordPress site to this one. Background: [Deployment](deployment.md), [LLM indexing](llm-indexing.md), [Environment](environment.md).

## Status

**Launched on 2026-11-13.** ocs.com.ua serves this site; WordPress is kept in `/home/ocs/public_html.wordpress`, its database dump in `/home/ocs/private-backups/`. `PROD_ENABLED` and `PROD_LIVE` are set.

Still open (see the lists below):

- Submit the sitemap in Google Search Console and Bing Webmaster Tools.
- Review the `review` entries of the old-address map.
- Fill or hide the categories without products.
- Legal check of the Plerdy text in the privacy policy, and the cookie consent decision.
- Email delivery: DKIM, a stricter SPF (`~all`) and DMARC.
- Archive WordPress once the new site has run for a while.

## How it works

`main` deploys to production. Until launch day each deploy is **staged**: the new release is uploaded, its Node server runs on port 4322 and is checked on the server, while ocs.com.ua keeps serving WordPress. On launch day [`launch-prod.sh`](../../application/infra/server/launch-prod.sh) points ocs.com.ua at the staged site. It checks the result through Apache and puts WordPress back by itself if anything fails.

After launch, a deploy that fails its health check goes back to the previous release of the new site on its own, and **Rollback** in the Actions tab does the same by hand. WordPress stays on the server in `/home/ocs/public_html.wordpress`; [`restore-wordpress.sh`](../../application/infra/server/restore-wordpress.sh) serves it again if the launch has to be undone.

## Before launch

- [x] **Server setup** (once, as root): `ssh root@<server> 'bash -s' < application/infra/server/setup-prod.sh`
- [x] **OAuth app for the CMS** on GitHub (Settings → Developer settings → OAuth Apps), callback `https://ocs.com.ua/api/auth`. Save its ID and secret as the `PROD_GITHUB_CLIENT_ID` and `PROD_GITHUB_CLIENT_SECRET` repository secrets.
- [ ] **reCAPTCHA:** add `ocs.com.ua` to the allowed domains of the existing key (Google reCAPTCHA admin console). Without it every contact and datasheet form on ocs.com.ua is rejected.
- [ ] **Turn on prod deploys:** repository variable `PROD_ENABLED=true`, then run **Deploy prod** once. It must end with "Staged release ... is ready".
- [ ] **Review the old-address map.** Check the entries marked `review` in [`legacy-redirects.json`](../../application/frontend/src/data/legacy-redirects.json); point any old model at its new product page once it exists.
- [ ] **Content.** Fill or hide the categories without products (Metal Detectors, Miscellaneous, Track & Trace, X-Ray Inspection).
- [ ] **Privacy policy.** The Plerdy section (sections 6, 7 and 10) is a draft: have it checked, and decide whether a cookie consent banner is needed for analytics cookies.
- [ ] **Email delivery.** The SPF record ends in `?all` and DMARC is `p=none`; check that DKIM signs mail from `noreply@ocs.com.ua`, so contact form messages do not land in spam.
- [ ] **Search tools.** `ocs.com.ua` verified in Google Search Console and Bing Webmaster Tools (possible already, the WordPress site uses the domain).

## Launch day

1. Make sure the last **Deploy prod** run succeeded (staged release ready).
1. Switch: `ssh root@<server> 'bash -s' < application/infra/server/launch-prod.sh`. It ends with "ocs.com.ua now serves ...", or puts WordPress back and says why.
1. Set the repository variable `PROD_LIVE=true` and run **Deploy prod** once. Its verify job checks the live site (headers, old addresses, indexable, e2e), and the IndexNow job submits every page.
1. Submit `https://ocs.com.ua/sitemap-index.xml` in Search Console and Bing Webmaster Tools.

From then on the **Monitor** workflow checks the site every 30 minutes.

## First weeks

- Check the 404 report in Search Console every few days. Add old addresses that show up to `legacy-redirects.json`.
- Watch "Pages" in Search Console: the old addresses should move to "Page with redirect" and the new ones to "Indexed".
- Ask ChatGPT, Perplexity and Gemini in Ukrainian about the products every few weeks and note whether OCS is named and linked (see [LLM indexing](llm-indexing.md#checklist-outside-the-code)).
- Once the new site has run for a while, archive `/home/ocs/public_html.wordpress` and its database.
