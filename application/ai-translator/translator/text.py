import re
from collections import Counter

_LIGATURES = {
    "\ufb00": "ff",
    "\ufb01": "fi",
    "\ufb02": "fl",
    "\ufb03": "ffi",
    "\ufb04": "ffl",
    "\ufb05": "st",
    "\ufb06": "st",
}
_LIGATURE_CLASS = "[" + "".join(_LIGATURES) + "]"
_LIGATURE_SPLIT = re.compile(rf"({_LIGATURE_CLASS})\s+(?=[a-z])")
_HYPHEN_BREAK = re.compile(r"(?<=[^\W\d_])-\n(?=[^\W\d_])")
_FOOTNOTE = re.compile(r"(?<![\w.,])\d\)")
_NUMBER = re.compile(r"\d+(?:[.,]\d+)*")
_THOUSANDS = re.compile(r"\d{1,3}(?:,\d{3})+")
_COMMA_DECIMAL = re.compile(r"\d,\d+")


def normalise_text(s: str) -> str:
    s = _LIGATURE_SPLIT.sub(r"\1", s)
    s = s.translate(str.maketrans(_LIGATURES))
    s = _HYPHEN_BREAK.sub("", s)
    return re.sub(r"\s+", " ", s).strip()


def numbers(s: str) -> Counter[str]:
    s = _FOOTNOTE.sub("", s)
    found: Counter[str] = Counter()
    for match in _NUMBER.findall(s):
        if _THOUSANDS.fullmatch(match):
            found[match.replace(",", "")] += 1
        else:
            found[match.replace(",", ".")] += 1
    return found


def number_style_errors(s: str) -> list[str]:
    return _COMMA_DECIMAL.findall(s)
