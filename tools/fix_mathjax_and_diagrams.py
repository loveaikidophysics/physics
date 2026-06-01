import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"


TRADITIONAL_TWEEZER_SVG = r'''<svg viewBox="0 0 720 360" role="img" aria-label="傳統鑷子夾球受力圖" xmlns="http://www.w3.org/2000/svg">
 <defs><marker id="arr10826a2" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#111827"/></marker></defs>
 <circle cx="360" cy="170" r="72" fill="#fff" stroke="#111827" stroke-width="3"/>
 <line x1="245" y1="52" x2="315" y2="137" stroke="#111827" stroke-width="6" stroke-linecap="round"/>
 <line x1="475" y1="52" x2="405" y2="137" stroke="#111827" stroke-width="6" stroke-linecap="round"/>
 <line x1="360" y1="75" x2="360" y2="285" stroke="#94a3b8" stroke-width="2" stroke-dasharray="7 7"/>
 <line x1="315" y1="137" x2="350" y2="163" stroke="#0f766e" stroke-width="4" marker-end="url(#arr10826a2)"/>
 <line x1="405" y1="137" x2="370" y2="163" stroke="#0f766e" stroke-width="4" marker-end="url(#arr10826a2)"/>
 <text x="325" y="133" font-size="22">F</text>
 <text x="383" y="133" font-size="22">F</text>
 <line x1="315" y1="137" x2="282" y2="88" stroke="#b45309" stroke-width="4" marker-end="url(#arr10826a2)"/>
 <line x1="405" y1="137" x2="438" y2="88" stroke="#b45309" stroke-width="4" marker-end="url(#arr10826a2)"/>
 <text x="250" y="91" font-size="21">μF</text>
 <text x="445" y="91" font-size="21">μF</text>
 <line x1="360" y1="170" x2="360" y2="292" stroke="#dc2626" stroke-width="4" marker-end="url(#arr10826a2)"/>
 <text x="374" y="286" font-size="23">mg</text>
 <path d="M360 95 A48 48 0 0 1 390 108" fill="none" stroke="#111827" stroke-width="2"/>
 <text x="384" y="103" font-size="21">θ</text>
 <text x="360" y="332" text-anchor="middle" font-size="21">鉛直平衡：2μFcosθ = 2Fsinθ + mg</text>
</svg>'''


OPTICAL_TWEEZER_SVG = r'''<svg viewBox="0 0 720 360" role="img" aria-label="光學鑷子光路與動量變化示意圖" xmlns="http://www.w3.org/2000/svg">
 <defs><marker id="arr10826b2" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#111827"/></marker></defs>
 <circle cx="360" cy="174" r="80" fill="#fff" stroke="#111827" stroke-width="3"/>
 <text x="360" y="181" text-anchor="middle" font-size="22">O</text>
 <text x="360" y="62" text-anchor="middle" font-size="22">C</text>
 <line x1="360" y1="68" x2="295" y2="238" stroke="#64748b" stroke-width="2" stroke-dasharray="8 7"/>
 <line x1="360" y1="68" x2="425" y2="238" stroke="#64748b" stroke-width="2" stroke-dasharray="8 7"/>
 <line x1="120" y1="305" x2="295" y2="238" stroke="#0f766e" stroke-width="4" marker-end="url(#arr10826b2)"/>
 <line x1="600" y1="305" x2="425" y2="238" stroke="#0f766e" stroke-width="4" marker-end="url(#arr10826b2)"/>
 <line x1="295" y1="238" x2="318" y2="105" stroke="#0f766e" stroke-width="4" marker-end="url(#arr10826b2)"/>
 <line x1="425" y1="238" x2="402" y2="105" stroke="#0f766e" stroke-width="4" marker-end="url(#arr10826b2)"/>
 <line x1="318" y1="105" x2="205" y2="72" stroke="#0f766e" stroke-width="4" marker-end="url(#arr10826b2)"/>
 <line x1="402" y1="105" x2="515" y2="72" stroke="#0f766e" stroke-width="4" marker-end="url(#arr10826b2)"/>
 <text x="138" y="286" font-size="21">P₃</text>
 <text x="556" y="286" font-size="21">P₄</text>
 <text x="210" y="62" font-size="21">P₃′</text>
 <text x="486" y="62" font-size="21">P₄′</text>
 <line x1="210" y1="116" x2="210" y2="166" stroke="#2563eb" stroke-width="4" marker-end="url(#arr10826b2)"/>
 <line x1="510" y1="116" x2="510" y2="166" stroke="#2563eb" stroke-width="4" marker-end="url(#arr10826b2)"/>
 <text x="170" y="110" font-size="21">ΔP₃</text>
 <text x="520" y="110" font-size="21">ΔP₄</text>
 <line x1="360" y1="174" x2="360" y2="82" stroke="#dc2626" stroke-width="5" marker-end="url(#arr10826b2)"/>
 <text x="373" y="104" font-size="23">F</text>
 <text x="360" y="334" text-anchor="middle" font-size="21">光子總動量變化向下；微粒受力向上，朝焦點 C</text>
</svg>'''


