import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"
REPORT_PATH = ROOT / "data" / "mathjax-formula-audit.json"


MATHJAX_RE = re.compile(r"\\\(.+?\\\)|\\\[.+?\\\]", re.S)

SUP_MAP = str.maketrans({
    "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
    "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
    "⁺": "+", "⁻": "-",
})
SUB_MAP = str.maketrans({
    "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
    "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
    "₊": "+", "₋": "-",
})

GREEK = {
    "α": r"\alpha", "β": r"\beta", "γ": r"\gamma", "θ": r"\theta",
    "λ": r"\lambda", "μ": r"\mu", "ρ": r"\rho", "π": r"\pi",
    "φ": r"\phi", "ω": r"\omega", "τ": r"\tau", "ε": r"\varepsilon",
    "Φ": r"\Phi", "Δ": r"\Delta", "Ω": r"\Omega",
}

FORMULA_SUFFIX_CHARS = set("甲乙丙丁前後內外底頂矽鍺水")
FORMULA_WORD_SUFFIXES = ("導線", "地磁", "光子")
FORMULA_ALLOWED_EXTRA = set(
    " \t"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    "0123456789"
    "αβγθλμρπφωτεΦΔΩ"
    "_+-−±=*/×÷∝≈≤≥<>√()[]{}.,:|^'′°⟨⟩"
    "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻₀₁₂₃₄₅₆₇₈₉₊₋"
)
FORMULA_ALLOWED_EXTRA.update(FORMULA_SUFFIX_CHARS)
for word in FORMULA_WORD_SUFFIXES:
    FORMULA_ALLOWED_EXTRA.update(word)

FORMULA_SIGNALS = set("=∝≈≤≥<>√^×÷±")
FORMULA_SIGNALS.update("⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻₀₁₂₃₄₅₆₇₈₉₊₋")


TRADITIONAL_TWEEZER_SVG = r'''<svg viewBox="0 0 720 380" role="img" aria-label="傳統鑷子夾球受力圖" xmlns="http://www.w3.org/2000/svg">
 <defs>
   <marker id="arr10826a3" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#111827"/></marker>
   <style>
     .label{font:22px sans-serif;paint-order:stroke;stroke:#fff;stroke-width:7px;stroke-linejoin:round}
     .small{font:20px sans-serif;paint-order:stroke;stroke:#fff;stroke-width:7px;stroke-linejoin:round}
   </style>
 </defs>
 <circle cx="360" cy="178" r="76" fill="#fff" stroke="#111827" stroke-width="3"/>
 <line x1="250" y1="50" x2="306" y2="132" stroke="#111827" stroke-width="6" stroke-linecap="round"/>
 <line x1="470" y1="50" x2="414" y2="132" stroke="#111827" stroke-width="6" stroke-linecap="round"/>
 <line x1="360" y1="72" x2="360" y2="304" stroke="#94a3b8" stroke-width="2" stroke-dasharray="7 7"/>
 <line x1="306" y1="132" x2="345" y2="164" stroke="#0f766e" stroke-width="4" marker-end="url(#arr10826a3)"/>
 <line x1="414" y1="132" x2="375" y2="164" stroke="#0f766e" stroke-width="4" marker-end="url(#arr10826a3)"/>
 <text class="label" x="323" y="158">F</text>
 <text class="label" x="386" y="158">F</text>
 <line x1="306" y1="132" x2="274" y2="86" stroke="#b45309" stroke-width="4" marker-end="url(#arr10826a3)"/>
 <line x1="414" y1="132" x2="446" y2="86" stroke="#b45309" stroke-width="4" marker-end="url(#arr10826a3)"/>
 <text class="label" x="222" y="92">μF</text>
 <text class="label" x="458" y="92">μF</text>
 <line x1="360" y1="178" x2="360" y2="305" stroke="#dc2626" stroke-width="4" marker-end="url(#arr10826a3)"/>
 <text class="label" x="377" y="300">mg</text>
 <path d="M360 100 A58 58 0 0 1 397 116" fill="none" stroke="#111827" stroke-width="2"/>
 <text class="small" x="398" y="116">θ</text>
 <text x="360" y="350" text-anchor="middle" font-size="21">鉛直平衡：2μF cosθ = 2F sinθ + mg</text>
</svg>'''


