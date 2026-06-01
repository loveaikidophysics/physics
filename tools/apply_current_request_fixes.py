import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"

TYPE_ORDER = [
    "實驗與素養探究",
    "圖表判讀",
    "實驗設計與誤差",
    "生活情境建模",
    "跨章節概念整合",
    "文字敘述轉物理量",
]

TYPE_PRIORITY = [
    "實驗設計與誤差",
    "實驗與素養探究",
    "生活情境建模",
    "圖表判讀",
    "跨章節概念整合",
    "文字敘述轉物理量",
]

ALIASES = {
    "原理推演": "跨章節概念整合",
    "概念判斷": "文字敘述轉物理量",
    "數值計算": "文字敘述轉物理量",
    "實驗與探究": "實驗與素養探究",
    "跨章節整合": "跨章節概念整合",
}

TARGETED_REPLACEMENTS = {
    (114, 14): [
        ("2m1/(m_1+m_2)v", "2m_1/(m_1+m_2)v"),
        ("v_1-v²=-(v_1'-v_2')", "v_1-v_2=-(v_1'-v_2')"),
        ("因 v²=0", "因 v_2=0"),
    ],
    (114, 19): [("4.02/(2μ_k×10)", "4.0²/(2μ_k×10)")],
    (113, 16): [
        ("動能與 v_2 成正比", "動能與 v² 成正比"),
        ("|10⁻²⁰|/0.5", "|10-20|/0.5"),
        ("1/2×2000×202", "1/2×2000×20²"),
        ("1/2×10⁰⁰×202", "1/2×1000×20²"),
    ],
    (113, 17): [("P_loss=I²R=202×3", "P_loss=I²R=20²×3")],
    (112, 23): [
        ("2×10⁰", "2×100"),
        ("1.5×10⁰ = 150", "1.5×10² = 150"),
        ("1/2×10⁰×1.5 = 75", "1/2×100×1.5 = 75"),
    ],
    (110, 9): [
        ("μv2", "μv²"),
        ("×302", "×30²"),
        ("m1m2", "m_1m_2"),
    ],
    (110, 21): [
        ("n2>n1", "n_2>n_1"),
        ("v²=c/n2 小於 v_1=c/n1", "v_2=c/n_2 小於 v_1=c/n_1"),
        ("λ_2<λ_1", "λ_2<λ_1"),
    ],
    (108, 9): [
        ("u²=3 m/s", "u_2=3 m/s"),
        ("-5m1+24-3m1", "-5m_1+24-3m_1"),
    ],
    (106, 3): [
        ("GM/R_2", "GM/R²"),
    ],
    (105, 6): [
        ("GMm/R_2=mv²/R", "GMm/R²=mv²/R"),
        ("R_1/2", "R^(1/2)"),
        ("N3>N1>N_2", "N_3>N_1>N_2"),
    ],
    (104, 12): [
        ("n1 進入較大折射率 n2", "n_1 進入較大折射率 n_2"),
    ],
    (102, 20): [
        ("n1sinθ1=n2sinθ2", "n_1sinθ_1=n_2sinθ_2"),
        ("n1、n2", "n_1、n_2"),
        ("n1>n>n2", "n_1>n>n_2"),
    ],
}


def clean_solution(text):
    if not isinstance(text, str):
        return text
    out = text
    # Remove redundant or previously auto-appended explanation blocks. Keep the
    # primary derivation before the marker to make the solution concise.
    out = re.sub(r"\s*完整(?:推導|計算|化簡)補充[:：].*$", "", out, flags=re.S)
    out = out.replace("官方答案為", "答案 ")
    out = out.replace("。答案 ", "；答案 ")
    out = re.sub(r"\s{2,}", " ", out)
    out = re.sub(r" ?\n ?", "\n", out)
    return out.strip()


def normalize_types(types):
    normalized = []
    for item in types or []:
        normalized.append(ALIASES.get(item, item))
    return normalized


def primary_type(question):
    types = normalize_types(question.get("literacyTypes", []))
    text = (question.get("questionText", "") + "\n" + question.get("solution", "")).lower()
    if "非選" in str(question.get("answer", "")):
        if any(word in text for word in ["實驗", "量測", "檢流計", "作圖", "光路", "光徑", "電路圖"]):
            return "實驗設計與誤差"
        if any(word in text for word in ["受力圖", "能量", "推導", "力矩", "角動量", "感應"]):
            return "跨章節概念整合"
    for candidate in TYPE_PRIORITY:
        if candidate in types:
            return candidate
    if any(word in text for word in ["圖", "表", "曲線", "斜率", "讀取"]):
        return "圖表判讀"
    return "文字敘述轉物理量"


def apply_targeted_fixes(question, year):
    changed = 0
    replacements = TARGETED_REPLACEMENTS.get((year, question.get("no")), [])
    for key in ["questionText", "solution"]:
        value = question.get(key)
        if not isinstance(value, str):
            continue
        before = value
        for old, new in replacements:
            value = value.replace(old, new)
        value = clean_solution(value) if key == "solution" else value
        if value != before:
            question[key] = value
            changed += 1
    return changed


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    changed = 0
    for analysis in data.get("analysis", []):
        year = analysis.get("year")
        counter = Counter()
        for question in analysis.get("questions", []):
            changed += apply_targeted_fixes(question, year)
            ptype = primary_type(question)
            if question.get("literacyTypes") != [ptype]:
                question["literacyTypes"] = [ptype]
                changed += 1
            question["primaryLiteracyType"] = ptype
            counter[ptype] += 1
        analysis["literacyTypes"] = [
            {"name": name, "count": counter[name]}
            for name in TYPE_ORDER
            if counter[name]
        ]
    DATA_PATH.write_text(
        "\ufeff" + json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"applied current request fixes to {changed} fields")


if __name__ == "__main__":
    main()
