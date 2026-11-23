import pytest

from translator.paths import ROOT


@pytest.fixture
def hc_a_pdf():
    return ROOT / "files/en/datasheet-checkweigher-hc-a.pdf"