OPTICAL_TWEEZER_SVG = r'''<svg viewBox="0 0 720 380" role="img" aria-label="光學鑷子光路與動量變化示意圖" xmlns="http://www.w3.org/2000/svg">
 <defs>
   <marker id="arr10826b3" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#111827"/></marker>
   <style>
     .label{font:21px sans-serif;paint-order:stroke;stroke:#fff;stroke-width:7px;stroke-linejoin:round}
   </style>
 </defs>
 <circle cx="360" cy="184" r="82" fill="#fff" stroke="#111827" stroke-width="3"/>
 <text class="label" x="360" y="191" text-anchor="middle">O</text>
 <text class="label" x="360" y="62" text-anchor="middle">C</text>
 <line x1="360" y1="70" x2="292" y2="250" stroke="#64748b" stroke-width="2" stroke-dasharray="8 7"/>
 <line x1="360" y1="70" x2="428" y2="250" stroke="#64748b" stroke-width="2" stroke-dasharray="8 7"/>
 <line x1="118" y1="318" x2="292" y2="250" stroke="#0f766e" stroke-width="4" marker-end="url(#arr10826b3)"/>
 <line x1="602" y1="318" x2="428" y2="250" stroke="#0f766e" stroke-width="4" marker-end="url(#arr10826b3)"/>
 <line x1="292" y1="250" x2="318" y2="110" stroke="#0f766e" stroke-width="4" marker-end="url(#arr10826b3)"/>
 <line x1="428" y1="250" x2="402" y2="110" stroke="#0f766e" stroke-width="4" marker-end="url(#arr10826b3)"/>
 <line x1="318" y1="110" x2="205" y2="76" stroke="#0f766e" stroke-width="4" marker-end="url(#arr10826b3)"/>
 <line x1="402" y1="110" x2="515" y2="76" stroke="#0f766e" stroke-width="4" marker-end="url(#arr10826b3)"/>
 <text class="label" x="132" y="306">P₃</text>
 <text class="label" x="565" y="306">P₄</text>
 <text class="label" x="196" y="66">P₃′</text>
 <text class="label" x="492" y="66">P₄′</text>
 <line x1="210" y1="128" x2="210" y2="176" stroke="#2563eb" stroke-width="4" marker-end="url(#arr10826b3)"/>
 <line x1="510" y1="128" x2="510" y2="176" stroke="#2563eb" stroke-width="4" marker-end="url(#arr10826b3)"/>
 <text class="label" x="154" y="123">ΔP₃</text>
 <text class="label" x="523" y="123">ΔP₄</text>
 <line x1="360" y1="184" x2="360" y2="92" stroke="#dc2626" stroke-width="5" marker-end="url(#arr10826b3)"/>
 <text class="label" x="376" y="112">F</text>
 <text x="360" y="350" text-anchor="middle" font-size="21">光子總動量變化向下；微粒受力向上，朝焦點 C</text>
</svg>'''


CURRENT_BALANCE_SVG = r'''<svg viewBox="0 0 720 330" role="img" aria-label="電流天平示意圖" xmlns="http://www.w3.org/2000/svg">
 <defs>
   <marker id="arr10125b" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#111827"/></marker>
   <style>
     .label{font:22px sans-serif;paint-order:stroke;stroke:#fff;stroke-width:7px;stroke-linejoin:round}
     .small{font:20px sans-serif;paint-order:stroke;stroke:#fff;stroke-width:7px;stroke-linejoin:round}
   </style>
 </defs>
 <rect x="110" y="76" width="500" height="150" fill="#eff6ff" stroke="#2563eb" stroke-width="3"/>
 <text class="label" x="360" y="58" text-anchor="middle">螺線管內近似均勻磁場 B</text>
 <g font-size="24">
   <text x="165" y="112">×</text><text x="235" y="112">×</text><text x="305" y="112">×</text><text x="375" y="112">×</text><text x="445" y="112">×</text><text x="515" y="112">×</text>
   <text x="165" y="204">×</text><text x="235" y="204">×</text><text x="305" y="204">×</text><text x="375" y="204">×</text><text x="445" y="204">×</text><text x="515" y="204">×</text>
 </g>
 <path d="M230 238 V160 H490 V238" fill="none" stroke="#111827" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
 <line x1="250" y1="160" x2="470" y2="160" stroke="#0f766e" stroke-width="6" marker-end="url(#arr10125b)"/>
 <text class="label" x="286" y="146">I₁</text>
 <line x1="360" y1="160" x2="360" y2="106" stroke="#dc2626" stroke-width="4" marker-end="url(#arr10125b)"/>
 <text class="label" x="379" y="124">F</text>
 <line x1="168" y1="132" x2="168" y2="190" stroke="#b45309" stroke-width="4" marker-end="url(#arr10125b)"/>
 <text class="label" x="184" y="177">w</text>
 <line x1="250" y1="255" x2="470" y2="255" stroke="#64748b" stroke-width="2" marker-end="url(#arr10125b)" marker-start="url(#arr10125b)"/>
 <text class="label" x="360" y="282" text-anchor="middle">ℓ_b</text>
 <text x="360" y="314" text-anchor="middle" font-size="21">等臂平衡：F = I₁ℓ_bB = w</text>
</svg>'''


