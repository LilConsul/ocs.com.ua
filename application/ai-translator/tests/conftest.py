import json
import shutil
from pathlib import Path

import pytest
import yaml

from translator.model import load_doc
from translator.paths import FRONTEND, ROOT, paths_for

HC_A = "datasheet-checkweigher-hc-a"
SAMPLE = Path(__file__).parent / "fixtures" / "sample"


@pytest.fixture
def hc_a_pdf():
    return ROOT / f"files/en/{HC_A}.pdf"


@pytest.fixture
def source_pdf():
    """Path of a source datasheet by file stem, without the "datasheet-" prefix."""
    return lambda name: ROOT / "files" / "en" / f"datasheet-{name}.pdf"


@pytest.fixture
def tmp_root(tmp_path, hc_a_pdf):
    """A temporary project root holding a copy of the HC-A PDF at files/en/."""
    target = tmp_path / "files" / "en"
    target.mkdir(parents=True)
    shutil.copy(hc_a_pdf, target / hc_a_pdf.name)
    return tmp_path


@pytest.fixture
def doc():
    """The Ukrainian sample datasheet: every block type, three pages."""
    return load_doc(SAMPLE / "ua.yaml")


@pytest.fixture
def company():
    return json.loads((FRONTEND / "src" / "data" / "company.json").read_text(encoding="utf-8"))


@pytest.fixture
def branding():
    return yaml.safe_load((ROOT / "branding.yaml").read_text(encoding="utf-8"))


@pytest.fixture
def fixture_paths(tmp_path):
    """Paths for the "sample" datasheet under a temporary root, sample copied to work/sample/."""
    paths = paths_for("sample", root=tmp_path)
    shutil.copytree(SAMPLE, paths.work_dir)
    return paths
