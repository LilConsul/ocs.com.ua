#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Tells IndexNow search engines (Bing, Yandex, Seznam, Naver) which pages changed.

ChatGPT search and Copilot answer from the Bing index, so a page submitted here can show up
in AI answers within minutes instead of waiting for the next crawl.

Reads the sitemap of the deployed site and submits every page whose <lastmod> is at or after
--since (all pages when --since is not given). Run it only for the production site, after the
deploy: the build must have had INDEXNOW_KEY set, so /<key>.txt is live.

Usage:
    uv run application/infra/scripts/indexnow.py https://ocs.com.ua --key "$INDEXNOW_KEY" \
        [--since 2026-11-13T10:00:00Z] [--dry-run]
"""

import argparse
import json
import re
import sys
import urllib.request
from datetime import datetime
from urllib.parse import urlparse
from xml.etree import ElementTree

ENDPOINT = "https://api.indexnow.org/indexnow"
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
# IndexNow accepts up to 10,000 URLs per request
MAX_URLS = 10_000
KEY_RE = re.compile(r"^[A-Za-z0-9-]{8,128}$")


def parse_date(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def sitemap_entries(xml: str) -> list[tuple[str, str | None]]:
    """(loc, lastmod) of every <url> in a sitemap, or the <loc>s of a sitemap index."""
    root = ElementTree.fromstring(xml)
    entries = []
    for node in root.findall("sm:url", NS) + root.findall("sm:sitemap", NS):
        loc = node.findtext("sm:loc", namespaces=NS)
        if loc:
            entries.append((loc.strip(), node.findtext("sm:lastmod", namespaces=NS)))
    return entries


def changed_urls(
    entries: list[tuple[str, str | None]], since: datetime | None
) -> list[str]:
    """Pages to submit. A page without <lastmod> is always submitted when --since is used."""
    if since is None:
        return [loc for loc, _ in entries]
    return [
        loc
        for loc, lastmod in entries
        if lastmod is None or parse_date(lastmod) >= since
    ]


def payload(site: str, key: str, urls: list[str]) -> dict:
    host = urlparse(site).netloc
    return {
        "host": host,
        "key": key,
        "keyLocation": f"{site.rstrip('/')}/{key}.txt",
        "urlList": urls[:MAX_URLS],
    }


def fetch(url: str) -> str:
    with urllib.request.urlopen(url, timeout=30) as response:
        return response.read().decode("utf-8")


def collect(site: str) -> list[tuple[str, str | None]]:
    """Reads sitemap-index.xml and every sitemap it lists."""
    index = sitemap_entries(fetch(f"{site.rstrip('/')}/sitemap-index.xml"))
    pages: list[tuple[str, str | None]] = []
    for loc, _ in index:
        pages.extend(sitemap_entries(fetch(loc)))
    return pages


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("site", help="Deployed site, e.g. https://ocs.com.ua")
    parser.add_argument(
        "--key", required=True, help="The INDEXNOW_KEY the site was built with"
    )
    parser.add_argument(
        "--since", help="Only pages with <lastmod> at or after this ISO date"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Print the request, do not send"
    )
    args = parser.parse_args(argv)

    if not KEY_RE.match(args.key):
        print(
            "The key must be 8-128 characters of a-z, A-Z, 0-9 and '-'", file=sys.stderr
        )
        return 1

    since = parse_date(args.since) if args.since else None
    urls = changed_urls(collect(args.site), since)
    if not urls:
        print("No changed pages to submit.")
        return 0

    body = payload(args.site, args.key, urls)
    if args.dry_run:
        print(json.dumps(body, indent=2, ensure_ascii=False))
        return 0

    request = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        # 200 OK and 202 Accepted both mean the URLs were received
        print(f"IndexNow answered {response.status} for {len(body['urlList'])} URLs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
