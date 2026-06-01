import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"

SUP = str.maketrans("0123456789+-=()n", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ")


def pow_to_unicode(match):
    return match.group(1).translate(SUP)


GLOBAL_REPLACEMENTS = [
    ("T^2/T1", "T₂/T₁"),
    ("T2/T1", "T₂/T₁"),
    ("P_2=P_1(V1/V2)", "P₂=P₁(V₁/V₂)"),
    ("P_2", "P₂"),
    ("P_1", "P₁"),
    ("V1", "V₁"),
    ("V2", "V₂"),
    ("T1", "T₁"),
    ("T2", "T₂"),
    ("I1", "I₁"),
    ("I2", "I₂"),
    ("ri=", "r_i="),
    ("rf=", "r_f="),
    ("A=πr2", "A=πr²"),
    ("λ2", "λ²"),
    ("mrω2", "mrω²"),
    ("εM2", "ε_M²"),
    ("ΦM", "Φ_M"),
    ("εM", "ε_M"),
    ("PM", "P_M"),
    ("Ploss", "P_loss"),
    ("vmax²", "v_max²"),
    ("vmin²", "v_min²"),
    ("vrms", "v_rms"),
    ("ve=", "v_e="),
    ("rG", "r_G"),
    ("rS", "r_S"),
    ("ωG", "ω_G"),
    ("ωS", "ω_S"),
]

TARGETED_REPLACEMENTS = {
    (113, 17): [
        ("P_loss=I^2R=202×3", "P_loss=I²R=20²×3"),
        ("0.202×3", "0.20²×3"),
        ("1002=10000:1", "100²=10000:1"),
    ],
    (113, 18): [
        ("A=πr2", "A=πr²"),
        ("ri=2.1", "r_i=2.1"),
        ("rf=1.9", "r_f=1.9"),
    ],
    (112, 26): [
        ("[Bω(r_o^2-r_i^2)]2/R", "[Bω(r_o²-r_i²)]²/R"),
        ("P_M=ε_M2/R", "P_M=ε_M²/R"),
    ],
    (108, 11): [
        ("(rS/rG)3ᐟ2", "(r_S/r_G)^(3/2)"),
        ("(42400/26600)3ᐟ2", "(42400/26600)^(3/2)"),
        ("1.593ᐟ2", "1.59^(3/2)"),
    ],
}


def normalize_text(text, year=None, no=None):
    if not isinstance(text, str):
        return text
    out = text
    for old, new in TARGETED_REPLACEMENTS.get((year, no), []):
        out = out.replace(old, new)
    for old, new in GLOBAL_REPLACEMENTS:
        out = out.replace(old, new)
    out = re.sub(r"\^\{([^}]+)\}", lambda m: m.group(1).translate(SUP), out)
    out = re.sub(r"\^\(([^)]+)\)", lambda m: m.group(1).translate(SUP), out)
    out = re.sub(r"\^([+\-=]?\d+)", pow_to_unicode, out)
    return out


def normalize_question(question, year):
    changed = 0
    for key in ["questionText", "solution"]:
        before = question.get(key)
        after = normalize_text(before, year, question.get("no"))
        if after != before:
            question[key] = after
            changed += 1
    for diagram in question.get("solutionDiagrams", []) or []:
        for key in ["title", "text", "svg"]:
            before = diagram.get(key)
            after = normalize_text(before, year, question.get("no"))
            if after != before:
                diagram[key] = after
                changed += 1
    return changed


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    changed = 0
    for analysis in data.get("analysis", []):
        year = analysis.get("year")
        for question in analysis.get("questions", []):
            changed += normalize_question(question, year)
    DATA_PATH.write_text(
        "\ufeff" + json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"normalized remaining formula notation in {changed} fields")


if __name__ == "__main__":
    main()
