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
# A footnote mark is one digit and `)` not glued to a word or number ("400 mm 1)", "1) Water");
# a `)` that closes an open parenthesis ("(optionally 3)") is ordinary text.
_FOOTNOTE = re.compile(r"(?<![\w.,])\d\)")
_NUMBER = re.compile(r"\d+(?:[.,]\d+)*")
_THOUSANDS = re.compile(r"\d{1,3}(?:,\d{3})+")
_COMMA_DECIMAL = re.compile(r"\d,\d+")


def normalise_text(s: str) -> str:
    s = _LIGATURE_SPLIT.sub(r"\1", s)
    s = s.translate(str.maketrans(_LIGATURES))
    s = _HYPHEN_BREAK.sub("", s)
    return re.sub(r"\s+", " ", s).strip()


def footnote_mark_spans(s: str) -> list[tuple[int, int]]:
    """(start, end) of every footnote mark `N)` in s, outside any open parenthesis."""
    candidates = {m.start(): m.end() for m in _FOOTNOTE.finditer(s)}
    spans, depth, i = [], 0, 0
    while i < len(s):
        if i in candidates and depth == 0:
            spans.append((i, candidates[i]))
            i = candidates[i]
            continue
        if s[i] == "(":
            depth += 1
        elif s[i] == ")" and depth:
            depth -= 1
        i += 1
    return spans


def footnote_marks(s: str) -> Counter[str]:
    return Counter(s[a:b] for a, b in footnote_mark_spans(s))


def all_numbers(s: str) -> Counter[str]:
    """Every number in s, footnote marks included, thousands separators dropped."""
    found: Counter[str] = Counter()
    for match in _NUMBER.findall(s):
        if _THOUSANDS.fullmatch(match):
            found[match.replace(",", "")] += 1
        else:
            found[match.replace(",", ".")] += 1
    return found


def numbers(s: str) -> Counter[str]:
    """The numbers in s without its footnote marks (compare those with footnote_marks)."""
    for a, b in reversed(footnote_mark_spans(s)):
        s = s[:a] + " " + s[b:]
    return all_numbers(s)


def number_style_errors(s: str) -> list[str]:
    return _COMMA_DECIMAL.findall(s)