def get_question(data, year, no):
    analysis = next(item for item in data["analysis"] if item["year"] == year)
    return next(item for item in analysis["questions"] if item["no"] == no)


def is_formula_char(ch):
    return ch in FORMULA_ALLOWED_EXTRA


def has_formula_signal(text):
    stripped = text.strip()
    if len(stripped) < 2:
        return False
    if not re.search(r"[A-Za-z0-9αβγθλμρπφωτεΦΔΩ]", stripped):
        return False
    if any(ch in stripped for ch in FORMULA_SIGNALS):
        return True
    if re.search(r"[A-Za-zαβγθλμρπφωτεΦΔΩ]_[A-Za-z0-9]+", stripped):
        return True
    if re.search(r"[A-Za-zαβγθλμρπφωτεΦΔΩ][₀₁₂₃₄₅₆₇₈₉]", stripped):
        return True
    if re.search(r"\b(?:sin|cos|tan)\s*[αβγθλμρπφωτεΦΔΩ]", stripped):
        return True
    return False


def iter_formula_runs(text):
    start = None
    for index, ch in enumerate(text):
        if is_formula_char(ch):
            if start is None:
                start = index
        else:
            if start is not None:
                run = text[start:index]
                if has_formula_signal(run):
                    yield start, index, run
                start = None
    if start is not None:
        run = text[start:]
        if has_formula_signal(run):
            yield start, len(text), run


def convert_superscripts(expr):
    sup_chars = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻"
    sub_chars = "₀₁₂₃₄₅₆₇₈₉₊₋"
    expr = re.sub(
        r"(\\[A-Za-z]+|[A-Za-z0-9)\]}])([" + sup_chars + r"]+)",
        lambda m: f"{m.group(1)}^{{{m.group(2).translate(SUP_MAP)}}}",
        expr,
    )
    expr = re.sub(
        r"(\\[A-Za-z]+|[A-Za-zαβγθλμρπφωτεΦΔΩ])([" + sub_chars + r"]+)",
        lambda m: f"{m.group(1)}_{{{m.group(2).translate(SUB_MAP)}}}",
        expr,
    )
    return expr


def cjk_suffix_repl(match):
    return f"{match.group(1)}_{{\\text{{{match.group(2)}}}}}"


