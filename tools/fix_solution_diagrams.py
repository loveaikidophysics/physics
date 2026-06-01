import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"


PHOTOELECTRIC_CIRCUIT = """<svg viewBox="0 0 680 260" role="img" aria-label="光電效應量測電路" xmlns="http://www.w3.org/2000/svg">
  <defs><marker id="arr11123" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#111827"/></marker></defs>
  <rect x="80" y="80" width="115" height="70" rx="8" fill="#fff" stroke="#111827" stroke-width="3"/>
  <text x="138" y="122" text-anchor="middle" font-size="20">光電管</text>
  <circle cx="340" cy="115" r="28" fill="#fff" stroke="#111827" stroke-width="3"/>
  <text x="340" y="123" text-anchor="middle" font-size="24">A</text>
  <rect x="485" y="88" width="90" height="54" fill="#fff" stroke="#111827" stroke-width="3"/>
  <text x="530" y="121" text-anchor="middle" font-size="20">可調 V</text>
  <line x1="195" y1="115" x2="312" y2="115" stroke="#111827" stroke-width="3"/>
  <line x1="368" y1="115" x2="485" y2="115" stroke="#111827" stroke-width="3"/>
  <line x1="575" y1="115" x2="620" y2="115" stroke="#111827" stroke-width="3"/>
  <line x1="620" y1="115" x2="620" y2="205" stroke="#111827" stroke-width="3"/>
  <line x1="620" y1="205" x2="80" y2="205" stroke="#111827" stroke-width="3"/>
  <line x1="80" y1="205" x2="80" y2="115" stroke="#111827" stroke-width="3"/>
  <circle cx="238" cy="205" r="25" fill="#fff" stroke="#111827" stroke-width="3"/>
  <text x="238" y="213" text-anchor="middle" font-size="24">V</text>
  <line x1="85" y1="50" x2="130" y2="78" stroke="#2563eb" stroke-width="3" marker-end="url(#arr11123)"/>
  <text x="78" y="44" font-size="18">入射光 f</text>
  <text x="340" y="242" text-anchor="middle" font-size="18">調到光電流為 0，讀取截止電壓 V₀；V₀-f 圖斜率為 h/e</text>
</svg>"""

REFRACTION_PINS = """<svg viewBox="0 0 680 260" role="img" aria-label="插針法折射光路" xmlns="http://www.w3.org/2000/svg">
  <defs><marker id="arr10822" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#111827"/></marker></defs>
  <rect x="250" y="45" width="180" height="150" fill="#e0f2fe" stroke="#0369a1" stroke-width="3"/>
  <line x1="85" y1="190" x2="250" y2="120" stroke="#111827" stroke-width="3" marker-end="url(#arr10822)"/>
  <line x1="250" y1="120" x2="430" y2="145" stroke="#111827" stroke-width="3" marker-end="url(#arr10822)"/>
  <line x1="430" y1="145" x2="595" y2="75" stroke="#111827" stroke-width="3" marker-end="url(#arr10822)"/>
  <line x1="250" y1="35" x2="250" y2="205" stroke="#64748b" stroke-dasharray="7 6" stroke-width="2"/>
  <line x1="430" y1="35" x2="430" y2="205" stroke="#64748b" stroke-dasharray="7 6" stroke-width="2"/>
  <circle cx="130" cy="171" r="6" fill="#dc2626"/><circle cx="190" cy="145" r="6" fill="#dc2626"/>
  <circle cx="490" cy="119" r="6" fill="#dc2626"/><circle cx="550" cy="94" r="6" fill="#dc2626"/>
  <text x="340" y="226" text-anchor="middle" font-size="18">同側兩針距離愈大，入射線與出射線方向判定較穩定</text>
</svg>"""

