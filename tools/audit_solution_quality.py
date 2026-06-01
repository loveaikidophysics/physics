import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"
REPORT_PATH = ROOT / "data" / "solution-quality-audit.json"


GENERIC_MARKERS = [
    "官方評分重點如下",
    "可能的作法",
    "評分要點",
    "評分標準說明",
    "作答時需完整列出",
    "題幹重點為",
    "依題幹條件與選項比較",
    "若題目含圖表",
    "先判斷波速",
    "先判斷電場",
    "建立受力、運動或能量模型",
    "題幹重點為",
    "依題幹條件與選項比較",
    "若題目含圖表",
    "先判斷波速",
    "先判斷電場",
    "建立受力、運動或能量模型",
    "本題題文含圖形、表格或公式",
    "先把題目情境轉成物理模型",
    "若涉及計算，先列式再代入數值",
    "此題屬多選題，逐一檢查",
    "保留與基本定律",
    "代入題目給定",
    "解題時先鎖定題目要求的物理量",
    "依此檢查，只有選項",
    "同時符合題目情境、量綱、方向與適用條件",
]

NOTE_MARKERS = [
    "常見錯誤",
    "關鍵觀念",
    "常見作答錯誤",
    "常見錯誤",
    "關鍵觀念",
    "commonMistake",
    "commonMistakes",
    "keyConcept",
]

CALC_HINTS = [
    "計算",
    "估算",
    "量值",
    "大小",
    "速率",
    "速度",
    "加速度",
    "功率",
    "電流",
    "電壓",
    "電阻",
    "能量",
    "週期",
    "頻率",
    "波長",
    "半徑",
    "距離",
    "時間",
    "質量",
    "密度",
    "kW",
    "kg",
    "m/s",
    "cm",
    "kPa",
    "Hz",
    "V",
    "A",
    "N",
    "W",
]

TYPEWRITTEN_FORMULA_PATTERNS = [
    re.compile(r"\bPi\b|\bpi\b"),
    re.compile(r"\^[0-9(]"),
    re.compile(r"\btheta\b|\blambda\b|\bomega\b|\bDelta\b|\balpha\b|\bbeta\b|\bgamma\b"),
    re.compile(r"完整(?:推導|計算|化簡)補充"),
    re.compile(
        r"(?:v_1-v²|得 u²=3|u1=-5|202×3|302|4\.02|GM/R_2|GMm/R_2=|"
        r"v²=c/n2|v_2 成正比|μv2|ρv2|vtop2|vbottom2|202\+|∝n2|"
        r"En=-13\.606/n2|N3>N1|n1sinθ1|I=I0e|0\.37I0|cm−1|"
        r"F=I₁ℓ_bB|B=w/\(I₁ℓ_b\)|ΔP光子)"
    ),
]

MATHJAX_PATTERN = re.compile(r"\\\(.+?\\\)|\\\[.+?\\\]", re.S)


def strip_mathjax(text):
    return MATHJAX_PATTERN.sub(" ", text)

GIBBERISH_PATTERN = re.compile(r"[\uf000-\uf8ff\u0b80-\u0dff\u0530-\u058f\u25a1\ufffd]")
DIAGRAM_REQUIRED_PATTERN = re.compile(r"受力圖|力圖|光路|光徑|電路圖|示意圖")


def is_calc_like(question):
    text = question.get("questionText", "")
    has_calc_keyword = any(hint in text for hint in CALC_HINTS)
    has_number_with_unit = bool(
        re.search(
            r"\d+(?:\.\d+)?\s*(?:m/s|m|cm|mm|kg|g|N|V|A|W|kW|Hz|nm|kPa|atm|L|min|s|J|度|公尺|秒|分鐘|公斤|公噸)",
            text,
        )
    )
    has_formula_phrase = any(
        phrase in text
        for phrase in [
            "計算過程",
            "估算",
            "約為",
            "量值",
            "大小為",
            "速率為",
            "功率為",
            "時間約",
            "週期約",
        ]
    )
    return has_calc_keyword and (has_number_with_unit or has_formula_phrase)


def has_formula_work(solution):
    return any(symbol in solution for symbol in ["=", "≈", "∝", "√", "×", "÷", "/", "²", "³", "^"])


def audit_question(question):
    solution = question.get("solution", "")
    combined_text = "\n".join(
        [
            question.get("questionText", ""),
            solution,
            "\n".join(diagram.get("title", "") + "\n" + diagram.get("svg", "") for diagram in question.get("solutionDiagrams", [])),
        ]
    )
    calc_like = is_calc_like(question)
    flags = []

    if question.get("solutionStatus") == "structured-complete-draft":
        flags.append("unverified-structured-draft")
    if any(marker in solution for marker in GENERIC_MARKERS):
        flags.append("generic-or-placeholder")
    if any(marker in combined_text for marker in NOTE_MARKERS) or any(
        key in question for key in ["commonMistake", "commonMistakes", "keyConcept"]
    ):
        flags.append("note-field-or-text-left")
    if calc_like and len(solution) < 90 and not has_formula_work(solution):
        flags.append("calc-solution-too-short")
    if calc_like and not has_formula_work(solution):
        flags.append("calc-solution-missing-formula-work")
    plain_solution = strip_mathjax(solution)
    if any(pattern.search(plain_solution) for pattern in TYPEWRITTEN_FORMULA_PATTERNS):
        flags.append("typewritten-formula-style")
    if GIBBERISH_PATTERN.search(combined_text):
        flags.append("garbled-text")
    if DIAGRAM_REQUIRED_PATTERN.search(solution) and not question.get("solutionDiagrams"):
        flags.append("diagram-missing")
    if question.get("answer") == "非選擇題" and len(solution) < 240:
        flags.append("nonchoice-solution-too-short")

    return flags


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    report = {"summary": {}, "years": []}
    totals = {
        "questions": 0,
        "flagged": 0,
        "genericOrPlaceholder": 0,
        "unverifiedStructuredDraft": 0,
        "typewrittenFormulaStyle": 0,
        "garbledText": 0,
        "diagramMissing": 0,
        "noteText": 0,
    }

    for analysis in data.get("analysis", []):
        year_report = {
            "year": analysis["year"],
            "totalQuestions": 0,
            "flaggedQuestions": 0,
            "items": [],
        }
        for question in analysis.get("questions", []):
            flags = audit_question(question)
            totals["questions"] += 1
            year_report["totalQuestions"] += 1
            if flags:
                totals["flagged"] += 1
                year_report["flaggedQuestions"] += 1
                if "generic-or-placeholder" in flags:
                    totals["genericOrPlaceholder"] += 1
                if "unverified-structured-draft" in flags:
                    totals["unverifiedStructuredDraft"] += 1
                if "typewritten-formula-style" in flags:
                    totals["typewrittenFormulaStyle"] += 1
                if "garbled-text" in flags:
                    totals["garbledText"] += 1
                if "diagram-missing" in flags:
                    totals["diagramMissing"] += 1
                if "note-field-or-text-left" in flags:
                    totals["noteText"] += 1
                year_report["items"].append(
                    {
                        "no": question.get("no"),
                        "unit": question.get("unit", ""),
                        "answer": question.get("answer", ""),
                        "flags": flags,
                        "solutionPreview": solution_preview(question.get("solution", "")),
                    }
                )
        report["years"].append(year_report)

    report["summary"] = totals
    REPORT_PATH.write_text(
        "\ufeff" + json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))


def solution_preview(solution):
    return re.sub(r"\s+", " ", solution)[:180]


if __name__ == "__main__":
    main()
