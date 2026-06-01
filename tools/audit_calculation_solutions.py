import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"
REPORT_PATH = ROOT / "data" / "solution-audit.json"

CALC_KEYWORDS = [
    "多少",
    "估算",
    "計算",
    "求",
    "比值",
    "倍率",
    "速率",
    "速度",
    "加速度",
    "電流",
    "電壓",
    "電阻",
    "功率",
    "能量",
    "動能",
    "位能",
    "週期",
    "頻率",
    "波長",
    "折射率",
    "電場",
    "磁場",
    "力矩",
    "壓力",
    "溫度",
    "時間",
    "距離",
    "高度",
    "質量",
    "半徑",
    "cm",
    "mm",
    "m/s",
    "kg",
    "N",
    "V",
    "A",
    "W",
    "Hz",
    "nm",
    "kPa",
    "℃",
]

GENERIC_MARKERS = [
    "先把題目情境轉成物理模型",
    "此題屬多選題",
    "最後選出唯一相符者",
]


def is_calc_like(question_text: str) -> bool:
    return any(keyword in question_text for keyword in CALC_KEYWORDS) or any(
        char.isdigit() for char in question_text
    )


def is_generic_solution(solution: str) -> bool:
    return any(marker in solution for marker in GENERIC_MARKERS)


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    report = {
        "summary": {
            "totalQuestions": 0,
            "calcLikeQuestions": 0,
            "genericSolutions": 0,
            "calcLikeWithGenericSolution": 0,
        },
        "years": [],
    }

    for analysis in data.get("analysis", []):
        year_report = {
            "year": analysis["year"],
            "totalQuestions": 0,
            "calcLikeQuestions": 0,
            "genericSolutions": 0,
            "calcLikeWithGenericSolution": 0,
            "needsDetailedCalculationSolution": [],
        }
        for question in analysis.get("questions", []):
            text = question.get("questionText", "")
            solution = question.get("solution", "")
            calc_like = is_calc_like(text)
            generic = is_generic_solution(solution)

            report["summary"]["totalQuestions"] += 1
            year_report["totalQuestions"] += 1
            if calc_like:
                report["summary"]["calcLikeQuestions"] += 1
                year_report["calcLikeQuestions"] += 1
            if generic:
                report["summary"]["genericSolutions"] += 1
                year_report["genericSolutions"] += 1
            if calc_like and generic:
                report["summary"]["calcLikeWithGenericSolution"] += 1
                year_report["calcLikeWithGenericSolution"] += 1
                year_report["needsDetailedCalculationSolution"].append(
                    {
                        "no": question["no"],
                        "unit": question.get("unit", ""),
                        "answer": question.get("answer", ""),
                        "questionTextPreview": text[:160],
                    }
                )

        report["years"].append(year_report)

    REPORT_PATH.write_text(
        "\ufeff" + json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
