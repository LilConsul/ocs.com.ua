"""Tests for render-env.py — mirrors the cases from the old JS test."""
import importlib.util
import pathlib

import pytest

# Import the module under test directly (it's a plain Python module wrapped
# in uv inline script metadata that Python's import system ignores).
_script = pathlib.Path(__file__).parents[1] / "scripts" / "render-env.py"
_spec = importlib.util.spec_from_file_location("render_env", _script)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
render_env = _mod.render_env

MANIFEST = {
    "env_file": "/home/ocs/test.env",
    "secrets": {"MY_SECRET": "SECRET_VAR"},
    "variables": {"MY_VAR": "PUBLIC_VAR"},
}


def test_maps_secret_to_env_line():
    result = render_env(MANIFEST, {"MY_SECRET": "s3cr3t"}, {"MY_VAR": "x"})
    assert 'SECRET_VAR="s3cr3t"' in result


def test_maps_variable_to_env_line():
    result = render_env(MANIFEST, {"MY_SECRET": "x"}, {"MY_VAR": "hello"})
    assert 'PUBLIC_VAR="hello"' in result


def test_escapes_backslashes():
    result = render_env(MANIFEST, {"MY_SECRET": "back\\slash"}, {"MY_VAR": "x"})
    assert 'SECRET_VAR="back\\\\slash"' in result


def test_escapes_double_quotes():
    result = render_env(MANIFEST, {"MY_SECRET": 'say "hi"'}, {"MY_VAR": "x"})
    assert 'SECRET_VAR="say \\"hi\\""' in result


def test_raises_if_secret_missing():
    with pytest.raises(ValueError, match="MY_SECRET"):
        render_env(MANIFEST, {}, {"MY_VAR": "x"})


def test_raises_if_secret_empty():
    with pytest.raises(ValueError, match="MY_SECRET"):
        render_env(MANIFEST, {"MY_SECRET": ""}, {"MY_VAR": "x"})


def test_raises_if_value_contains_newline():
    with pytest.raises(ValueError):
        render_env(MANIFEST, {"MY_SECRET": "bad\nvalue"}, {"MY_VAR": "x"})
