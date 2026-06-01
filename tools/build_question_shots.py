import json
import re
import shutil
from pathlib import Path
from urllib.parse import quote

from pdf2image import convert_from_path
from PIL import Image
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"
DOWNLOADS = ROOT / "downloads"
OUTPUT_ROOT = ROOT / "assets" / "question-shots"
POPPLER_PATH = Path(r"D:\codex\Release-26.02.0-0\poppler-26.02.0\Library\bin")
DPI = 220
MIN_CHOICE_SEGMENT_HEIGHT = 320
MANUAL_STARTS = {
    (114, 21): {"page": 6, "y": 353.7},
    (110, 22): {"page": 7, "y": 606.1},
    (106, 15): {"page": 4, "y": 250.0},
    (105, 13): {"page": 4, "y": 270.0},
    (104, 7): {"page": 3, "y": 400.0},
    (104, 8): {"page": 3, "y": 167.0},
    (103, 10): {"page": 4, "y": 252.0},
    (101, 16): {"page": 5, "y": 400.4},
    (100, 4): {"page": 2, "y": 245.0},
    (108, 19): {"page": 6, "y": 590.5},
    (108, 24): {"page": 7, "y": 342.0},
    (111, 25): {"page": 8, "y": 447.0},
    (110, 25): {"page": 8, "y": 646.4},
    (110, 26): {"page": 8, "y": 270.0},
    (109, 25): {"page": 8, "y": 744.3},
    (109, 26): {"page": 8, "y": 410.0},
    (108, 25): {"page": 8, "y": 744.7},
    (108, 26): {"page": 8, "y": 558.0},
    (107, 25): {"page": 7, "y": 251.2},
    (107, 26): {"page": 8, "y": 579.7},
    (106, 25): {"page": 8, "y": 629.2},
    (106, 26): {"page": 8, "y": 509.2},
    (105, 25): {"page": 8, "y": 646.3},
    (105, 26): {"page": 8, "y": 210.0},
    (104, 25): {"page": 8, "y": 742.7},
    (104, 26): {"page": 8, "y": 235.1},
    (103, 25): {"page": 8, "y": 628.9},
    (103, 26): {"page": 8, "y": 212.9},
    (102, 25): {"page": 8, "y": 645.3},
    (102, 26): {"page": 8, "y": 339.3},
    (101, 25): {"page": 8, "y": 633.1},
    (101, 26): {"page": 8, "y": 241.0},
    (100, 25): {"page": 8, "y": 633.1},
    (100, 26): {"page": 8, "y": 379.3},
}
MANUAL_ENDS = {
    (108, 18): {"page": 6, "y": 605.0},
    (108, 20): {"page": 6, "y": 414.0},
    (108, 24): {"page": 7, "y": 151.0},
    (111, 24): {"page": 8, "y": 470.0},
    (107, 20): {"page": 6, "y": 410.0},
    (107, 24): {"page": 7, "y": 390.0},
}


def rel_url(path: Path) -> str:
    return quote(path.relative_to(ROOT).as_posix(), safe="/")


def extract_question_starts(pdf_path: Path):
    reader = PdfReader(str(pdf_path))
    starts_by_page = {}

    for page_index, page in enumerate(reader.pages, start=1):
        fragments = []

        def visitor(text, cm, tm, font, size):
            clean = " ".join((text or "").split())
            x, y = float(tm[4]), float(tm[5])
            if clean and x > 20 and y > 30:
                fragments.append((x, y, clean))

        page.extract_text(visitor_text=visitor)
        lines = []
        for x, y, text in sorted(fragments, key=lambda item: (-item[1], item[0])):
            for line in lines:
                if abs(line["y"] - y) <= 2.5:
                    line["parts"].append((x, text))
                    line["min_x"] = min(line["min_x"], x)
                    line["y"] = (line["y"] + y) / 2
                    break
            else:
                lines.append({"y": y, "min_x": x, "parts": [(x, text)]})

        page_starts = {}
        for line in lines:
            if not 45 <= line["min_x"] <= 92:
                continue
            joined = "".join(part for _, part in sorted(line["parts"]))
            compact = re.sub(r"\s+", "", joined)
            group_match = re.match(
                r"^(\d{1,2})[-－–~～](\d{1,2})(?:第)?題(?:為)?題組$",
                compact,
            ) or re.match(r"^(\d{1,2})[-－–~～](\d{1,2})為題組$", compact)
            if group_match:
                first_no = int(group_match.group(1))
                if 1 <= first_no <= 40:
                    page_starts[first_no] = {
                        "page": page_index,
                        "y": line["y"],
                        "width": float(page.mediabox.width),
                        "height": float(page.mediabox.height),
                        "groupHeader": True,
                    }
                continue
            match = re.match(r"^(\d{1,2})(?:\s*[.．、]|(?=[\u4e00-\u9fff]))", compact)
            if not match:
                continue
            no = int(match.group(1))
            if 1 <= no <= 40 and no not in page_starts:
                page_starts[no] = {
                    "page": page_index,
                    "y": line["y"],
                    "width": float(page.mediabox.width),
                    "height": float(page.mediabox.height),
                }
        starts_by_page[page_index] = page_starts

    return starts_by_page, reader


