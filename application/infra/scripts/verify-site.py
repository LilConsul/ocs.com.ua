#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Checks a deployed site through its public URL (Apache in front of the Node server).

Run by the verify job of .github/workflows/_deploy.yml after every deploy:

    uv run application/infra/scripts/verify-site.py https://ocs.com.ua --environment prod --indexing true

Checks, each printed as OK or FAIL:
- pages, the CMS config (Node server) and the LLM files answer 200 (retried while Apache reloads);
- response headers from public/.htaccess: .md as text/markdown, a year of caching for hashed
  /_astro/ files, the security headers;
- old WordPress addresses and plain http (and www on prod) answer one 301 to the right page;
- indexing matches the build: open (sitemap, index/follow, no X-Robots-Tag) or closed
  (Disallow: /, noindex, X-Robots-Tag on every file type);
- dev has no CMS: /admin/ points to ocs.com.ua, /api/auth refuses.
Exits 1 when any check fails.
"""

import argparse
import re
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from urllib.parse import urlparse

MAIN_CMS_URL = "https://ocs.com.ua/admin/"

HEALTH_PATHS = [
    "/ua/",
    "/en/",
    "/admin/config.yml",
    "/robots.txt",
    "/llms.txt",
    "/llms-full.txt",
    "/ua/index.md",
    "/ua/about.md",
]

# Old WordPress address -> new page (a sample of src/data/legacy-redirects.json)
LEGACY_REDIRECTS = [
    ("/kontakty/", "/ua/contact/"),
    ("/hc-a", "/ua/catalogue/equipment/checkweigher/hc-a/"),
    (
        "/category/x-ray-skanery/modeli-serii-sc-e/",
        "/ua/catalogue/equipment/x-ray-inspection/",
    ),
]


@dataclass
class Response:
    status: int
    headers: dict[str, str]
    body: str = ""

    def header(self, name: str) -> str:
        return self.headers.get(name.lower(), "")


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):  # noqa: ANN002, ANN003
        return None


_opener = urllib.request.build_opener(_NoRedirect)


def fetch(url: str, timeout: float = 20) -> Response:
    """One request, redirects not followed, any status returned rather than raised."""
    request = urllib.request.Request(url, headers={"User-Agent": "ocs-verify/1.0"})
    try:
        with _opener.open(request, timeout=timeout) as r:
            body = r.read().decode("utf-8", "replace")
            return Response(
                r.status, {k.lower(): v for k, v in r.headers.items()}, body
            )
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace") if e.fp else ""
        return Response(e.code, {k.lower(): v for k, v in e.headers.items()}, body)


@dataclass
class Report:
    failures: list[str] = field(default_factory=list)

    def check(self, ok: bool, label: str, detail: str = "") -> bool:
        print(f"{'OK  ' if ok else 'FAIL'} {label}{f': {detail}' if detail else ''}")
        if not ok:
            self.failures.append(label)
        return ok


# --- Pure checks (unit-tested) ---


def find_asset(html: str) -> str | None:
    """First hashed stylesheet a page links (/_astro/...css)."""
    m = re.search(r'/_astro/[^"\']+\.css', html)
    return m.group(0) if m else None


def redirect_problem(response: Response, expected: str) -> str | None:
    """None when the response is one 301 straight to `expected`."""
    location = response.header("location")
    if response.status != 301 or location != expected:
        return f"expected 301 to {expected}, got {response.status} {location or '(no Location)'}"
    return None


def indexing_problems(
    robots: str, page: str, x_robots: str, indexing: bool, site: str
) -> list[str]:
    """What is wrong with robots.txt, the page's robots meta and its X-Robots-Tag header."""
    problems = []
    disallow_all = any(line.strip() == "Disallow: /" for line in robots.splitlines())
    if indexing:
        if disallow_all:
            problems.append("robots.txt blocks the whole site")
        if f"Sitemap: {site}/sitemap-index.xml" not in robots:
            problems.append("robots.txt lacks the sitemap")
        if '<meta name="robots" content="index, follow">' not in page:
            problems.append("page is not index, follow")
        if x_robots:
            problems.append(f"unexpected X-Robots-Tag: {x_robots}")
    else:
        if not disallow_all:
            problems.append("robots.txt must disallow everything")
        if '<meta name="robots" content="noindex, nofollow">' not in page:
            problems.append("page must carry noindex, nofollow")
        if "noindex" not in x_robots.lower():
            problems.append("X-Robots-Tag noindex missing")
    return problems


