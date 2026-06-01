import json
import re
from pathlib import Path
from urllib.parse import quote

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"
DOWNLOADS = ROOT / "downloads"

PDF_107 = (
    "https://www.ceec.edu.tw/files/file_pool/1/0j075625661497981164/"
    "08-107%E5%AD%B8%E5%B9%B4%E5%BA%A6%E6%8C%87%E8%80%83%E7%89%A9%E7%90%86%E7%A7%91_%E5%AE%9A%E7%A8%BF.pdf"
)


def norm(text: str) -> str:
    return re.sub(r"\s+", "", text or "")


def rel_url(path: Path) -> str:
    return quote(path.relative_to(ROOT).as_posix(), safe="/:#?&=%")


def local_pdf_url(year: int) -> str:
    return rel_url(DOWNLOADS / str(year) / "questionPdf.pdf")


def find_page_for_question(question, pages, search_from=0):
    text = norm(question.get("questionText", ""))
    candidates = []
    for size in (100, 80, 60, 45, 32, 24, 16):
        if len(text) >= size:
            candidates.append(text[:size])

    for needle in candidates:
        for idx in range(search_from, len(pages)):
            if needle in pages[idx]["norm"]:
                return idx + 1

    no = int(question["no"])
    patterns = [
        re.compile(rf"(^|[\s\n]){no}\s*[.．、]", re.MULTILINE),
        re.compile(rf"第\s*{no}\s*題"),
    ]
    for idx in range(search_from, len(pages)):
        raw = pages[idx]["text"]
        if any(pattern.search(raw) for pattern in patterns):
            return idx + 1

    for idx, page in enumerate(pages):
        raw = page["text"]
        if any(pattern.search(raw) for pattern in patterns):
            return idx + 1

    return max(1, min(len(pages), search_from + 1))


def page_window(start_pages, index, page_count):
    start = start_pages[index]
    next_start = start_pages[index + 1] if index + 1 < len(start_pages) else page_count
    end = max(start, next_start - 1)
    return list(range(start, min(page_count, end) + 1))


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    updated = 0

    for exam in data["exams"]:
        if exam["year"] == 107:
            exam["official"]["questionPdf"] = PDF_107

    for year_analysis in data["analysis"]:
        year = int(year_analysis["year"])
        pdf_path = DOWNLOADS / str(year) / "questionPdf.pdf"
        if not pdf_path.exists():
            print(f"{year}: missing {pdf_path}")
            continue

        reader = PdfReader(str(pdf_path))
        pages = []
        for page in reader.pages:
            text = page.extract_text() or ""
            pages.append({"text": text, "norm": norm(text)})

        start_pages = []
        search_from = 0
        for question in year_analysis.get("questions", []):
            start = find_page_for_question(question, pages, search_from)
            start_pages.append(start)
            search_from = max(0, start - 1)

        for idx, question in enumerate(year_analysis.get("questions", [])):
            nums = page_window(start_pages, idx, len(pages))
            question["sourcePageNumbers"] = nums
            question["previewPages"] = [
                f"{local_pdf_url(year)}#page={page_no}&view=FitH" for page_no in nums
            ]
            question["previewSource"] = "official-pdf"
            updated += 1

        print(f"{year}: mapped {len(start_pages)} questions across {len(pages)} pages")

    DATA_PATH.write_text(
        "\ufeff" + json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"updated {updated} questions")


if __name__ == "__main__":
    main()
