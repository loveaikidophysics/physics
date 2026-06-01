import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"
REPORT_PATH = ROOT / "data" / "question-shot-audit.json"
DOWNLOADS = ROOT / "downloads"


def extract_group_headers(year):
    pdf_path = DOWNLOADS / str(year) / "questionPdf.pdf"
    if not pdf_path.exists():
        return []
    reader = PdfReader(str(pdf_path))
    headers = []
    for page_index, page in enumerate(reader.pages, start=1):
        fragments = []

        def visitor(text, cm, tm, font, size):
            clean = " ".join((text or "").split())
            if clean:
                fragments.append((float(tm[4]), float(tm[5]), clean))

        page.extract_text(visitor_text=visitor)
        lines = []
        for x, y, text in sorted(fragments, key=lambda item: (-item[1], item[0])):
            for line in lines:
                if abs(line["y"] - y) <= 3.0:
                    line["parts"].append((x, text))
                    line["y"] = (line["y"] + y) / 2
                    break
            else:
                lines.append({"y": y, "parts": [(x, text)]})

        for line in lines:
            joined = "".join(part for _, part in sorted(line["parts"]))
            compact = re.sub(r"\s+", "", joined)
            match = re.match(
                r"^(\d{1,2})[-－–~～](\d{1,2})(?:第)?題(?:為)?題組$",
                compact,
            ) or re.match(r"^(\d{1,2})[-－–~～](\d{1,2})為題組$", compact)
            if match:
                headers.append(
                    {
                        "page": page_index,
                        "y": float(line["y"]),
                        "firstQuestion": int(match.group(1)),
                        "lastQuestion": int(match.group(2)),
                    }
                )
    return headers


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    report = {
        "summary": {
            "questions": 0,
            "missingImages": 0,
            "missingAudit": 0,
            "boundaryOverruns": 0,
            "groupHeaderIssues": 0,
        },
        "years": [],
    }

    for analysis in data.get("analysis", []):
        year_report = {"year": analysis.get("year"), "items": []}
        group_headers = extract_group_headers(analysis.get("year"))
        questions_by_no = {
            int(question.get("no")): question
            for question in analysis.get("questions", [])
            if question.get("no") is not None
        }
        for question in analysis.get("questions", []):
            report["summary"]["questions"] += 1
            flags = []
            images = question.get("shotImages") or []
            audit_rows = question.get("shotAudit") or []

            if not images:
                flags.append("missing-images")
                report["summary"]["missingImages"] += 1
            if len(audit_rows) != len(images):
                flags.append("missing-or-mismatched-audit")
                report["summary"]["missingAudit"] += 1

            for row in audit_rows:
                boundary = row.get("nextBoundaryPdfY")
                bottom = row.get("bottomPdfY")
                if boundary is None or bottom is None:
                    continue
                # PDF y increases upward.  A bottom y lower than the boundary
                # means the crop crossed into the next question area.
                if float(bottom) < float(boundary) - 1.0:
                    flags.append(
                        f"boundary-overrun-before-q{row.get('nextQuestion')}-p{row.get('page')}"
                    )
                    report["summary"]["boundaryOverruns"] += 1

            no = int(question.get("no"))
            for header in group_headers:
                if header["firstQuestion"] != no:
                    continue
                first_row = audit_rows[0] if audit_rows else {}
                first_top = first_row.get("topPdfY")
                first_page = first_row.get("page")
                if first_page != header["page"] or first_top is None or float(first_top) < header["y"] + 6:
                    flags.append(
                        f"missing-group-header-q{header['firstQuestion']}-q{header['lastQuestion']}"
                    )
                    report["summary"]["groupHeaderIssues"] += 1

                previous = questions_by_no.get(no - 1)
                if previous:
                    for previous_row in previous.get("shotAudit") or []:
                        if previous_row.get("page") != header["page"]:
                            continue
                        previous_bottom = previous_row.get("bottomPdfY")
                        if previous_bottom is not None and float(previous_bottom) < header["y"] + 6:
                            flags.append(
                                f"previous-question-includes-group-header-q{header['firstQuestion']}-q{header['lastQuestion']}"
                            )
                            report["summary"]["groupHeaderIssues"] += 1

            if flags:
                year_report["items"].append(
                    {
                        "no": question.get("no"),
                        "flags": flags,
                        "shotImages": images,
                        "shotAudit": audit_rows,
                    }
                )

        report["years"].append(year_report)

    REPORT_PATH.write_text(
        "\ufeff" + json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    if any(
        report["summary"][key]
        for key in ["missingImages", "missingAudit", "boundaryOverruns", "groupHeaderIssues"]
    ):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
