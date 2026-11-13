"""Tests for releases-summary.py (release listing -> run summary table)."""

import importlib.util
import json
import pathlib

_script = pathlib.Path(__file__).parents[1] / "scripts" / "releases-summary.py"
_spec = importlib.util.spec_from_file_location("releases_summary", _script)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

REPO = "https://github.com/LilConsul/ocs.com.ua"
INFO = {
    "commit": "14f8ee6d7c0a1b2c3d4e5f60718293a4b5c6d7e8",
    "ref": "main",
    "message": "Launch follow-ups: http|www redirects",
    "deployed": "2026-11-13T18:40:34Z",
    "run": "https://github.com/LilConsul/ocs.com.ua/actions/runs/1",
}
LISTING = [
    f"20261113-184034-14f8ee6\tlive\t{json.dumps(INFO)}\n",
    "20261113-182728-46df398\t-\t\n",
    "00000000-000000-initial\t-\t\n",
]


def test_parses_every_release_and_marks_the_live_one():
    releases = _mod.parse(LISTING)
    assert [r["name"] for r in releases] == [
        "20261113-184034-14f8ee6",
        "20261113-182728-46df398",
        "00000000-000000-initial",
    ]
    assert [r["live"] for r in releases] == [True, False, False]
    assert releases[0]["commit"] == INFO["commit"]


def test_a_release_without_release_json_still_gets_its_commit_from_the_name():
    out = _mod.table("https://ocs.com.ua", REPO, _mod.parse(LISTING))
    assert f"[`46df398`]({REPO}/commit/46df398)" in out


def test_live_release_row_links_the_full_commit_and_escapes_pipes():
    out = _mod.table("https://ocs.com.ua", REPO, _mod.parse(LISTING))
    row = next(line for line in out.splitlines() if "184034" in line)
    assert "**live**" in row
    assert f"({REPO}/commit/{INFO['commit']})" in row
    assert "http\\|www redirects" in row
    assert "2026-11-13T18:40:34Z" in row


def test_the_initial_release_has_no_commit_link():
    out = _mod.table("https://ocs.com.ua", REPO, _mod.parse(LISTING))
    row = next(line for line in out.splitlines() if "initial" in line)
    assert "/commit/" not in row


def test_broken_release_json_does_not_break_the_table():
    out = _mod.table(
        "https://ocs.com.ua",
        REPO,
        _mod.parse(["20261113-184034-14f8ee6\tlive\t{not json\n"]),
    )
    assert "`20261113-184034-14f8ee6` | **live**" in out