def get_start(year, question, starts_by_page, reader):
    no = int(question["no"])
    manual = MANUAL_STARTS.get((year, no))
    if manual:
        page = reader.pages[manual["page"] - 1]
        return {
            "page": manual["page"],
            "y": manual["y"],
            "width": float(page.mediabox.width),
            "height": float(page.mediabox.height),
        }
    for page_no in sorted(starts_by_page):
        start = starts_by_page[page_no].get(no)
        if start:
            return start
    preferred_pages = question.get("sourcePageNumbers") or []
    for page_no in preferred_pages:
        start = starts_by_page.get(int(page_no), {}).get(no)
        if start:
            return start
    return None


def all_candidates(year, no, starts_by_page, reader):
    candidates = []
    manual = MANUAL_STARTS.get((year, no))
    if manual:
        page = reader.pages[manual["page"] - 1]
        candidates.append(
            {
                "page": manual["page"],
                "y": manual["y"],
                "width": float(page.mediabox.width),
                "height": float(page.mediabox.height),
                "manual": True,
            }
        )
    for page_no in sorted(starts_by_page):
        start = starts_by_page[page_no].get(no)
        if start:
            candidates.append(start)
    return sorted(candidates, key=lambda item: (item["page"], -item["y"]))


def build_sequential_starts(year, questions, starts_by_page, reader):
    mapped = {}
    previous = None
    for question in questions:
        no = int(question["no"])
        chosen = None
        for candidate in all_candidates(year, no, starts_by_page, reader):
            if previous is None:
                chosen = candidate
                break
            if candidate["page"] > previous["page"]:
                chosen = candidate
                break
            if candidate["page"] == previous["page"] and candidate["y"] < previous["y"] - 8:
                chosen = candidate
                break
        if chosen is None:
            chosen = get_start(year, question, starts_by_page, reader)
        if chosen:
            mapped[no] = chosen
            previous = chosen
    return mapped


def compose_manual_group_context(year_dir):
    q25_path = year_dir / "q25.png"
    q26_path = year_dir / "q26.png"
    if not q25_path.exists() or not q26_path.exists():
        return
    q25 = Image.open(q25_path).convert("RGB")
    stem = q25.crop((0, 0, q25.width, 625))
    q26 = Image.open(q26_path).convert("RGB")
    combined = Image.new("RGB", (q26.width, stem.height + q26.height), "white")
    combined.paste(stem, (0, 0))
    combined.paste(q26, (0, stem.height))
    combined.save(q26_path, optimize=True)


def crop_box(
    page,
    image,
    start_y,
    next_start_y=None,
    first_segment=True,
    last_segment=True,
    min_height=None,
    manual_end_y=None,
):
    page_w = float(page.mediabox.width)
    page_h = float(page.mediabox.height)
    sx = image.width / page_w
    sy = image.height / page_h

    left = int(45 * sx)
    right = int((page_w - 45) * sx)

    if first_segment:
        top_pdf = min(page_h - 48, start_y + 16)
    else:
        top_pdf = page_h - 82
    top = max(0, int((page_h - top_pdf) * sy))

    next_boundary = None
    if manual_end_y is not None:
        next_boundary = min(page_h - 48, manual_end_y)
        bottom_pdf = next_boundary
        bottom = int((page_h - bottom_pdf) * sy)
    elif next_start_y is not None:
        # Stop above the next question number/first line.  PDF y coordinates
        # increase upward, so a value greater than next_start_y crops earlier.
        next_boundary = min(page_h - 48, next_start_y + 14)
        bottom_pdf = next_boundary
        bottom = int((page_h - bottom_pdf) * sy)
    elif last_segment:
        bottom_pdf = 54
        bottom = int((page_h - 54) * sy)
    else:
        bottom_pdf = 54
        bottom = int((page_h - 54) * sy)

    if bottom <= top + 60 and not first_segment:
        return None
    if bottom <= top + 60:
        bottom = min(image.height, top + 260)
    if min_height:
        requested_bottom = min(image.height, top + int(min_height))
        if next_boundary is not None:
            requested_bottom = min(requested_bottom, int((page_h - next_boundary) * sy))
        bottom = max(bottom, requested_bottom)

    bottom = min(image.height, bottom)
    actual_bottom_pdf = page_h - (bottom / sy)
    return {
        "box": (left, top, right, bottom),
        "topPdfY": round(top_pdf, 2),
        "bottomPdfY": round(actual_bottom_pdf, 2),
        "nextBoundaryPdfY": round(next_boundary, 2) if next_boundary is not None else None,
    }


