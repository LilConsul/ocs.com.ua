"""Tests for verify-site.py: the pure checks and the no-redirect fetch against a local server."""

import importlib.util
import pathlib
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

_script = pathlib.Path(__file__).parents[1] / "scripts" / "verify-site.py"
_spec = importlib.util.spec_from_file_location("verify_site", _script)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

SITE = "https://ocs.com.ua"
OPEN_ROBOTS = "User-agent: *\nDisallow: /admin/\n\nSitemap: https://ocs.com.ua/sitemap-index.xml\n"
CLOSED_ROBOTS = "User-agent: *\nDisallow: /\n"
INDEX_PAGE = '<head><meta name="robots" content="index, follow"></head>'
NOINDEX_PAGE = '<head><meta name="robots" content="noindex, nofollow"></head>'


def test_open_site_passes():
    assert _mod.indexing_problems(OPEN_ROBOTS, INDEX_PAGE, "", True, SITE) == []


def test_open_site_must_not_block_or_carry_noindex():
    problems = _mod.indexing_problems(
        CLOSED_ROBOTS, NOINDEX_PAGE, "noindex, nofollow", True, SITE
    )
    assert "robots.txt blocks the whole site" in problems
    assert "robots.txt lacks the sitemap" in problems
    assert "page is not index, follow" in problems
    assert any(p.startswith("unexpected X-Robots-Tag") for p in problems)


def test_closed_site_passes():
    assert (
        _mod.indexing_problems(
            CLOSED_ROBOTS, NOINDEX_PAGE, "noindex, nofollow", False, SITE
        )
        == []
    )


def test_closed_site_must_block_everything():
    problems = _mod.indexing_problems(OPEN_ROBOTS, INDEX_PAGE, "", False, SITE)
    assert problems == [
        "robots.txt must disallow everything",
        "page must carry noindex, nofollow",
        "X-Robots-Tag noindex missing",
    ]


def test_disallow_of_a_path_is_not_disallow_all():
    robots = "User-agent: *\nDisallow: /admin/\nDisallow: /api/\n"
    assert "robots.txt must disallow everything" in _mod.indexing_problems(
        robots, NOINDEX_PAGE, "noindex", False, SITE
    )


def test_finds_the_hashed_stylesheet():
    html = (
        '<link rel="stylesheet" href="/_astro/Layout.DPIW7Cof.css"><link href="/x.css">'
    )
    assert _mod.find_asset(html) == "/_astro/Layout.DPIW7Cof.css"
    assert _mod.find_asset("<p>no styles</p>") is None


def test_redirect_must_be_one_301_to_the_target():
    ok = _mod.Response(301, {"location": f"{SITE}/ua/contact/"})
    assert _mod.redirect_problem(ok, f"{SITE}/ua/contact/") is None
    wrong_target = _mod.Response(301, {"location": f"{SITE}/ua/"})
    assert "got 301 https://ocs.com.ua/ua/" in _mod.redirect_problem(
        wrong_target, f"{SITE}/ua/contact/"
    )
    temporary = _mod.Response(302, {"location": f"{SITE}/ua/contact/"})
    assert _mod.redirect_problem(temporary, f"{SITE}/ua/contact/") is not None
    missing = _mod.Response(404, {})
    assert "(no Location)" in _mod.redirect_problem(missing, f"{SITE}/ua/contact/")


class _Handler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        if self.path == "/old":
            self.send_response(301)
            self.send_header("Location", "/new/")
            self.end_headers()
        elif self.path == "/missing":
            self.send_response(404)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"not here")
        else:
            self.send_response(200)
            self.send_header("Content-Type", "text/markdown; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"# page")

    def log_message(self, *args):
        pass


def _serve():
    server = HTTPServer(("127.0.0.1", 0), _Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_port}"


def test_fetch_returns_redirects_and_errors_instead_of_following_or_raising():
    server, base = _serve()
    try:
        moved = _mod.fetch(base + "/old")
        assert moved.status == 301
        assert moved.header("Location") == "/new/"
        missing = _mod.fetch(base + "/missing")
        assert (missing.status, missing.body) == (404, "not here")
        page = _mod.fetch(base + "/page")
        assert page.status == 200
        assert page.header("content-type") == "text/markdown; charset=utf-8"
        assert page.body == "# page"
    finally:
        server.shutdown()


def test_report_collects_failures(capsys):
    report = _mod.Report()
    assert report.check(True, "fine") is True
    assert report.check(False, "broken", "why") is False
    assert report.failures == ["broken"]
    assert "FAIL broken: why" in capsys.readouterr().out