BLOCK_FORCE = """<svg viewBox="0 0 620 260" role="img" aria-label="金屬塊受力圖" xmlns="http://www.w3.org/2000/svg">
  <defs><marker id="arr10426" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#111827"/></marker></defs>
  <rect x="260" y="95" width="100" height="70" fill="#fff" stroke="#111827" stroke-width="3"/>
  <line x1="310" y1="95" x2="310" y2="35" stroke="#0f766e" stroke-width="4" marker-end="url(#arr10426)"/>
  <text x="322" y="48" font-size="22">N</text>
  <line x1="310" y1="165" x2="310" y2="225" stroke="#dc2626" stroke-width="4" marker-end="url(#arr10426)"/>
  <text x="322" y="218" font-size="22">mg</text>
  <line x1="360" y1="130" x2="465" y2="130" stroke="#2563eb" stroke-width="4" marker-end="url(#arr10426)"/>
  <text x="425" y="118" font-size="22">F</text>
  <line x1="260" y1="130" x2="170" y2="130" stroke="#b45309" stroke-width="4" marker-end="url(#arr10426)"/>
  <text x="176" y="118" font-size="22">fₖ</text>
  <text x="310" y="248" text-anchor="middle" font-size="18">等速或臨界情況依水平、鉛直方向列平衡式</text>
</svg>"""

ACCELERATING_WEDGE = """<svg viewBox="0 0 700 330" role="img" aria-label="加速斜面上懸掛物體受力示意圖" xmlns="http://www.w3.org/2000/svg">
  <defs><marker id="arr10226" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#111827"/></marker></defs>
  <line x1="100" y1="260" x2="610" y2="260" stroke="#111827" stroke-width="4"/>
  <line x1="185" y1="260" x2="470" y2="75" stroke="#111827" stroke-width="4"/>
  <line x1="205" y1="92" x2="365" y2="196" stroke="#111827" stroke-width="4"/>
  <rect x="340" y="160" width="54" height="42" transform="rotate(-33 367 181)" fill="#fff" stroke="#111827" stroke-width="3"/>
  <line x1="365" y1="181" x2="296" y2="136" stroke="#2563eb" stroke-width="3" marker-end="url(#arr10226)"/>
  <text x="274" y="132" font-size="21">T</text>
  <line x1="365" y1="181" x2="414" y2="104" stroke="#0f766e" stroke-width="3" marker-end="url(#arr10226)"/>
  <text x="420" y="106" font-size="21">N</text>
  <line x1="365" y1="181" x2="365" y2="282" stroke="#dc2626" stroke-width="3" marker-end="url(#arr10226)"/>
  <text x="376" y="273" font-size="21">mg</text>
  <line x1="610" y1="165" x2="520" y2="165" stroke="#b45309" stroke-width="4" marker-end="url(#arr10226)"/>
  <text x="555" y="150" font-size="22">a</text>
  <path d="M470 260 A68 68 0 0 0 414 223" fill="none" stroke="#111827" stroke-width="2"/>
  <text x="424" y="252" font-size="21">θ</text>
  <line x1="126" y1="60" x2="126" y2="260" stroke="#64748b" stroke-width="3"/>
  <line x1="126" y1="60" x2="235" y2="131" stroke="#64748b" stroke-width="3"/>
  <text x="350" y="315" text-anchor="middle" font-size="19">在斜面參考系可加慣性力 ma 向右；臨界脫離時 N=0，繩張力沿斜面方向。</text>
</svg>"""