# --- Checks against the live site ---


def check_health(
    site: str, report: Report, attempts: int = 10, wait: float = 3
) -> None:
    for path in HEALTH_PATHS:
        status = 0
        for attempt in range(attempts):
            status = fetch(site + path).status
            if status == 200:
                break
            if attempt < attempts - 1:
                time.sleep(wait)
        report.check(status == 200, f"{path} answers", str(status))


def check_headers(site: str, report: Report) -> None:
    def expect(path: str, header: str, needle: str) -> None:
        value = fetch(site + path).header(header)
        report.check(needle in value, f"{path} {header}", value or "(none)")

    expect("/llms.txt", "content-type", "text/plain")
    expect("/ua/about.md", "content-type", "text/markdown")
    asset = find_asset(fetch(site + "/ua/").body)
    if report.check(
        asset is not None, "hashed stylesheet linked from /ua/", asset or ""
    ):
        expect(asset, "cache-control", "immutable")
    expect("/ua/", "strict-transport-security", "max-age=")
    expect("/ua/", "x-content-type-options", "nosniff")
    expect("/ua/", "content-security-policy", "frame-ancestors")


def check_redirects(site: str, environment: str, report: Report) -> None:
    for old, new in LEGACY_REDIRECTS:
        problem = redirect_problem(fetch(site + old), site + new)
        report.check(problem is None, f"{old} -> {new}", problem or "")
    host = urlparse(site).netloc
    variants = [f"http://{host}"]
    if environment == "prod":
        variants += [f"http://www.{host}", f"https://www.{host}"]
    for origin in variants:
        problem = redirect_problem(fetch(origin + "/ua/about/"), site + "/ua/about/")
        report.check(
            problem is None, f"{origin}/ua/about/ -> {site}/ua/about/", problem or ""
        )


def check_indexing(site: str, indexing: bool, report: Report) -> None:
    robots = fetch(site + "/robots.txt").body
    page = fetch(site + "/ua/")
    problems = indexing_problems(
        robots, page.body, page.header("x-robots-tag"), indexing, site
    )
    report.check(
        not problems,
        f"indexing {'open' if indexing else 'closed'}",
        "; ".join(problems),
    )
    if not indexing:
        # Files without a <meta name="robots"> rely on the header alone
        for path in ("/ua/about.md", "/llms.txt"):
            tag = fetch(site + path).header("x-robots-tag")
            report.check(
                "noindex" in tag.lower(),
                f"{path} X-Robots-Tag noindex",
                tag or "(none)",
            )


def check_no_cms(site: str, report: Report) -> None:
    admin = fetch(site + "/admin/").body
    report.check(f"url={MAIN_CMS_URL}" in admin, f"/admin/ points to {MAIN_CMS_URL}")
    status = fetch(site + "/api/auth").status
    report.check(status == 404, "/api/auth refuses", str(status))


def main(argv: list[str] | None = None) -> int:
    # UTF-8 whatever the console default (Windows: cp1252)
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("site", help="Public URL, e.g. https://ocs.com.ua")
    parser.add_argument("--environment", choices=["dev", "prod"], required=True)
    parser.add_argument("--indexing", choices=["true", "false"], required=True)
    args = parser.parse_args(argv)
    site = args.site.rstrip("/")

    report = Report()
    check_health(site, report)
    check_headers(site, report)
    check_redirects(site, args.environment, report)
    check_indexing(site, args.indexing == "true", report)
    if args.environment == "dev":
        check_no_cms(site, report)

    if report.failures:
        print(f"\n{len(report.failures)} check(s) failed: {', '.join(report.failures)}")
        return 1
    print("\nAll checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
