import shutil

import pytest

from translator.paths import ROOT

HC_A = "datasheet-checkweigher-hc-a"


@pytest.fixture
def hc_a_pdf():
    return ROOT / f"files/en/{HC_A}.pdf"


@pytest.fixture
def tmp_root(tmp_path, hc_a_pdf):
    """A temporary project root holding a copy of the HC-A PDF at files/en/."""
    target = tmp_path / "files" / "en"
    target.mkdir(parents=True)
    shutil.copy(hc_a_pdf, target / hc_a_pdf.name)
    return tmp_path
