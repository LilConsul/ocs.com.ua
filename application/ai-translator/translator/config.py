import re
from dataclasses import dataclass
from pathlib import Path

import yaml

from translator.paths import ROOT


@dataclass(frozen=True)
class SourceConfig:
    branding: tuple[re.Pattern, ...]
    never_translate: frozenset[str]


def load_config(path: Path = ROOT / "sources.yaml") -> SourceConfig:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return SourceConfig(
        branding=tuple(re.compile(p, re.IGNORECASE) for p in data.get("branding", [])),
        never_translate=frozenset(data.get("never_translate", [])),
    )


def is_branding(text: str, cfg: SourceConfig) -> bool:
    stripped = text.strip()
    return any(p.search(stripped) for p in cfg.branding)