def normalize_math_expr(expr):
    expr = convert_superscripts(expr)
    expr = expr.replace("\text{", r"\text{").replace(" ext{", r"\text{").replace(r"\ ext{", r"\text{")
    expr = expr.replace("≤", r"\le ").replace("≥", r"\ge ")
    expr = expr.replace("−", "-").replace("×", r"\times ")
    expr = re.sub(r"√\(([^()]+)\)", r"\\sqrt{\1}", expr)
    expr = re.sub(r"√([A-Za-z0-9\\{}_^+\-]+)", r"\\sqrt{\1}", expr)
    expr = re.sub(r"(?<!\\)\b(sin|cos|tan)\s*", lambda m: "\\" + m.group(1) + " ", expr)
    expr = re.sub(r"(?<!\\)(sin|cos|tan)(?=\\theta|θ)", lambda m: "\\" + m.group(1) + " ", expr)
    expr = re.sub(r"\\(sin|cos|tan)_\{([0-9]+)\}(?:\^\{\\circ\}|°)", r"\\\1 \2^{\\circ}", expr)
    expr = re.sub(r"\\(sin|cos|tan)\s*([0-9]+)°", r"\\\1 \2^{\\circ}", expr)
    expr = re.sub(r"\\mu(?=(?:mg|F|N|k|s|cos|sin|tan|[A-Za-z]))", r"\\mu ", expr)
    expr = re.sub(r"\\Delta(?=[A-Za-z])", r"\\Delta ", expr)
    for source, target in GREEK.items():
        expr = expr.replace(source, target)
    expr = re.sub(r"_([A-Za-z0-9]+)", r"_{\1}", expr)
    expr = re.sub(r"(?<!\\mathrm)\{rms\}", lambda _: r"{\mathrm{rms}}", expr)
    expr = expr.replace("{net}", r"{\mathrm{net}}")
    expr = expr.replace("{eq}", r"{\mathrm{eq}}")
    expr = expr.replace("{max}", r"{\max}")
    expr = expr.replace("{min}", r"{\min}")
    expr = expr.replace(r"\lambda_{\maxT}", r"\lambda_{\max}T")
    expr = expr.replace(r"\lambda_{maxT}", r"\lambda_{\max}T")
    expr = expr.replace(r"\theta c", r"\theta_c")
    expr = expr.replace(r"\thetac", r"\theta_c")
    expr = expr.replace(r"\ell_{bB}", r"\ell_b B")
    expr = expr.replace(r"\mu_{kN}", r"\mu_k N")
    expr = expr.replace(r"\mu_{kMg}", r"\mu_k Mg")
    expr = expr.replace(r"\mu_{kmg}", r"\mu_k mg")
    expr = expr.replace(r"\mu_{kg}", r"\mu_k g")
    expr = expr.replace(r"\rhoL", r"\rho L")
    expr = expr.replace(r"\piR", r"\pi R")
    expr = re.sub(r"_\{([a-z])([A-Z])\}", r"_{\1}\2", expr)
    while r"\mathrm{\mathrm{" in expr:
        expr = re.sub(r"\\mathrm\{\\mathrm\{([^{}]+)\}\}", r"\\mathrm{\1}", expr)
    for suffix in FORMULA_WORD_SUFFIXES:
        expr = re.sub(
            rf"(\\[A-Za-z]+|[A-Za-z])({suffix})",
            cjk_suffix_repl,
            expr,
        )
    expr = re.sub(
        r"(\\[A-Za-z]+|[A-Za-z])([甲乙丙丁前後內外底頂矽鍺水])",
        cjk_suffix_repl,
        expr,
    )
    expr = re.sub(r"(\\[A-Za-z]+)([0-9]+)", r"\1_{\2}", expr)
    expr = re.sub(r"(?<![A-Za-z\\])([A-Za-z])([0-9]+)", r"\1_{\2}", expr)
    expr = re.sub(r"\\times_\{([0-9]+)\}", r"\\times \1", expr)
    expr = re.sub(r"\\frac_\{12\}", r"\\frac{1}{2}", expr)
    expr = re.sub(r"\\(sin|cos|tan)_\{([0-9]+)\}\^\{\\circ\}", r"\\\1 \2^{\\circ}", expr)
    expr = re.sub(r"\s+", " ", expr).strip()
    return expr


def latexize(expr):
    expr = expr.strip()
    expr = expr.replace("−", "-").replace("×", r"\times ").replace("·", r"\cdot ")
    expr = convert_superscripts(expr)

    expr = re.sub(r"√\(([^()]+)\)", r"\\sqrt{\1}", expr)
    expr = re.sub(r"√([A-Za-z0-9αβγθλμρπφωτεΦΔΩ_{}]+)", r"\\sqrt{\1}", expr)

    expr = re.sub(r"\b(sin|cos|tan)\s*", lambda m: "\\" + m.group(1) + " ", expr)
    expr = re.sub(r"\\(sin|cos|tan)_\{([0-9]+)\}(?:\^\{\\circ\}|°)", r"\\\1 \2^{\\circ}", expr)
    expr = re.sub(r"\\(sin|cos|tan)\s*([0-9]+)°", r"\\\1 \2^{\\circ}", expr)
    expr = re.sub(r"_([A-Za-z0-9]+)", r"_{\1}", expr)

    token_replacements = {
        "rms": r"\mathrm{rms}",
        "max": r"\max",
        "min": r"\min",
        "net": r"\mathrm{net}",
        "eq": r"\mathrm{eq}",
    }
    for raw, latex in token_replacements.items():
        expr = expr.replace("{" + raw + "}", "{" + latex + "}")

    for suffix in FORMULA_WORD_SUFFIXES:
        expr = re.sub(
            rf"([A-Za-zαβγθλμρπφωτεΦΔΩ])({suffix})",
            cjk_suffix_repl,
            expr,
        )
    expr = re.sub(
        r"([A-Za-zαβγθλμρπφωτεΦΔΩ])([甲乙丙丁前後內外底頂矽鍺水])",
        cjk_suffix_repl,
        expr,
    )
    expr = re.sub(r"([A-Za-zαβγθλμρπφωτεΦΔΩ])([0-9]+)", r"\1_{\2}", expr)

    expr = re.sub(r"\\times_\{([0-9]+)\}", r"\\times \1", expr)
    expr = re.sub(r"\\frac_\{12\}", r"\\frac{1}{2}", expr)
    expr = re.sub(r"\\(sin|cos|tan)_\{([0-9]+)\}\^\{\\circ\}", r"\\\1 \2^{\\circ}", expr)

    for source, target in GREEK.items():
        expr = expr.replace(source, target)

    expr = re.sub(r"\s+", " ", expr).strip()
    return expr