CURRENT_BALANCE_SVG = r'''<svg viewBox="0 0 720 300" role="img" aria-label="電流天平示意圖" xmlns="http://www.w3.org/2000/svg">
 <defs><marker id="arr10125" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#111827"/></marker></defs>
 <rect x="120" y="70" width="480" height="128" fill="#eff6ff" stroke="#2563eb" stroke-width="3"/>
 <text x="360" y="55" text-anchor="middle" font-size="22">螺線管內近似均勻磁場 B</text>
 <text x="175" y="103" font-size="24">×</text><text x="245" y="103" font-size="24">×</text><text x="315" y="103" font-size="24">×</text><text x="385" y="103" font-size="24">×</text><text x="455" y="103" font-size="24">×</text><text x="525" y="103" font-size="24">×</text>
 <path d="M235 218 V150 H485 V218" fill="none" stroke="#111827" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
 <line x1="250" y1="150" x2="470" y2="150" stroke="#0f766e" stroke-width="6" marker-end="url(#arr10125)"/>
 <text x="360" y="140" text-anchor="middle" font-size="22">I₁</text>
 <line x1="360" y1="150" x2="360" y2="95" stroke="#dc2626" stroke-width="4" marker-end="url(#arr10125)"/>
 <text x="374" y="106" font-size="22">F</text>
 <line x1="360" y1="152" x2="360" y2="214" stroke="#b45309" stroke-width="4" marker-end="url(#arr10125)"/>
 <text x="374" y="208" font-size="22">w</text>
 <line x1="250" y1="170" x2="470" y2="170" stroke="#64748b" stroke-width="2" marker-end="url(#arr10125)" marker-start="url(#arr10125)"/>
 <text x="360" y="196" text-anchor="middle" font-size="21">ℓ_b</text>
 <text x="360" y="268" text-anchor="middle" font-size="21">等臂平衡：F = I₁ℓ_bB = w</text>
</svg>'''


def get_question(data, year, no):
    analysis = next(item for item in data["analysis"] if item["year"] == year)
    return next(item for item in analysis["questions"] if item["no"] == no)


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))

    q114 = get_question(data, 114, 26)
    q114["solution"] = (
        "答案：非選擇題。光在水中的強度衰減可寫為 "
        "\\(I=I_0e^{-\\alpha x}\\)。題意要求 \\(x=10\\,\\mathrm{cm}\\) 後仍有 "
        "\\(I/I_0\\ge 0.37\\approx e^{-1}\\)，故 \\(e^{-\\alpha x}\\ge e^{-1}\\)。"
        "由指數函數單調性得 \\(-\\alpha x\\ge -1\\)，所以 "
        "\\(\\alpha\\le 1/x=0.10\\,\\mathrm{cm^{-1}}\\)。"
        "在圖 10 讀取所有 \\(\\alpha\\le 0.10\\,\\mathrm{cm^{-1}}\\) 的波長區間；"
        "該區間的短波端與長波端即為 \\(\\lambda_L\\) 與 \\(\\lambda_H\\)。"
    )

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
        "第 1 小題：U 形導線的有效水平段長為 \\(\\ell_b\\)，通電流 \\(I_1\\)，置於螺線管產生的磁場 \\(B\\) 中，"
        "磁力大小為 \\(F=I_1\\ell_bB\\)。等臂天平平衡時，磁力矩等於掛勾重力矩，故"
        "\\[I_1\\ell_bB=w.\\]"
        "第 2 小題：固定 \\(I_1\\) 與 \\(\\ell_b\\) 時，\\(w\\propto B\\)。長螺線管內 "
        "\\(B\\propto I_2\\)，所以 \\(w\\) 對 \\(I_2\\) 的圖線應近似通過原點的直線。"
        "第 3 小題：固定 \\(I_2\\)，沿軸向改變導線段位置 \\(x\\)，每一位置調整 \\(w\\) 或 \\(I_1\\) 至平衡，"
        "再由"
        "\\[B(x)=\\frac{w}{I_1\\ell_b}\\]"
        "求出磁場。作 \\(B\\)-\\(x\\) 圖即可看出螺線管中心較均勻、端口附近較小。"
    )
    q101["solutionDiagrams"] = [
        {"title": "電流天平", "svg": CURRENT_BALANCE_SVG}
    ]

    DATA_PATH.write_text(
        "\ufeff" + json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print("fixed MathJax solutions and diagrams for 114-26, 108-26, 101-25")


if __name__ == "__main__":
    main()
