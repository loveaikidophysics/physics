import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"
REPORT_PATH = ROOT / "data" / "symbol-format-audit.json"


SUBSCRIPT_TOKENS = [
    "Ktotal", "Kmax", "Kmin", "Etotal", "Eloss", "E_loss", "ΔUg", "Ug", "Uf", "WF", "Wf",
    "vrms", "vmax", "vmin",
    "Vin", "Vout", "Vstop", "Vp", "Vs", "V0", "Np", "Ns", "nᵢ", "nf", "ni",
    "rG", "rS", "rf", "r甲", "r乙", "r丙", "ωG", "ωS", "ω0",
    "m甲", "m乙", "m丙", "mp", "v甲0", "v乙0", "v丙0", "v甲", "v乙", "v丙", "P甲", "P乙", "P丙",
    "Q甲", "Q乙", "Q丙", "T甲", "T乙", "T丙", "θ1", "θ2", "θ3", "μs", "μk",
    "Tf", "TL", "Ts", "Tp", "T0", "μ0", "vf", "f甲", "f乙", "f丙",
    "v0", "v1", "v2", "v3", "u0", "u1", "u2", "u3", "a0", "a1", "a2",
    "r0", "r1", "r2", "r3", "R1", "R2", "R3", "T1", "T2", "T3",
    "P0", "P1", "P2", "P3", "P4", "Q1", "Q2", "Q3", "V1", "V2", "V3",
    "Imax", "Is", "Iu", "I0", "I1", "I2", "I3", "E0", "E1", "E2", "E3", "K1", "K2", "K3",
    "m0", "m1", "m2", "m3", "n0", "n1", "n2", "n3", "n甲", "n乙", "n丙", "f0", "f1", "f2", "fk",
    "Fd", "Fs", "Fb", "tP", "tS", "Req",
]

SUBSCRIPT_PATTERN = re.compile(
    r"(^|[^A-Za-z0-9_])"
    r"("
    r"(?:[vuarRTPQVIEKmnf]|ω|θ|μ)(?:[0-9]{1,2}|max|rms|甲|乙|丙|[GSskfp])"
    r"|(?:V|N)(?:p|s)"
    r"|(?:T)(?:f|L)"
    r"|(?:Δ?U)(?:g|f)|W(?:F|f)|F(?:d|s|b)|t(?:P|S)|Req"
    r"|E_loss|Ktotal|Etotal|Eloss"
    r")"
    r"(?![A-Za-z0-9_])"
)
FALSE_POSITIVE_TOKENS = {"min", "ms", "ns", "PS"}


def replace_token(text, token):
    right_boundary = r"(?![0-9_])" if re.search(r"\d$", token) else r"(?![A-Za-z0-9_])"
    pattern = re.compile(r"(^|[^A-Za-z0-9_])" + re.escape(token) + right_boundary)
    return pattern.sub(r"\1<subscripted>", text)


def simulate_render(text):
    rendered = str(text or "")
    rendered = re.sub(r"_([0-9]+|[A-Za-z\u0370-\u03ff]+)", "<subscripted>", rendered)
    for token in sorted(SUBSCRIPT_TOKENS, key=len, reverse=True):
        rendered = replace_token(rendered, token)
    return rendered


def audit_solution(solution):
    rendered = simulate_render(solution)
    matches = []
    for match in SUBSCRIPT_PATTERN.finditer(rendered):
        token = match.group(2)
        if token in FALSE_POSITIVE_TOKENS:
            continue
        if token not in matches:
            matches.append(token)
    return matches


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    report = {"summary": {}, "years": []}
    totals = {"questions": 0, "ambiguousSubscripts": 0, "flaggedQuestions": 0}

    for analysis in data.get("analysis", []):
        year_report = {"year": analysis["year"], "flaggedQuestions": 0, "items": []}
        for question in analysis.get("questions", []):
            totals["questions"] += 1
            matches = audit_solution(question.get("solution", ""))
            if matches:
                totals["flaggedQuestions"] += 1
                totals["ambiguousSubscripts"] += len(matches)
                year_report["flaggedQuestions"] += 1
                year_report["items"].append(
                    {
                        "no": question.get("no"),
                        "unit": question.get("unit", ""),
                        "tokens": matches,
                        "solutionPreview": re.sub(r"\s+", " ", question.get("solution", ""))[:180],
                    }
                )
        report["years"].append(year_report)

    report["summary"] = totals
    REPORT_PATH.write_text(
        "\ufeff" + json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
