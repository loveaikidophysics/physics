import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"


Q22_SVG = """<svg viewBox="0 0 680 260" role="img" aria-label="插針法折射光路" xmlns="http://www.w3.org/2000/svg">
 <defs><marker id="arr10822" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#111827"/></marker></defs>
 <rect x="250" y="45" width="180" height="150" fill="#e0f2fe" stroke="#0369a1" stroke-width="3"/>
 <line x1="85" y1="190" x2="250" y2="120" stroke="#111827" stroke-width="3" marker-end="url(#arr10822)"/>
 <line x1="250" y1="120" x2="430" y2="110" stroke="#111827" stroke-width="3" marker-end="url(#arr10822)"/>
 <line x1="430" y1="110" x2="595" y2="40" stroke="#111827" stroke-width="3" marker-end="url(#arr10822)"/>
 <line x1="250" y1="35" x2="250" y2="205" stroke="#64748b" stroke-dasharray="7 6" stroke-width="2"/>
 <line x1="430" y1="35" x2="430" y2="205" stroke="#64748b" stroke-dasharray="7 6" stroke-width="2"/>
 <path d="M250 120 A42 42 0 0 1 289 118" fill="none" stroke="#0f766e" stroke-width="2"/>
 <path d="M250 120 A70 70 0 0 0 314 91" fill="none" stroke="#f59e0b" stroke-width="2"/>
 <text x="292" y="139" font-size="16" fill="#0f766e">折射角較小</text>
 <text x="280" y="78" font-size="16" fill="#92400e">入射角</text>
 <circle cx="130" cy="171" r="6" fill="#dc2626"/><circle cx="190" cy="145" r="6" fill="#dc2626"/>
 <circle cx="490" cy="85" r="6" fill="#dc2626"/><circle cx="550" cy="59" r="6" fill="#dc2626"/>
 <text x="340" y="226" text-anchor="middle" font-size="18">光由空氣進入較高折射率介質時，折射線往法線偏折；折射角大於 0° 且小於入射角</text>
</svg>"""


REPLACEMENTS = [
    ("4π2", "4π²"),
    ("2π2", "2π²"),
    ("1/2gt2", "1/2gt²"),
    ("gt2", "gt²"),
    ("mv2", "mv²"),
    ("u2", "u²"),
    ("vmax2", "vmax²"),
    ("A2", "A²"),
    ("x2", "x²"),
    ("Kmax", "K_max"),
    ("Kmin", "K_min"),
    ("Vstop", "V_stop"),
    ("λmax", "λ_max"),
    ("λmin", "λ_min"),
    ("μk", "μ_k"),
    ("μs", "μ_s"),
    ("μβ", "μ_β"),
    ("fβ", "f_β"),
    ("fk", "f_k"),
    ("RMP", "R_MP"),
    ("RPN", "R_PN"),
    ("Vₙ", "V_N"),
]