def wrap_formula_run(run):
    leading = run[: len(run) - len(run.lstrip())]
    trailing = run[len(run.rstrip()) :]
    core = run.strip()
    moved = ""
    while core.endswith(".") and not re.search(r"\d\.$", core):
        moved = "." + moved
        core = core[:-1].rstrip()
    if not core:
        return run
    return leading + r"\(" + latexize(core) + r"\)" + moved + trailing


def mathjaxify_segment(segment):
    output = []
    cursor = 0
    for start, end, run in iter_formula_runs(segment):
        output.append(segment[cursor:start])
        output.append(wrap_formula_run(run))
        cursor = end
    output.append(segment[cursor:])
    return "".join(output)


def mathjaxify_text(text):
    parts = MATHJAX_RE.split(text)
    maths = MATHJAX_RE.findall(text)
    output = []
    for index, part in enumerate(parts):
        output.append(mathjaxify_segment(part))
        if index < len(maths):
            math = maths[index]
            if math.startswith(r"\("):
                output.append(r"\(" + normalize_math_expr(math[2:-2]) + r"\)")
            else:
                output.append(r"\[" + normalize_math_expr(math[2:-2]) + r"\]")
    return "".join(output)


def strip_mathjax(text):
    return MATHJAX_RE.sub(" ", text or "")


