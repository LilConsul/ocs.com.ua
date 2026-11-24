from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT.parent / "frontend"


@dataclass(frozen=True)
class DatasheetPaths:
    name: str
    root: Path
    source_pdf: Path
    work_dir: Path
    en_yaml: Path
    ua_yaml: Path
    images_dir: Path
    contact_sheet: Path
    preview_dir: Path
    source_preview_dir: Path
    html: Path
    render_report: Path
    output_pdf: Path


def paths_for(name: str, root: Path = ROOT) -> DatasheetPaths:
    work = root / "work" / name
    return DatasheetPaths(
        name=name,
        root=root,
        source_pdf=root / "files" / "en" / f"{name}.pdf",
        work_dir=work,
        en_yaml=work / "en.yaml",
        ua_yaml=work / "ua.yaml",
        images_dir=work / "images",
        contact_sheet=work / "contact-sheet.png",
        preview_dir=work / "preview",
        source_preview_dir=work / "preview-en",
        html=work / "datasheet.html",
        render_report=work / "render-report.json",
        output_pdf=root / "files" / "ua" / f"{name}.pdf",
    )