REGEX_REPLACEMENTS = [
    (re.compile(r"\bri2\b"), "r_i^2"),
    (re.compile(r"\brf2\b"), "r_f^2"),
    (re.compile(r"\bro2\b"), "r_o^2"),
    (re.compile(r"\bnf2\b"), "n_f^2"),
    (re.compile(r"\bni2\b"), "n_i^2"),
    (re.compile(r"\bp2\b"), "p^2"),
    (re.compile(r"\bh2\b"), "h^2"),
    (re.compile(r"\br3\b"), "r^3"),
    (re.compile(r"\bT2\b(?=[)\].,;/]|$)"), "T^2"),
    (re.compile(r"\bT2\)"), "T^2)"),
    (re.compile(r"\bN2\b(?=[=,.;]|$)"), "N_2"),
    (re.compile(r"\bN3\b(?=[=,.;]|$)"), "N_3"),
    (re.compile(r"\bN1\b(?=[=,.;]|$)"), "N_1"),
    (re.compile(r"\bF12\b"), "F_12"),
    (re.compile(r"\bF23\b"), "F_23"),
    (re.compile(r"\bI1I2\b"), "I_1I_2"),
    (re.compile(r"\bI2R\b"), "I^2R"),
    (re.compile(r"\bB02\b"), "B_0^2"),
    (re.compile(r"\bP0\b"), "P_0"),
    (re.compile(r"\bI0\b"), "I_0"),
    (re.compile(r"\bV0\b"), "V_0"),
    (re.compile(r"\bf0\b"), "f_0"),
    (re.compile(r"\bf1\b"), "f_1"),
    (re.compile(r"\bf2\b"), "f_2"),
    (re.compile(r"\bλ1\b"), "λ_1"),
    (re.compile(r"\bλ2\b"), "λ_2"),
    (re.compile(r"\bθ1\b"), "θ_1"),
    (re.compile(r"\bθ2\b"), "θ_2"),
    (re.compile(r"\bτ1\b"), "τ_1"),
    (re.compile(r"\bτ2\b"), "τ_2"),
    (re.compile(r"\bΔP3\b"), "ΔP_3"),
    (re.compile(r"\bΔP4\b"), "ΔP_4"),
    (re.compile(r"\bP3\b"), "P_3"),
    (re.compile(r"\bP4\b"), "P_4"),
    (re.compile(r"\bP1\b"), "P_1"),
    (re.compile(r"\bP2\b"), "P_2"),
    (re.compile(r"\bv0\b"), "v_0"),
    (re.compile(r"\bv1\b"), "v_1"),
    (re.compile(r"\bv2\b"), "v_2"),
    (re.compile(r"\bm1\b"), "m_1"),
    (re.compile(r"\bm2\b"), "m_2"),
    (re.compile(r"\br1\b"), "r_1"),
    (re.compile(r"\br2\b"), "r_2"),
    (re.compile(r"\bR1\b"), "R_1"),
    (re.compile(r"\bR2\b"), "R_2"),
]


def normalize(text):
    if not text:
        return text
    out = text
    out = out.replace("4.02/(2μ_k×10)", "4.0²/(2μ_k×10)")
    out = out.replace("5.02", "5.0²")
    for old, new in REPLACEMENTS:
        out = out.replace(old, new)
    for pattern, replacement in REGEX_REPLACEMENTS:
        out = pattern.sub(replacement, out)
    return out


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    changed = 0

    for analysis in data.get("analysis", []):
        year = int(analysis["year"])
        for question in analysis.get("questions", []):
            no = int(question["no"])
            before = question.get("solution", "")
            question["solution"] = normalize(before)
            if question["solution"] != before:
                changed += 1
            qtext = question.get("questionText")
            if qtext:
                question["questionText"] = normalize(qtext)

            if year == 108 and no == 22:
                question["solution"] = (
                    "答案 BCE。插針法需以同側兩針決定光線方向，兩針間距愈大，方向判定誤差通常愈小；"
                    "A 說愈近愈準，錯。光由空氣進入壓克力等較高折射率介質時，折射線會往法線偏折，"
                    "折射角仍大於 0°，且小於入射角；離開平行面回到空氣時再偏離法線，出射線與入射線平行。"
                    "在外側各插 2 針可重建入射線與出射線，進而求折射率，B 對。即使兩面不完全平行，"
                    "只要能判定入射、折射路徑與法線，仍可由斯涅耳定律 n₁sinθ₁=n₂sinθ₂ 求折射率，C 對。"
                    "兩面是否平行可由出射線是否與入射線平行等結果判斷，D 錯。使用相距 10 cm 的平行面時，"
                    "光路較長、出射位移較明顯，角度相對誤差較小，比 2 cm 面較精準，E 對。"
                )
                question["solutionDiagrams"] = [
                    {
                        "title": "插針法重建入射線、折射線與出射線",
                        "svg": Q22_SVG,
                    }
                ]
                changed += 1

    DATA_PATH.write_text("\ufeff" + json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"normalized notation and fixed q22 diagram in {changed} questions")


if __name__ == "__main__":
    main()
