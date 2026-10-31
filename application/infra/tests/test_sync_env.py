"""Tests for sync-env.py (merging .env.example into an existing .env.local)."""

import importlib.util
import pathlib

# Import the module under test directly (it's a plain Python module wrapped
# in uv inline script metadata that Python's import system ignores).
_script = pathlib.Path(__file__).parents[1] / "scripts" / "sync-env.py"
_spec = importlib.util.spec_from_file_location("sync_env", _script)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
sync_env = _mod.sync_env
_GH_HTTPS = _mod._GH_HTTPS

EXAMPLE = """# Group A
FOO=default_foo
# BAR=default_bar

# Group B
BAZ=default_baz
"""


def test_keeps_local_values_and_example_structure():
    new, added, custom, overridden = sync_env(EXAMPLE, "BAZ=mine\nFOO=local_foo\n")
    assert new == "# Group A\nFOO=local_foo\n# BAR=default_bar\n\n# Group B\nBAZ=mine\n"
    assert added == []
    assert custom == []
    assert overridden == []


def test_adds_keys_missing_from_local_with_example_value():
    new, added, _, _ = sync_env(EXAMPLE, "FOO=local_foo\n")
    assert "BAZ=default_baz" in new
    assert added == ["BAZ"]


def test_local_value_replaces_commented_example_key():
    new, added, _, _ = sync_env(EXAMPLE, "FOO=a\nBAR=set_locally\nBAZ=c\n")
    assert "BAR=set_locally" in new
    assert "# BAR=default_bar" not in new
    assert added == []


def test_commented_example_key_not_in_local_stays_commented_and_is_not_reported():
    new, added, _, _ = sync_env(EXAMPLE, "FOO=a\nBAZ=c\n")
    assert "# BAR=default_bar" in new
    assert "BAR" not in added


def test_keeps_custom_keys_in_trailing_block():
    new, _, custom, _ = sync_env(EXAMPLE, "FOO=a\nBAZ=c\nEXTRA=1\n")
    assert custom == ["EXTRA"]
    assert new.endswith("\n\n# Custom variables (not in .env.example)\nEXTRA=1\n")


def test_is_idempotent():
    first, _, _, _ = sync_env(EXAMPLE, "FOO=x\nEXTRA=1\n")
    second, added, custom, overridden = sync_env(EXAMPLE, first)
    assert second == first
    assert added == []
    assert custom == ["EXTRA"]
    assert overridden == []


def test_handles_crlf_local_file():
    new, added, _, _ = sync_env(EXAMPLE, "FOO=a\r\nBAZ=c\r\n")
    assert "\r" not in new
    assert added == []


def test_applies_overrides_to_matching_keys():
    new, added, custom, overridden = sync_env(
        EXAMPLE, "FOO=local_foo\nBAZ=local_baz\n", {"FOO": "git_foo"}
    )
    assert "FOO=git_foo" in new
    assert "BAZ=local_baz" in new
    assert overridden == ["FOO"]
    assert added == []
    assert custom == []


def test_applies_overrides_when_key_commented_in_example():
    new, added, custom, overridden = sync_env(
        EXAMPLE, "FOO=local_foo\nBAZ=local_baz\n", {"BAR": "git_bar"}
    )
    assert "BAR=git_bar" in new
    assert "# BAR=default_bar" not in new
    assert overridden == ["BAR"]
    assert added == []
    assert custom == []


def test_applies_overrides_when_key_custom():
    new, added, custom, overridden = sync_env(
        EXAMPLE, "FOO=local_foo\nBAZ=local_baz\n", {"CUSTOM_VAR": "custom_val"}
    )
    assert "CUSTOM_VAR=custom_val" in new
    assert custom == ["CUSTOM_VAR"]
    assert overridden == []


def test_gh_remote_url_regex():
    m = _GH_HTTPS.search("https://github.com/owner-name/repo-name.git")
    assert m and m.group(1) == "owner-name" and m.group(2) == "repo-name"

    m = _GH_HTTPS.search("git@github.com:owner-name/repo-name.git")
    assert m and m.group(1) == "owner-name" and m.group(2) == "repo-name"

    m = _GH_HTTPS.search("https://github.com/owner-name/repo-name")
    assert m and m.group(1) == "owner-name" and m.group(2) == "repo-name"