def main():
    if not (POPPLER_PATH / "pdfinfo.exe").exists():
        raise SystemExit(f"Poppler not found: {POPPLER_PATH}")

    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    if OUTPUT_ROOT.exists():
        shutil.rmtree(OUTPUT_ROOT)
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

    total = 0
    for analysis in data["analysis"]:
        year = int(analysis["year"])
        pdf_path = DOWNLOADS / str(year) / "questionPdf.pdf"
        if not pdf_path.exists():
            print(f"{year}: missing PDF")
            continue

        starts_by_page, reader = extract_question_starts(pdf_path)
        year_dir = OUTPUT_ROOT / str(year)
        year_dir.mkdir(parents=True, exist_ok=True)

        questions = sorted(analysis.get("questions", []), key=lambda q: int(q["no"]))
        sequential_starts = build_sequential_starts(year, questions, starts_by_page, reader)
        rendered_pages = {}

        def render_page(page_no):
            if page_no not in rendered_pages:
                rendered_pages[page_no] = convert_from_path(
                    str(pdf_path),
                    first_page=page_no,
                    last_page=page_no,
                    dpi=DPI,
                    poppler_path=str(POPPLER_PATH),
                )[0]
            return rendered_pages[page_no]

        made = 0
        for idx, question in enumerate(questions):
            no = int(question["no"])
            start = sequential_starts.get(no)
            if not start:
                question["shotImages"] = []
                question["shotStatus"] = "missing-start"
                continue

            next_question = questions[idx + 1] if idx + 1 < len(questions) else None
            next_start = sequential_starts.get(int(next_question["no"])) if next_question else None
            if next_start and (
                next_start["page"] < start["page"]
                or (next_start["page"] == start["page"] and next_start["y"] >= start["y"])
            ):
                next_start = None

            end_page = next_start["page"] if next_start else start["page"]
            images = []
            shot_audit = []
            for page_no in range(start["page"], end_page + 1):
                page = reader.pages[page_no - 1]
                image = render_page(page_no)
                segment_start_y = start["y"] if page_no == start["page"] else None
                segment_next_y = next_start["y"] if next_start and page_no == next_start["page"] else None
                manual_end = MANUAL_ENDS.get((year, no))
                manual_end_y = (
                    manual_end["y"]
                    if manual_end and manual_end["page"] == page_no and page_no == end_page
                    else None
                )
                crop = crop_box(
                    page,
                    image,
                    segment_start_y or float(page.mediabox.height) - 82,
                    segment_next_y,
                    first_segment=page_no == start["page"],
                    last_segment=page_no == end_page,
                    min_height=(
                        MIN_CHOICE_SEGMENT_HEIGHT
                        if question.get("answer") != "非選擇題"
                        and page_no == end_page
                        and manual_end_y is None
                        else None
                    ),
                    manual_end_y=manual_end_y,
                )
                if crop is None:
                    continue
                cropped = image.crop(crop["box"])
                suffix = "" if page_no == start["page"] and page_no == end_page else f"-p{page_no}"
                out_path = year_dir / f"q{no:02d}{suffix}.png"
                cropped.save(out_path, optimize=True)
                images.append(rel_url(out_path))
                shot_audit.append(
                    {
                        "page": page_no,
                        "topPdfY": crop["topPdfY"],
                        "bottomPdfY": crop["bottomPdfY"],
                        "nextBoundaryPdfY": crop["nextBoundaryPdfY"],
                        "nextQuestion": int(next_question["no"]) if next_question else None,
                    }
                )

            question["shotImages"] = images
            question["shotStatus"] = "auto-cropped"
            question["shotSource"] = "official-pdf"
            question["shotAudit"] = shot_audit
            made += 1
            total += 1

        print(f"{year}: generated {made}/{len(questions)} question shots")
        if year == 111:
            compose_manual_group_context(year_dir)

    DATA_PATH.write_text(
        "\ufeff" + json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"generated {total} question previews")


if __name__ == "__main__":
    main()
