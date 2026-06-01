import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"

GLOBAL_REPLACEMENTS = [
    ("ρv2", "ρv²"),
    ("μm1g", "μm_1g"),
    ("3m1", "3m_1"),
    ("2μm1g", "2μm_1g"),
    ("En=-13.606/n2", "E_n=-13.606/n²"),
    ("10×10⁻⁶×10⁰⁰", "10×10⁻⁶×10³"),
    ("10⁰×10⁻⁶", "100×10⁻⁶"),
    ("μv2", "μv²"),
    ("×302", "×30²"),
    ("v²=202+2", "v²=20²+2"),
    ("∝n2", "∝n²"),
    ("n1sinθ1=n2sinθ2", "n_1sinθ_1=n_2sinθ_2"),
]

TARGETED_REPLACEMENTS = {
    (109, 8): [
        ("GMm/R_2=mv²/R,得 v∝R−1/2,所以 N_1=-1/2。動能 K=1/2mv²∝R−1,所以 N_2=-1。角動量 L=mRv∝R×R−1/2=R_1/2,所以 N_3=1/2。大小關係為 N3>N1>N_2",
         "GMm/R²=mv²/R,得 v∝1/√R,所以 N_1=-1/2。動能 K=1/2mv²∝1/R,所以 N_2=-1。角動量 L=mRv∝√R,所以 N_3=1/2。大小關係為 N_3>N_1>N_2"),
    ],
    (107, 17): [
        ("mvtop2/r", "mv_top²/r"),
        ("vtop2", "v_top²"),
        ("vbottom2", "v_bottom²"),
    ],
    (105, 16): [
        ("n2>n1", "n_2>n_1"),
        ("v²=c/n2 小於 v_1=c/n1", "v_2=c/n_2 小於 v_1=c/n_1"),
        ("λ_2<λ_1", "λ_2<λ_1"),
    ],
    (105, 11): [
        ("μv2", "μv²"),
        ("×302", "×30²"),
    ],
}


def apply_replacements(value, replacements):
    if not isinstance(value, str):
        return value
    out = value
    for old, new in GLOBAL_REPLACEMENTS:
        out = out.replace(old, new)
    for old, new in replacements:
        out = out.replace(old, new)
    return out


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    changed = 0
    for analysis in data.get("analysis", []):
        year = analysis.get("year")
        for question in analysis.get("questions", []):
            replacements = TARGETED_REPLACEMENTS.get((year, question.get("no")), [])
            for key in ["questionText", "solution"]:
                before = question.get(key)
                after = apply_replacements(before, replacements)
                if after != before:
                    question[key] = after
                    changed += 1
    DATA_PATH.write_text(
        "\ufeff" + json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"fixed formula semantics in {changed} fields")


if __name__ == "__main__":
    main()
