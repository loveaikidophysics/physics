import json
import re
from pathlib import Path

from docx import Document
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]


def read_json(path):
    text = path.read_text(encoding="utf-8-sig")
    return json.loads(text)


def docx_text(path, limit=80):
    doc = Document(path)
    lines = []
    for paragraph in doc.paragraphs:
        text = re.sub(r"\s+", " ", paragraph.text).strip()
        if text:
            lines.append(text)
        if len(lines) >= limit:
            break
    return lines


def pdf_text(path, pages=2):
    reader = PdfReader(str(path))
    chunks = []
    for page in reader.pages[:pages]:
        chunks.append(page.extract_text() or "")
    return "\n".join(chunks)


def main():
    data = read_json(ROOT / "data" / "official-links.json")
    for year in [114, 111, 110, 105, 100]:
        print(f"\n===== {year} =====")
        folder = ROOT / "downloads" / str(year)
        docx = folder / "questionDocx.docx"
        if docx.exists():
            print("-- DOCX --")
            for line in docx_text(docx, 30):
                print(line[:220])
        print("-- choice answer PDF --")
        answer_pdf = folder / "choiceAnswer.pdf"
        if answer_pdf.exists():
            print(pdf_text(answer_pdf, 1)[:1200])
        print("-- non-choice PDF --")
        rubric_pdf = folder / "nonChoiceRubric.pdf"
        if rubric_pdf.exists():
            print(pdf_text(rubric_pdf, 1)[:1200])


if __name__ == "__main__":
    main()
