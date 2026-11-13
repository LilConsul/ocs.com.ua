"""Tests for indexnow.py (sitemap parsing, change filter, request body)."""
import importlib.util
import pathlib
from datetime import datetime, timezone

_script = pathlib.Path(__file__).parents[1] / "scripts" / "indexnow.py"
_spec = importlib.util.spec_from_file_location("indexnow", _script)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

SITEMAP = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://ocs.com.ua/ua/</loc><lastmod>2026-11-13T10:00:00.000Z</lastmod></url>
  <url><loc>https://ocs.com.ua/ua/about/</loc><lastmod>2026-10-01T10:00:00.000Z</lastmod></url>
  <url><loc>https://ocs.com.ua/ua/contact/</loc></url>
</urlset>"""

INDEX = """<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://ocs.com.ua/sitemap-0.xml</loc></sitemap>
</sitemapindex>"""


def test_reads_loc_and_lastmod_of_every_url():
    assert _mod.sitemap_entries(SITEMAP) == [
        ("https://ocs.com.ua/ua/", "2026-11-13T10:00:00.000Z"),
        ("https://ocs.com.ua/ua/about/", "2026-10-01T10:00:00.000Z"),
        ("https://ocs.com.ua/ua/contact/", None),
    ]


def test_reads_the_sitemaps_of_an_index():
    assert _mod.sitemap_entries(INDEX) == [("https://ocs.com.ua/sitemap-0.xml", None)]


def test_without_since_submits_every_page():
    urls = _mod.changed_urls(_mod.sitemap_entries(SITEMAP), None)
    assert len(urls) == 3


def test_since_keeps_changed_pages_and_pages_without_lastmod():
    since = datetime(2026, 11, 1, tzinfo=timezone.utc)
    urls = _mod.changed_urls(_mod.sitemap_entries(SITEMAP), since)
    assert urls == ["https://ocs.com.ua/ua/", "https://ocs.com.ua/ua/contact/"]


def test_payload_points_at_the_key_file_on_the_host():
    body = _mod.payload("https://ocs.com.ua/", "abcd1234", ["https://ocs.com.ua/ua/"])
    assert body == {
        "host": "ocs.com.ua",
        "key": "abcd1234",
        "keyLocation": "https://ocs.com.ua/abcd1234.txt",
        "urlList": ["https://ocs.com.ua/ua/"],
    }


def test_rejects_an_invalid_key(capsys):
    assert _mod.main(["https://ocs.com.ua", "--key", "bad key!"]) == 1
    assert "8-128 characters" in capsys.readouterr().err
