import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"
INDEX_PATH = ROOT / "index.html"
SOLUTION_REPORT_PATH = ROOT / "data" / "solution-quality-audit.json"
SHOT_REPORT_PATH = ROOT / "data" / "question-shot-audit.json"
SYMBOL_REPORT_PATH = ROOT / "data" / "symbol-format-audit.json"
MATHJAX_REPORT_PATH = ROOT / "data" / "mathjax-formula-audit.json"


BAD_SOLUTION_MARKERS = [
    "??",
    " ext{",
    r"\mathrm{\mathrm",
    r"\ell_{bB}",
    r"I_{0e}",
    r"\mucos",
    r"\mumg",
    r"\sqrt{1}.",
]


def read_summary(path):
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8-sig")).get("summary", {})


def get_question(data, year, no):
    analysis = next(item for item in data["analysis"] if item["year"] == year)
    return next(item for item in analysis["questions"] if item["no"] == no)


def main():
    solution_summary = read_summary(SOLUTION_REPORT_PATH)
    shot_summary = read_summary(SHOT_REPORT_PATH)
    symbol_summary = read_summary(SYMBOL_REPORT_PATH)
    mathjax_summary = read_summary(MATHJAX_REPORT_PATH)

    missing_reports = [
        str(path.relative_to(ROOT))
        for path, summary in [
            (SOLUTION_REPORT_PATH, solution_summary),
            (SHOT_REPORT_PATH, shot_summary),
            (SYMBOL_REPORT_PATH, symbol_summary),
            (MATHJAX_REPORT_PATH, mathjax_summary),
        ]
        if summary is None
    ]
    if missing_reports:
        print("尚未達到最終發佈標準：缺少稽核報告。")
        for item in missing_reports:
            print(f"  - {item}")
        return 1

    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    index_text = INDEX_PATH.read_text(encoding="utf-8-sig") if INDEX_PATH.exists() else ""

    errors = []
    if int(solution_summary.get("flagged", 0)):
        errors.append(f"待補強詳解題目：{solution_summary.get('flagged')}")
    if int(solution_summary.get("typewrittenFormulaStyle", 0)):
        errors.append(f"打字式公式格式：{solution_summary.get('typewrittenFormulaStyle')}")
    if int(solution_summary.get("garbledText", 0)):
        errors.append(f"亂碼詳解：{solution_summary.get('garbledText')}")
    if int(shot_summary.get("missingImages", 0)):
        errors.append(f"缺少題目截圖：{shot_summary.get('missingImages')}")
    if int(shot_summary.get("boundaryOverruns", 0)):
        errors.append(f"截圖越界：{shot_summary.get('boundaryOverruns')}")
    if int(symbol_summary.get("ambiguousSubscripts", 0)):
        errors.append(f"未轉成下標的符號：{symbol_summary.get('ambiguousSubscripts')}")
    if int(mathjax_summary.get("flaggedQuestions", 0)) or int(mathjax_summary.get("formulaRuns", 0)):
        errors.append(
            "MathJax 外仍有裸露公式："
            f"{mathjax_summary.get('flaggedQuestions')} 題 / {mathjax_summary.get('formulaRuns')} 處"
        )

    for analysis in data.get("analysis", []):
        total_questions = len(analysis.get("questions", []))
        type_total = sum(int(row.get("count", 0)) for row in analysis.get("literacyTypes", []))
        if type_total != total_questions:
            errors.append(f"{analysis.get('year')} 年題型統計總數 {type_total} 與題數 {total_questions} 不一致")

    banned_page_text = ["校訂中草稿", "qa-banner", "素養題型整理", "全部年度官方下載", "常見錯誤", "關鍵觀念"]
    for marker in banned_page_text:
        if marker in index_text:
            errors.append(f"頁面仍含不應出現文字：{marker}")
    if "MathJax" not in index_text or "tex-svg.js" not in index_text:
        errors.append("頁面未載入 MathJax。")

    bad_solution_hits = []
    for analysis in data.get("analysis", []):
        for question in analysis.get("questions", []):
            solution = question.get("solution", "")
            hits = [marker for marker in BAD_SOLUTION_MARKERS if marker in solution]
            if hits:
                bad_solution_hits.append(f"{analysis.get('year')} 年第 {question.get('no')} 題：{', '.join(hits)}")
    if bad_solution_hits:
        errors.append("詳解仍含已知壞格式：")
        errors.extend(f"  - {item}" for item in bad_solution_hits[:20])

    q108_26 = get_question(data, 108, 26)
    diagram_text_108 = "\n".join(diag.get("svg", "") + diag.get("text", "") for diag in q108_26.get("solutionDiagrams", []))
    if "2μF cosθ = 2F sinθ + mg" not in diagram_text_108 or "微粒受力向上" not in diagram_text_108:
        errors.append("108 年非選第二題示意圖尚未更新到新版。")

    q101_25 = get_question(data, 101, 25)
    diagram_text_101 = "\n".join(diag.get("svg", "") + diag.get("text", "") for diag in q101_25.get("solutionDiagrams", []))
    if "等臂平衡：F = I₁ℓ_bB = w" not in diagram_text_101:
        errors.append("101 年非選第一題電流天平圖尚未更新到新版。")

    required_math = [
        (114, 20, r"\mu_\beta"),
        (114, 26, r"\frac{I}{I_0}"),
        (108, 26, r"\Delta\vec P_{\mathrm{light}}"),
        (101, 25, r"\ell_b"),
        (101, 20, r"{}^{14}\mathrm{C}"),
        (100, 11, r"n_1\sin\theta_1"),
    ]
    for year, no, marker in required_math:
        if marker not in get_question(data, year, no).get("solution", ""):
            errors.append(f"{year} 年第 {no} 題缺少指定 MathJax 公式：{marker}")

    if errors:
        print("尚未達到最終發佈標準。")
        for error in errors:
            print(f"- {error}")
        return 1

    print("已達最終發佈標準：詳解品質、MathJax 公式、符號格式、題型統計與題目截圖稽核皆通過。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