THIN_FILM_PATH = """<svg viewBox="0 0 680 280" role="img" aria-label="雙層薄膜折射光路示意圖" xmlns="http://www.w3.org/2000/svg">
  <defs><marker id="arr10206" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#111827"/></marker></defs>
  <rect x="250" y="55" width="90" height="170" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <rect x="340" y="55" width="90" height="170" fill="#ccfbf1" stroke="#0f766e" stroke-width="2"/>
  <text x="295" y="45" text-anchor="middle" font-size="18">n₁, d</text>
  <text x="385" y="45" text-anchor="middle" font-size="18">n₂, d</text>
  <line x1="110" y1="205" x2="250" y2="130" stroke="#111827" stroke-width="3" marker-end="url(#arr10206)"/>
  <line x1="250" y1="130" x2="340" y2="150" stroke="#111827" stroke-width="3" marker-end="url(#arr10206)"/>
  <line x1="340" y1="150" x2="430" y2="118" stroke="#111827" stroke-width="3" marker-end="url(#arr10206)"/>
  <line x1="430" y1="118" x2="575" y2="46" stroke="#111827" stroke-width="3" marker-end="url(#arr10206)"/>
  <line x1="250" y1="40" x2="250" y2="235" stroke="#64748b" stroke-dasharray="7 6" stroke-width="2"/>
  <line x1="340" y1="40" x2="340" y2="235" stroke="#64748b" stroke-dasharray="7 6" stroke-width="2"/>
  <line x1="430" y1="40" x2="430" y2="235" stroke="#64748b" stroke-dasharray="7 6" stroke-width="2"/>
  <text x="340" y="262" text-anchor="middle" font-size="18">以等效薄膜取代時，需讓出射光方向與側向位移符合原光路。</text>
</svg>"""

SINGLE_SLIT = """<svg viewBox="0 0 680 280" role="img" aria-label="單狹縫繞射暗紋條件示意圖" xmlns="http://www.w3.org/2000/svg">
  <defs><marker id="arr10222" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#111827"/></marker></defs>
  <rect x="215" y="45" width="20" height="190" fill="#111827"/>
  <rect x="215" y="126" width="20" height="28" fill="#fff"/>
  <text x="182" y="145" font-size="20">d</text>
  <line x1="80" y1="140" x2="215" y2="140" stroke="#2563eb" stroke-width="4" marker-end="url(#arr10222)"/>
  <line x1="235" y1="140" x2="575" y2="70" stroke="#111827" stroke-width="3" marker-end="url(#arr10222)"/>
  <line x1="235" y1="140" x2="575" y2="140" stroke="#111827" stroke-width="2"/>
  <rect x="575" y="40" width="8" height="210" fill="#64748b"/>
  <text x="592" y="146" font-size="20">屏幕</text>
  <path d="M265 140 A60 60 0 0 0 322 128" fill="none" stroke="#111827" stroke-width="2"/>
  <text x="300" y="120" font-size="20">θ</text>
  <text x="340" y="262" text-anchor="middle" font-size="18">暗紋條件：d sinθ = mλ；若屏幕範圍內沒有暗紋，需逐項檢查 θ、λ 與 d 的限制。</text>
</svg>"""


def add_diagram(data, year, no, title, svg):
    analysis = next(item for item in data["analysis"] if int(item["year"]) == year)
    question = next(item for item in analysis["questions"] if int(item["no"]) == no)
    question["solutionDiagrams"] = [{"title": title, "svg": svg}]


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    for analysis in data["analysis"]:
        for question in analysis.get("questions", []):
            if "先畫受力圖或列出運動模型" in question.get("solution", ""):
                question["solution"] = question["solution"].replace("先畫受力圖或列出運動模型", "先建立運動模型")

    add_diagram(data, 111, 23, "光電效應截止電壓量測電路", PHOTOELECTRIC_CIRCUIT)
    add_diagram(data, 108, 22, "插針法重建入射線、折射線與出射線", REFRACTION_PINS)
    add_diagram(data, 104, 26, "金屬塊受力圖", BLOCK_FORCE)
    add_diagram(data, 102, 6, "雙層薄膜折射光路示意圖", THIN_FILM_PATH)
    add_diagram(data, 102, 22, "單狹縫繞射暗紋條件示意圖", SINGLE_SLIT)
    add_diagram(data, 102, 26, "加速斜面上懸掛物體受力示意圖", ACCELERATING_WEDGE)

    DATA_PATH.write_text("\ufeff" + json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