def audit_mathjax(data):
    report = {"summary": {"questions": 0, "flaggedQuestions": 0, "formulaRuns": 0}, "years": []}
    for analysis in data.get("analysis", []):
        year_report = {"year": analysis.get("year"), "flaggedQuestions": 0, "items": []}
        for question in analysis.get("questions", []):
            report["summary"]["questions"] += 1
            plain = strip_mathjax(question.get("solution", ""))
            runs = [run.strip() for _, _, run in iter_formula_runs(plain) if run.strip()]
            if runs:
                report["summary"]["flaggedQuestions"] += 1
                report["summary"]["formulaRuns"] += len(runs)
                year_report["flaggedQuestions"] += 1
                year_report["items"].append({
                    "no": question.get("no"),
                    "runs": runs[:8],
                })
        report["years"].append(year_report)
    REPORT_PATH.write_text(
        "\ufeff" + json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return report


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))

    for analysis in data.get("analysis", []):
        for question in analysis.get("questions", []):
            question["solution"] = mathjaxify_text(question.get("solution", ""))
            for diagram in question.get("solutionDiagrams", []) or []:
                if "text" in diagram:
                    diagram["text"] = mathjaxify_text(diagram.get("text", ""))

    q108 = get_question(data, 108, 26)
    q108["solution"] = (
        "第 1 小題：兩側鑷子對球的正向力皆為 \\(F\\)，方向指向球心且有向下分量；"
        "靜摩擦力大小為 \\(\\mu F\\)，沿接觸面向上。鉛直平衡為"
        "\\[2\\mu F\\cos\\theta=2F\\sin\\theta+mg.\\]"
        "因此"
        "\\[\\mu=\\tan\\theta+\\frac{mg}{2F\\cos\\theta}"
        "=\\frac{R}{L}+\\frac{mg\\sqrt{L^2+R^2}}{2FL}.\\]"
        "第 2 小題：光進入折射率較大的微粒後改變動量。當焦點 \\(C\\) 在球心 \\(O\\) 上方時，"
        "兩光子的總動量變化 \\(\\Delta\\vec P_{\\rm light}\\) 向下；由衝量關係"
        "\\[\\vec F\\Delta t=-\\Delta\\vec P_{\\rm light}\\]"
        "可知微粒受力向上，朝焦點 \\(C\\) 移動。"
    )
    q108["solutionDiagrams"] = [
        {"title": "傳統鑷子夾球受力圖", "svg": TRADITIONAL_TWEEZER_SVG},
        {"title": "光學鑷子光路與動量變化示意圖", "svg": OPTICAL_TWEEZER_SVG},
    ]

    q101 = get_question(data, 101, 25)
    q101["solution"] = (
        "第 1 小題：U 形導線的有效水平段長為 \\(\\ell_b\\)，通電流 \\(I_1\\)，"
        "置於螺線管產生的磁場 \\(B\\) 中，磁力大小為 \\(F=I_1\\ell_b B\\)。"
        "等臂天平平衡時，磁力矩等於掛勾重力矩，故"
        "\\[I_1\\ell_b B=w.\\]"
        "第 2 小題：固定 \\(I_1\\) 與 \\(\\ell_b\\) 時，\\(w\\propto B\\)。"
        "長螺線管內 \\(B\\propto I_2\\)，所以 \\(w\\) 對 \\(I_2\\) 的圖線應近似通過原點的直線。"
        "第 3 小題：固定 \\(I_2\\)，沿軸向改變導線段位置 \\(x\\)，"
        "每一位置調整 \\(w\\) 或 \\(I_1\\) 至平衡，再由"
        "\\[B(x)=\\frac{w}{I_1\\ell_b}\\]"
        "求出磁場。作 \\(B\\)-\\(x\\) 圖即可看出螺線管中心較均勻、端口附近較小。"
    )
    q101["solutionDiagrams"] = [
        {"title": "電流天平", "svg": CURRENT_BALANCE_SVG}
    ]

    q114_10 = get_question(data, 114, 10)
    q114_10["solution"] = (
        "答案 B。單狹縫繞射暗紋條件為 \\(a\\sin\\theta=m\\lambda\\)。"
        "題目說波長 \\(\\lambda_1\\) 的第二暗紋與波長 \\(\\lambda_2\\) 的第三暗紋重合，"
        "表示兩者 \\(\\theta\\) 相同、狹縫寬 \\(a\\) 相同。因此"
        "\\[2\\lambda_1=3\\lambda_2\\]"
        "故 \\(\\lambda_1:\\lambda_2=3:2\\)，選 B。"
    )

    q100_26 = get_question(data, 100, 26)
    q100_26["solution"] = (
        "本題為含摩擦斜面與彈性碰撞後的上滑運動。第 1 小題：小木塊由斜面上端自靜止下滑距離 \\(L\\)。"
        "沿斜面向下的重力分量為 \\(mg\\sin\\theta\\)，動摩擦力為 \\(\\mu mg\\cos\\theta\\) 且方向向上。"
        "由功-能定理："
        "\\[K_{\\text{底}}=mgL\\sin\\theta-\\mu mgL\\cos\\theta=mgL(\\sin\\theta-\\mu\\cos\\theta).\\]"
        "第 2 小題：與牆面彈性碰撞後，速率大小不變、方向改為沿斜面向上。"
        "此時重力分量與摩擦力都沿斜面向下。若取沿斜面向上為正，則"
        "\\[a=-g(\\sin\\theta+\\mu\\cos\\theta).\\]"
        "第 3 小題：上滑到最遠處時動能變為 0，由能量關係"
        "\\[mg s\\sin\\theta+\\mu mg s\\cos\\theta=mgL(\\sin\\theta-\\mu\\cos\\theta)\\]"
        "得"
        "\\[s=\\frac{L(\\sin\\theta-\\mu\\cos\\theta)}{\\sin\\theta+\\mu\\cos\\theta}.\\]"
        "若 \\(\\sin\\theta\\le\\mu\\cos\\theta\\)，木塊在下滑階段即無法由靜止滑到底。"
    )

    q114_20 = get_question(data, 114, 20)
    q114_20["solution"] = (
        "答案：非選擇題。車輪未鎖死且輪胎不在地面滑動時，地面接觸點為靜摩擦；"
        "真正使車的動能減少的是煞車片與輪胎表面間的摩擦。設煞車片對輪胎的總正向力為 \\(N_\\beta\\)，"
        "煞車片與輪胎間摩擦係數為 \\(\\mu_\\beta\\)，則煞車摩擦力為"
        "\\[f_\\beta=\\mu_\\beta N_\\beta.\\]"
        "由功-能定理"
        "\\[f_\\beta s=\\frac12 Mv_0^2\\]"
        "可得"
        "\\[s=\\frac{Mv_0^2}{2\\mu_\\beta N_\\beta}.\\]"
        "本題 \\(M=100\\,\\mathrm{kg}\\)、\\(v_0=4.0\\,\\mathrm{m/s}\\)、\\(N_\\beta=200.0\\,\\mathrm{N}\\)，"
        "所以 \\(s=4/\\mu_\\beta\\,\\mathrm{m}\\)。"
    )

    q114_25 = get_question(data, 114, 25)
    q114_25["solution"] = (
        "答案 A。光在水中的強度可寫為 \\(I=I_0e^{-\\alpha x}\\)。"
        "衰減係數 \\(\\alpha\\) 越大，穿透同距離後的強度越小。"
        "由吸收光譜判斷，EUV 的 \\(13.5\\,\\mathrm{nm}\\) 在水中吸收最強，"
        "最不適合用於浸潤式曝光，故選 A。"
    )

    q114_26 = get_question(data, 114, 26)
    q114_26["solution"] = (
        "答案：非選擇題。光在水中的強度衰減為 \\(I=I_0e^{-\\alpha x}\\)。"
        "題意要求光在水中傳遞 \\(x=10\\,\\mathrm{cm}\\) 後仍有"
        "\\[\\frac{I}{I_0}\\ge 0.37\\approx e^{-1}.\\]"
        "因此"
        "\\[e^{-\\alpha x}\\ge e^{-1}\\Rightarrow \\alpha x\\le 1.\\]"
        "代入 \\(x=10\\,\\mathrm{cm}\\)，得"
        "\\[\\alpha\\le 0.10\\,\\mathrm{cm^{-1}}.\\]"
        "在圖 10 讀取所有滿足此條件的波長範圍，短波端與長波端即為 \\(\\lambda_L\\) 與 \\(\\lambda_H\\)。"
    )

    q113_8 = get_question(data, 113, 8)
    q113_8["solution"] = (
        "答案 A。每顆球受重力 \\(mg\\)、繩張力 \\(T\\) 與水平庫侖斥力 \\(F_e\\)。"
        "幾何關係給"
        "\\[\\tan\\theta=\\frac{d/2}{h}=\\frac{d}{2h}.\\]"
        "平衡條件為 \\(T\\cos\\theta=mg\\)、\\(T\\sin\\theta=F_e\\)，所以"
        "\\[\\frac{F_e}{mg}=\\tan\\theta=\\frac{d}{2h}.\\]"
        "又"
        "\\[F_e=\\frac{kq^2}{d^2},\\]"
        "因此"
        "\\[\\frac{kq^2}{d^2}=\\frac{mgd}{2h}\\Rightarrow q=\\sqrt{\\frac{mgd^3}{2kh}}.\\]"
        "對照選項，符合者為 A。"
    )

    q113_9 = get_question(data, 113, 9)
    q113_9["solution"] = (
        "答案 C。題目把台北 101 的減振系統近似成有效擺長 \\(L=12.1\\,\\mathrm{m}\\) 的理想單擺。"
        "小角度單擺週期為"
        "\\[T=2\\pi\\sqrt{\\frac{L}{g}}.\\]"
        "代入 \\(g=9.8\\,\\mathrm{m/s^2}\\)，"
        "\\[T=2\\pi\\sqrt{\\frac{12.1}{9.8}}\\approx 2\\pi\\sqrt{1.235}\\approx 6.98\\,\\mathrm{s}.\\]"
        "最接近 \\(6.9\\,\\mathrm{s}\\)，故選 C。"
    )

    q110_14 = get_question(data, 110, 14)
    q110_14["solution"] = (
        "答案 C。由宜蘭站圖讀出震源距 \\(141\\,\\mathrm{km}\\) 時，"
        "P 波約 \\(24\\,\\mathrm{s}\\) 到達、S 波約 \\(38\\,\\mathrm{s}\\) 到達，故"
        "\\[v_P\\approx \\frac{141}{24}=5.9\\,\\mathrm{km/s},\\qquad "
        "v_S\\approx \\frac{141}{38}=3.7\\,\\mathrm{km/s}.\\]"
        "苗栗距震源 \\(215\\,\\mathrm{km}\\)，可估"
        "\\[t_S\\approx \\frac{215}{3.7}=58\\,\\mathrm{s},\\qquad "
        "t_P\\approx \\frac{215}{5.9}=37\\,\\mathrm{s}.\\]"
        "系統在 P 波到達後 \\(7\\,\\mathrm{s}\\) 發出警報，約第 \\(44\\,\\mathrm{s}\\) 發出；"
        "再與圖上讀值及選項比較，對應的應變時間為 \\(26\\,\\mathrm{s}\\)，故選 C。"
    )

    q105_12 = get_question(data, 105, 12)
    q105_12["solution"] = (
        "答案 A。三個相同電阻可用串、並聯等效電阻比較。串聯時等效電阻相加，並聯時滿足"
        "\\[\\frac{1}{R_{\\rm eq}}=\\frac{1}{R_a}+\\frac{1}{R_b}.\\]"
        "依圖 4 各接法化簡後，總電阻大小為"
        "\\[R_{\\text{丙}}>R_{\\text{甲}}>R_{\\text{乙}}>R_{\\text{丁}}.\\]"
        "故選 A。"
    )

    q101_11 = get_question(data, 101, 11)
    q101_11["solution"] = (
        "答案 A。最低點時圓管對質點的正向力為 \\(N_{\\text{低}}\\)，向心條件為"
        "\\[N_{\\text{低}}-mg=\\frac{mv_0^2}{r}.\\]"
        "由最低點到最高點，高度增加 \\(2r\\)，能量守恆得"
        "\\[v_{\\text{高}}^2=v_0^2-4gr.\\]"
        "最高點向心方向向下，故"
        "\\[N_{\\text{高}}+mg=\\frac{mv_{\\text{高}}^2}{r}.\\]"
        "圓管施於基座的鉛直分量在最低與最高兩位置方向相反，其差為"
        "\\[N_{\\text{低}}+N_{\\text{高}}=\\frac{2mv_0^2}{r}-4mg.\\]"
        "故選 A。"
    )

    q101_20 = get_question(data, 101, 20)
    q101_20["solution"] = (
        "答案 E。\\(22920\\) 年等於 \\(5730\\) 年的 \\(4\\) 個半衰期。"
        "活體初始比例為"
        "\\[{}^{14}\\mathrm{C}/{}^{12}\\mathrm{C}=1.2\\times 10^{-12}.\\]"
        "經過 \\(4\\) 個半衰期後剩下"
        "\\[\\left(\\frac12\\right)^4=\\frac1{16}.\\]"
        "因此比例為"
        "\\[\\frac{1.2\\times 10^{-12}}{16}=7.5\\times 10^{-14}.\\]"
        "故選 E。"
    )

    q101_26 = get_question(data, 101, 26)
    q101_26["solution"] = (
        "本題為質心與彈簧振動。第 1 小題：以 \\(M\\) 所在位置為原點，\\(m\\) 在右方距離 \\(L\\)。"
        "系統質心位置為"
        "\\[x_c=\\frac{M\\cdot 0+mL}{M+m}=\\frac{mL}{M+m}.\\]"
        "因此質心距離 \\(M\\) 的距離為 \\(d=mL/(M+m)\\)。"
        "第 2 小題：彈簧原先伸長量為 \\(\\Delta L\\)，總彈性位能為 \\(\\frac12 k(\\Delta L)^2\\)。"
        "當彈簧位能剩總能量的一半時，"
        "\\[\\frac12 k\\ell^2=\\frac12\\left[\\frac12 k(\\Delta L)^2\\right]\\]"
        "所以"
        "\\[\\ell=\\frac{\\Delta L}{\\sqrt2}.\\]"
        "第 3 小題：桌面無摩擦，系統質心不動。由質心位置可得 \\(M\\) 的振幅"
        "\\[A_M=\\frac{m\\Delta L}{M+m}.\\]"
    )

    q100_11 = get_question(data, 100, 11)
    q100_11["solution"] = (
        "答案 E。由司乃耳定律"
        "\\[n_1\\sin\\theta_1=n_2\\sin\\theta_2\\]"
        "逐層代入圖中的角度 \\(\\theta_1=45^\\circ\\)、\\(\\theta_2=60^\\circ\\)、\\(\\theta_3=30^\\circ\\)。"
        "把空氣折射率取 \\(1\\)，即可求得甲、乙兩介質折射率分別為 \\(\\sqrt3\\) 與 \\(3/2\\)，故選 E。"
    )

    DATA_PATH.write_text(
        "\ufeff" + json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    report = audit_mathjax(data)
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
