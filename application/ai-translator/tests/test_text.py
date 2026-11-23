from collections import Counter

from translator.paths import paths_for
from translator.text import normalise_text, number_style_errors, numbers


def test_normalise_ligatures_and_split_space():
    assert normalise_text("signiﬁ cantly") == "significantly"
    assert normalise_text("eﬃ  ciency") == "efficiency"
    assert normalise_text("certiﬁ cate") == "certificate"


def test_normalise_hyphenated_line_break_and_whitespace():
    assert normalise_text("con-\ntinues  the\nuse") == "continues the use"
    assert normalise_text("Ethernet/IP, RS232") == "Ethernet/IP, RS232"


def test_numbers_normalises_thousands_and_footnotes():
    assert numbers("4,000 g") == Counter({"4000": 1})
    assert numbers("Interfaces 2)") == Counter()
    assert numbers("L1/N/PE; 100-240 VAC") == Counter({"1": 1, "100": 1, "240": 1})
    assert numbers("≥ 0.1 g") == numbers("≥ 0.1 г")


def test_numbers_catches_changed_value():
    assert numbers("750 g") != numbers("75 г")


def test_number_style_errors():
    assert number_style_errors("0,1 г") == ["0,1"]
    assert number_style_errors("RS232, RS422 і 7500 г") == []


def test_paths_for(tmp_path):
    p = paths_for("x", root=tmp_path)
    assert p.root == tmp_path
    assert p.source_pdf == tmp_path / "files/en/x.pdf"
    assert p.output_pdf == tmp_path / "files/ua/x.pdf"
    assert p.ua_yaml == tmp_path / "work/x/ua.yaml"
