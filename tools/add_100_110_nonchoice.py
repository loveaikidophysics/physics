import json
import re
import shutil
from collections import Counter
from pathlib import Path
from urllib.parse import quote

from pdf2image import convert_from_path
from PIL import ImageDraw
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"
DOWNLOADS = ROOT / "downloads"
OUTPUT_ROOT = ROOT / "assets" / "question-shots"
POPPLER_PATH = Path(r"D:\codex\Release-26.02.0-0\poppler-26.02.0\Library\bin")
DPI = 220

MANUAL_NONCHOICE_STARTS = {
    107: (
        {"label": "一", "page": 7, "y": 251.2},
        {"label": "二", "page": 8, "y": 579.7},
    ),
    106: (
        {"label": "一", "page": 8, "y": 629.1},
        {"label": "二", "page": 8, "y": 509.1},
    ),
    108: (
        {"label": "一", "page": 8, "y": 744.7},
        {"label": "二", "page": 8, "y": 545.0},
    ),
}

MANUAL_NONCHOICE_BOTTOMS = {
    (108, 25): {"page": 8, "bottomPdfY": 579.0},
}

LITERACY_NAMES = [
    "實驗與素養探究",
    "圖表判讀",
    "實驗設計與誤差",
    "生活情境建模",
    "跨章節概念整合",
    "文字敘述轉物理量",
]

LEGACY_LITERACY_MAP = {
    "數值計算": ["文字敘述轉物理量"],
    "計算推演": ["文字敘述轉物理量"],
    "原理推演": ["跨章節概念整合", "文字敘述轉物理量"],
    "概念判斷": ["跨章節概念整合", "文字敘述轉物理量"],
    "科技情境": ["生活情境建模", "跨章節概念整合"],
    "科學或科技議題": ["生活情境建模", "跨章節概念整合"],
}

UNIT_ORDER = ["力學", "熱學", "波動與光學", "電磁學", "近代物理", "實驗與探究"]

LITERACY_KEYWORDS = {
    "實驗與素養探究": ["實驗", "測量", "儀器", "量熱", "檢流計", "共鳴", "作圖", "觀測"],
    "圖表判讀": ["圖", "表", "曲線", "斜率", "面積", "數據", "I-V", "座標", "關係圖"],
    "實驗設計與誤差": ["誤差", "校正", "有效數字", "測量", "儀器", "作圖", "滿刻度"],
    "生活情境建模": [
        "汽車",
        "熱氣球",
        "地震",
        "RFID",
        "頭髮",
        "起重機",
        "書本",
        "球",
        "LED",
        "水波",
        "聲",
        "共鳴管",
    ],
    "跨章節概念整合": ["能量", "動量", "模型", "推導", "關係", "光電", "電磁波", "德布羅意", "半衰期", "折射"],
}

SPECIAL_NONCHOICE = {
    (106, 25): {
        "unit": "波動與光學",
        "literacyTypes": ["實驗與素養探究", "圖表判讀", "實驗設計與誤差", "文字敘述轉物理量"],
        "solution": (
            "本題為雙狹縫干涉與單狹縫繞射實驗。第 1 小題 (a) 的實驗配置為：雷射光垂直照射雙狹縫，"
            "雙狹縫到屏幕距離為 L，兩狹縫間距為 d，在屏幕上形成干涉條紋；需在圖上標示雷射、雙狹縫、屏幕、"
            "d、L，以及相鄰亮紋或相鄰暗紋間距 Δy。"
            "\n\n第 1 小題 (b) 利用雙狹縫干涉條紋間距公式 Δy = Lλ/d，因此未知雷射波長為 λ = dΔy/L。"
            "實驗上 d 已知，需量測雙狹縫到屏幕距離 L，以及屏幕上相鄰亮紋或相鄰暗紋的間距 Δy；為降低誤差，可量多個條紋間距後取平均。"
            "\n\n第 2 小題改成單狹縫後，L 與雷射波長 λ 皆已知。若量測單狹縫繞射相鄰暗紋的間距 Δyₛ，"
            "由單狹縫暗紋條件 a sinθ = mλ，且小角近似 y/L ≈ sinθ，可得 Δyₛ = Lλ/a，所以 a = Lλ/Δyₛ。"
            "也可量中央亮帶寬度 W；因中央亮帶寬度 W = 2Lλ/a，故 a = 2Lλ/W。若用雙狹縫干涉間距 Δy 與單狹縫中央亮帶寬度 W 比較，"
            "因 W/Δy = 2d/a，所以 a = 2dΔy/W。"
        ),
        "solutionDiagrams": [
            {
                "title": "雙狹縫干涉與屏幕量測示意圖",
                "svg": """<svg viewBox=\"0 0 700 300\" role=\"img\" aria-label=\"雙狹縫干涉實驗示意圖\" xmlns=\"http://www.w3.org/2000/svg\">
  <defs><marker id=\"arr10625\" markerWidth=\"10\" markerHeight=\"10\" refX=\"8\" refY=\"3\" orient=\"auto\"><path d=\"M0,0 L8,3 L0,6 Z\" fill=\"#111827\"/></marker></defs>
  <text x=\"58\" y=\"154\" font-size=\"20\">雷射</text>
  <line x1=\"105\" y1=\"150\" x2=\"250\" y2=\"150\" stroke=\"#dc2626\" stroke-width=\"4\" marker-end=\"url(#arr10625)\"/>
  <rect x=\"260\" y=\"55\" width=\"16\" height=\"190\" fill=\"#111827\"/>
  <rect x=\"260\" y=\"126\" width=\"16\" height=\"10\" fill=\"#fff\"/>
  <rect x=\"260\" y=\"164\" width=\"16\" height=\"10\" fill=\"#fff\"/>
  <text x=\"232\" y=\"115\" font-size=\"20\">d</text>
  <line x1=\"246\" y1=\"131\" x2=\"246\" y2=\"169\" stroke=\"#111827\" stroke-width=\"2\"/>
  <line x1=\"238\" y1=\"131\" x2=\"254\" y2=\"131\" stroke=\"#111827\" stroke-width=\"2\"/>
  <line x1=\"238\" y1=\"169\" x2=\"254\" y2=\"169\" stroke=\"#111827\" stroke-width=\"2\"/>
  <line x1=\"276\" y1=\"131\" x2=\"575\" y2=\"80\" stroke=\"#2563eb\" stroke-width=\"2\"/>
  <line x1=\"276\" y1=\"169\" x2=\"575\" y2=\"220\" stroke=\"#2563eb\" stroke-width=\"2\"/>
  <line x1=\"276\" y1=\"150\" x2=\"575\" y2=\"150\" stroke=\"#2563eb\" stroke-width=\"2\"/>
  <rect x=\"575\" y=\"45\" width=\"8\" height=\"210\" fill=\"#475569\"/>
  <text x=\"592\" y=\"153\" font-size=\"20\">屏幕</text>
  <line x1=\"276\" y1=\"266\" x2=\"575\" y2=\"266\" stroke=\"#111827\" stroke-width=\"2\" marker-end=\"url(#arr10625)\"/>
  <text x=\"420\" y=\"290\" font-size=\"20\">L</text>
  <line x1=\"604\" y1=\"124\" x2=\"604\" y2=\"150\" stroke=\"#111827\" stroke-width=\"2\"/>
  <line x1=\"596\" y1=\"124\" x2=\"612\" y2=\"124\" stroke=\"#111827\" stroke-width=\"2\"/>
  <line x1=\"596\" y1=\"150\" x2=\"612\" y2=\"150\" stroke=\"#111827\" stroke-width=\"2\"/>
  <text x=\"616\" y=\"141\" font-size=\"20\">Δy</text>
  <text x=\"350\" y=\"32\" font-size=\"20\">Δy = Lλ/d，因此 λ = dΔy/L</text>
</svg>""",
            }
        ],
    },
    (106, 26): {
        "unit": "力學",
        "literacyTypes": ["圖表判讀", "生活情境建模", "跨章節概念整合", "文字敘述轉物理量"],
        "solution": (
            "第 1 小題：物體在斜面上受重力 mg、正向力 N 與動摩擦力 fₖ。正向力 N = mgcosθ，"
            "動摩擦力 fₖ = μN = μmgcosθ，方向沿斜面向上，與位移 L 反向。因此摩擦力作功 Wf = −fₖL = −μmgLcosθ。"
            "\n\n第 2 小題：先求物體到達斜面底部的速率 v。由能量關係："
            "1/2 mv² = 1/2 mv₀² + mgLsinθ − μmgLcosθ，故 v² = v₀² + 2gL(sinθ − μcosθ)。"
            "進入水平面後，只有動摩擦力作負功使物體停下：0 − 1/2 mv² = −μmgd。"
            "所以 d = v²/(2μg) = [v₀² + 2gL(sinθ − μcosθ)]/(2μg)。"
            "\n\n第 3 小題：水平面上動摩擦力造成等減速度大小 a = μg，停止時間 t = v/a。"
            "代入斜面底部速率 v = √[v₀² + 2gL(sinθ − μcosθ)]，得 t = √[v₀² + 2gL(sinθ − μcosθ)]/(μg)。"
            "若根號內小於零，表示物體尚未到達斜面底部，題設情境即不成立。"
        ),
        "solutionDiagrams": [
            {
                "title": "斜面與水平面運動受力示意圖",
                "svg": """<svg viewBox=\"0 0 700 330\" role=\"img\" aria-label=\"斜面與水平面受力圖\" xmlns=\"http://www.w3.org/2000/svg\">
  <defs><marker id=\"arr10626\" markerWidth=\"10\" markerHeight=\"10\" refX=\"8\" refY=\"3\" orient=\"auto\"><path d=\"M0,0 L8,3 L0,6 Z\" fill=\"#111827\"/></marker></defs>
  <line x1=\"80\" y1=\"250\" x2=\"350\" y2=\"110\" stroke=\"#111827\" stroke-width=\"4\"/>
  <line x1=\"350\" y1=\"250\" x2=\"640\" y2=\"250\" stroke=\"#111827\" stroke-width=\"4\"/>
  <rect x=\"205\" y=\"152\" width=\"46\" height=\"34\" transform=\"rotate(-27 228 169)\" fill=\"#fff\" stroke=\"#111827\" stroke-width=\"3\"/>
  <line x1=\"228\" y1=\"169\" x2=\"285\" y2=\"138\" stroke=\"#2563eb\" stroke-width=\"3\" marker-end=\"url(#arr10626)\"/>
  <text x=\"286\" y=\"134\" font-size=\"20\">v₀</text>
  <line x1=\"228\" y1=\"169\" x2=\"180\" y2=\"194\" stroke=\"#b45309\" stroke-width=\"3\" marker-end=\"url(#arr10626)\"/>
  <text x=\"145\" y=\"205\" font-size=\"20\">fₖ</text>
  <line x1=\"228\" y1=\"169\" x2=\"203\" y2=\"120\" stroke=\"#0f766e\" stroke-width=\"3\" marker-end=\"url(#arr10626)\"/>
  <text x=\"184\" y=\"118\" font-size=\"20\">N</text>
  <line x1=\"228\" y1=\"169\" x2=\"228\" y2=\"245\" stroke=\"#dc2626\" stroke-width=\"3\" marker-end=\"url(#arr10626)\"/>
  <text x=\"238\" y=\"236\" font-size=\"20\">mg</text>
  <path d=\"M350 250 A54 54 0 0 0 302 226\" fill=\"none\" stroke=\"#111827\" stroke-width=\"2\"/>
  <text x=\"310\" y=\"246\" font-size=\"20\">θ</text>
  <line x1=\"105\" y1=\"275\" x2=\"350\" y2=\"275\" stroke=\"#111827\" stroke-width=\"2\" marker-end=\"url(#arr10626)\"/>
  <text x=\"222\" y=\"303\" font-size=\"20\">L</text>
  <line x1=\"350\" y1=\"275\" x2=\"610\" y2=\"275\" stroke=\"#111827\" stroke-width=\"2\" marker-end=\"url(#arr10626)\"/>
  <text x=\"480\" y=\"303\" font-size=\"20\">d</text>
  <text x=\"350\" y=\"42\" text-anchor=\"middle\" font-size=\"20\">斜面上：Wf = −μmgLcosθ；水平面上：d = v²/(2μg)</text>
</svg>""",
            }
        ],
    },
    (108, 25): {
        "unit": "電磁學",
        "literacyTypes": ["實驗與素養探究", "圖表判讀", "實驗設計與誤差", "文字敘述轉物理量"],
        "solution": (
            "本題為惠司同電橋測量未知電阻 Rx 的實驗設計。第 1 小題應把已知電阻 R1、待測電阻 Rx、"
            "均勻電阻線 MN、滑動接點 P、檢流計 G、直流電源 ε 與開關 S 接成橋式電路。檢流計一端接在 R1 與 Rx 的交會點，"
            "另一端接滑動接點 P；電源接在橋路兩端，使電阻線 MP 與 PN 形成可調比例臂。"
            "\n\n第 2 小題的原理是平衡電橋。調整 P 到檢流計讀數為 0 時，檢流計兩端電位相同，表示橋的兩支路電位分配比例相等："
            "R1/Rx = RMP/RPN。惠司同電橋的電阻線均勻，電阻與長度成正比，所以 RMP/RPN = MP/PN。"
            "因此 R1/Rx = MP/PN，整理得 Rx = R1 × PN/MP。"
            "\n\n第 3 小題的操作步驟為：先將檢流計歸零並依圖接線；接通電源與開關；移動滑動接點 P，直到檢流計讀數為 0；"
            "量得 MP 與 PN 的長度；最後代入 Rx = R1 × PN/MP 求得未知電阻。作答時須標明電路圖中各元件名稱，並說明平衡時檢流計無電流。"
        ),
        "commonMistake": "常見錯誤是把檢流計接成一般串聯電流表，或把比例式寫反成 Rx = R1 × MP/PN；也有人忘記只有在檢流計讀數為 0 的平衡狀態下，才可使用電橋比例關係。",
        "keyConcept": "惠司同電橋、平衡電橋、均勻電阻線電阻與長度成正比、檢流計零偏法。",
        "solutionDiagrams": [
            {
                "title": "惠司同電橋接線示意圖",
                "svg": """<svg viewBox=\"0 0 680 300\" role=\"img\" aria-label=\"惠司同電橋接線示意圖\" xmlns=\"http://www.w3.org/2000/svg\">
  <defs><marker id=\"dot10825\" markerWidth=\"6\" markerHeight=\"6\" refX=\"3\" refY=\"3\"><circle cx=\"3\" cy=\"3\" r=\"3\" fill=\"#111827\"/></marker></defs>
  <rect x=\"70\" y=\"55\" width=\"120\" height=\"42\" rx=\"6\" fill=\"#f8fafc\" stroke=\"#111827\" stroke-width=\"2\"/>
  <text x=\"130\" y=\"82\" text-anchor=\"middle\" font-size=\"22\">R₁</text>
  <rect x=\"490\" y=\"55\" width=\"120\" height=\"42\" rx=\"6\" fill=\"#f8fafc\" stroke=\"#111827\" stroke-width=\"2\"/>
  <text x=\"550\" y=\"82\" text-anchor=\"middle\" font-size=\"22\">Rₓ</text>
  <line x1=\"190\" y1=\"76\" x2=\"490\" y2=\"76\" stroke=\"#111827\" stroke-width=\"3\" marker-start=\"url(#dot10825)\" marker-end=\"url(#dot10825)\"/>
  <line x1=\"70\" y1=\"76\" x2=\"70\" y2=\"210\" stroke=\"#111827\" stroke-width=\"3\"/>
  <line x1=\"610\" y1=\"76\" x2=\"610\" y2=\"210\" stroke=\"#111827\" stroke-width=\"3\"/>
  <line x1=\"70\" y1=\"210\" x2=\"610\" y2=\"210\" stroke=\"#111827\" stroke-width=\"6\" stroke-linecap=\"round\"/>
  <text x=\"70\" y=\"240\" text-anchor=\"middle\" font-size=\"22\">M</text>
  <text x=\"610\" y=\"240\" text-anchor=\"middle\" font-size=\"22\">N</text>
  <circle cx=\"345\" cy=\"210\" r=\"9\" fill=\"#fff\" stroke=\"#111827\" stroke-width=\"3\"/>
  <text x=\"345\" y=\"240\" text-anchor=\"middle\" font-size=\"22\">P</text>
  <line x1=\"345\" y1=\"210\" x2=\"345\" y2=\"132\" stroke=\"#111827\" stroke-width=\"3\"/>
  <circle cx=\"345\" cy=\"132\" r=\"24\" fill=\"#fff\" stroke=\"#111827\" stroke-width=\"3\"/>
  <text x=\"345\" y=\"140\" text-anchor=\"middle\" font-size=\"22\">G</text>
  <line x1=\"345\" y1=\"108\" x2=\"345\" y2=\"76\" stroke=\"#111827\" stroke-width=\"3\"/>
  <line x1=\"70\" y1=\"210\" x2=\"40\" y2=\"210\" stroke=\"#111827\" stroke-width=\"3\"/>
  <line x1=\"610\" y1=\"210\" x2=\"640\" y2=\"210\" stroke=\"#111827\" stroke-width=\"3\"/>
  <line x1=\"40\" y1=\"210\" x2=\"40\" y2=\"132\" stroke=\"#111827\" stroke-width=\"3\"/>
  <line x1=\"640\" y1=\"210\" x2=\"640\" y2=\"132\" stroke=\"#111827\" stroke-width=\"3\"/>
  <line x1=\"40\" y1=\"132\" x2=\"95\" y2=\"132\" stroke=\"#111827\" stroke-width=\"3\"/>
  <line x1=\"585\" y1=\"132\" x2=\"640\" y2=\"132\" stroke=\"#111827\" stroke-width=\"3\"/>
  <text x=\"340\" y=\"278\" text-anchor=\"middle\" font-size=\"20\">平衡時：R₁/Rₓ = MP/PN，因此 Rₓ = R₁ × PN/MP</text>
</svg>""",
            }
        ],
    },
    (108, 26): {
        "unit": "波動與光學",
        "literacyTypes": ["實驗與素養探究", "圖表判讀", "生活情境建模", "跨章節概念整合", "文字敘述轉物理量"],
        "solution": (
            "本題分為傳統鑷子與光學鑷子兩部分。第一小題先畫小球受力圖：左右兩臂各對小球施力 F，方向沿接觸面法線；"
            "靜摩擦力大小為 μF，沿接觸面向上以阻止小球下滑；另有重力 mg 向下。設兩臂方向與鉛直方向夾角為 θ，"
            "由幾何可得 tanθ=R/L，且 cosθ=L/√(L²+R²)、sinθ=R/√(L²+R²)。"
            "\n\n鉛直方向力平衡：2μFcosθ = 2Fsinθ + mg。整理得 μ = tanθ + mg/(2Fcosθ)。"
            "代入 tanθ=R/L、cosθ=L/√(L²+R²)，可得 μ = R/L + mg√(L²+R²)/(2FL)。"
            "這是小球恰可被夾起時的最小靜摩擦係數。若少算兩側接觸力，或把摩擦力方向畫向下，會得到錯誤結果。"
            "\n\n第二小題討論光學鑷子。光子進入折射率較大的微粒後會折射，光子動量方向改變；光子總動量變化為 ΔP光子。"
            "微粒受到的衝量必與光子動量變化相反，即 FΔt = −ΔP光子，所以微粒受力方向和光束折射後造成的光子總動量變化方向相反。"
            "當兩入射光線改為會聚到球心 O 上方的 C 點時，依折射路徑判斷，射出光較入射光向外偏折，使光子總動量變化偏向上方；"
            "因此微粒受力方向向下。圖中需標出入射與出射光路、P3、P3′、P4、P4′、ΔP3、ΔP4，以及微粒所受合力 F 的方向。"
        ),
        "commonMistake": "常見錯誤是把傳統鑷子的摩擦力方向畫錯，或在光學鑷子中只看光線方向而沒有比較光子入射前後動量向量；也常漏掉微粒受力方向必與光子總動量變化方向相反。",
        "keyConcept": "受力圖與鉛直方向平衡、最大靜摩擦力 f_s=μN、折射造成光子動量改變、作用力與反作用力、衝量與動量守恆。",
        "solutionDiagrams": [
            {
                "title": "傳統鑷子夾球受力圖",
                "svg": """<svg viewBox=\"0 0 680 330\" role=\"img\" aria-label=\"傳統鑷子夾球受力圖\" xmlns=\"http://www.w3.org/2000/svg\">
  <defs><marker id=\"arr10826a\" markerWidth=\"10\" markerHeight=\"10\" refX=\"8\" refY=\"3\" orient=\"auto\"><path d=\"M0,0 L8,3 L0,6 Z\" fill=\"#111827\"/></marker></defs>
  <circle cx=\"340\" cy=\"165\" r=\"70\" fill=\"#fff\" stroke=\"#111827\" stroke-width=\"3\"/>
  <line x1=\"232\" y1=\"65\" x2=\"295\" y2=\"155\" stroke=\"#111827\" stroke-width=\"5\"/>
  <line x1=\"448\" y1=\"65\" x2=\"385\" y2=\"155\" stroke=\"#111827\" stroke-width=\"5\"/>
  <line x1=\"295\" y1=\"155\" x2=\"245\" y2=\"95\" stroke=\"#64748b\" stroke-width=\"2\" stroke-dasharray=\"8 6\"/>
  <line x1=\"385\" y1=\"155\" x2=\"435\" y2=\"95\" stroke=\"#64748b\" stroke-width=\"2\" stroke-dasharray=\"8 6\"/>
  <line x1=\"295\" y1=\"155\" x2=\"340\" y2=\"185\" stroke=\"#0f766e\" stroke-width=\"3\" marker-end=\"url(#arr10826a)\"/>
  <line x1=\"385\" y1=\"155\" x2=\"340\" y2=\"185\" stroke=\"#0f766e\" stroke-width=\"3\" marker-end=\"url(#arr10826a)\"/>
  <text x=\"270\" y=\"148\" font-size=\"22\">F</text><text x=\"398\" y=\"148\" font-size=\"22\">F</text>
  <line x1=\"300\" y1=\"180\" x2=\"285\" y2=\"125\" stroke=\"#b45309\" stroke-width=\"3\" marker-end=\"url(#arr10826a)\"/>
  <line x1=\"380\" y1=\"180\" x2=\"395\" y2=\"125\" stroke=\"#b45309\" stroke-width=\"3\" marker-end=\"url(#arr10826a)\"/>
  <text x=\"250\" y=\"125\" font-size=\"20\">μF</text><text x=\"405\" y=\"125\" font-size=\"20\">μF</text>
  <line x1=\"340\" y1=\"165\" x2=\"340\" y2=\"275\" stroke=\"#dc2626\" stroke-width=\"3\" marker-end=\"url(#arr10826a)\"/>
  <text x=\"352\" y=\"270\" font-size=\"22\">mg</text>
  <line x1=\"340\" y1=\"75\" x2=\"340\" y2=\"255\" stroke=\"#94a3b8\" stroke-width=\"2\" stroke-dasharray=\"6 6\"/>
  <text x=\"356\" y=\"108\" font-size=\"20\">θ</text>
  <text x=\"340\" y=\"312\" text-anchor=\"middle\" font-size=\"20\">鉛直平衡：2μFcosθ = 2Fsinθ + mg</text>
</svg>""",
            },
            {
                "title": "光學鑷子光路與動量變化示意圖",
                "svg": """<svg viewBox=\"0 0 680 330\" role=\"img\" aria-label=\"光學鑷子光路與動量變化示意圖\" xmlns=\"http://www.w3.org/2000/svg\">
  <defs><marker id=\"arr10826b\" markerWidth=\"10\" markerHeight=\"10\" refX=\"8\" refY=\"3\" orient=\"auto\"><path d=\"M0,0 L8,3 L0,6 Z\" fill=\"#111827\"/></marker></defs>
  <circle cx=\"340\" cy=\"160\" r=\"78\" fill=\"#fff\" stroke=\"#111827\" stroke-width=\"3\"/>
  <text x=\"340\" y=\"166\" text-anchor=\"middle\" font-size=\"22\">O</text>
  <text x=\"340\" y=\"64\" text-anchor=\"middle\" font-size=\"22\">C</text>
  <line x1=\"340\" y1=\"70\" x2=\"278\" y2=\"228\" stroke=\"#111827\" stroke-width=\"2\" stroke-dasharray=\"8 6\"/>
  <line x1=\"340\" y1=\"70\" x2=\"402\" y2=\"228\" stroke=\"#111827\" stroke-width=\"2\" stroke-dasharray=\"8 6\"/>
  <line x1=\"112\" y1=\"285\" x2=\"278\" y2=\"228\" stroke=\"#0f766e\" stroke-width=\"4\" marker-end=\"url(#arr10826b)\"/>
  <line x1=\"568\" y1=\"285\" x2=\"402\" y2=\"228\" stroke=\"#0f766e\" stroke-width=\"4\" marker-end=\"url(#arr10826b)\"/>
  <line x1=\"278\" y1=\"228\" x2=\"235\" y2=\"96\" stroke=\"#0f766e\" stroke-width=\"4\" marker-end=\"url(#arr10826b)\"/>
  <line x1=\"402\" y1=\"228\" x2=\"445\" y2=\"96\" stroke=\"#0f766e\" stroke-width=\"4\" marker-end=\"url(#arr10826b)\"/>
  <text x=\"130\" y=\"266\" font-size=\"20\">P₃</text><text x=\"530\" y=\"266\" font-size=\"20\">P₄</text>
  <text x=\"225\" y=\"92\" font-size=\"20\">P₃′</text><text x=\"448\" y=\"92\" font-size=\"20\">P₄′</text>
  <line x1=\"170\" y1=\"95\" x2=\"205\" y2=\"40\" stroke=\"#2563eb\" stroke-width=\"3\" marker-end=\"url(#arr10826b)\"/>
  <line x1=\"510\" y1=\"95\" x2=\"475\" y2=\"40\" stroke=\"#2563eb\" stroke-width=\"3\" marker-end=\"url(#arr10826b)\"/>
  <text x=\"138\" y=\"89\" font-size=\"20\">ΔP₃</text><text x=\"500\" y=\"89\" font-size=\"20\">ΔP₄</text>
  <line x1=\"340\" y1=\"160\" x2=\"340\" y2=\"255\" stroke=\"#dc2626\" stroke-width=\"4\" marker-end=\"url(#arr10826b)\"/>
  <text x=\"352\" y=\"250\" font-size=\"22\">F</text>
  <text x=\"340\" y=\"313\" text-anchor=\"middle\" font-size=\"20\">微粒受力方向與光子總動量變化方向相反</text>
</svg>""",
            },
        ],
    },
}

YEAR_110_OVERRIDES = {
    1: ("近代物理", ["生活情境建模", "跨章節概念整合", "文字敘述轉物理量"]),
    2: ("波動與光學", ["生活情境建模", "文字敘述轉物理量"]),
    3: ("力學", ["生活情境建模", "文字敘述轉物理量"]),
    4: ("力學", ["生活情境建模", "文字敘述轉物理量"]),
    5: ("力學", ["跨章節概念整合", "文字敘述轉物理量"]),
    6: ("力學", ["圖表判讀", "跨章節概念整合", "文字敘述轉物理量"]),
    7: ("力學", ["跨章節概念整合", "文字敘述轉物理量"]),
    8: ("波動與光學", ["實驗與素養探究", "圖表判讀", "實驗設計與誤差", "文字敘述轉物理量"]),
    9: ("電磁學", ["實驗與素養探究", "跨章節概念整合", "文字敘述轉物理量"]),
    10: ("電磁學", ["圖表判讀", "跨章節概念整合", "文字敘述轉物理量"]),
    11: ("近代物理", ["跨章節概念整合", "文字敘述轉物理量"]),
    12: ("近代物理", ["生活情境建模", "圖表判讀", "跨章節概念整合", "文字敘述轉物理量"]),
    13: ("波動與光學", ["圖表判讀", "跨章節概念整合", "文字敘述轉物理量"]),
    14: ("波動與光學", ["生活情境建模", "圖表判讀", "文字敘述轉物理量"]),
    15: ("力學", ["生活情境建模", "文字敘述轉物理量"]),
    16: ("近代物理", ["跨章節概念整合", "文字敘述轉物理量"]),
    17: ("波動與光學", ["圖表判讀", "跨章節概念整合", "文字敘述轉物理量"]),
    18: ("熱學", ["生活情境建模", "跨章節概念整合", "文字敘述轉物理量"]),
    19: ("近代物理", ["生活情境建模", "文字敘述轉物理量"]),
    20: ("電磁學", ["生活情境建模", "跨章節概念整合", "文字敘述轉物理量"]),
    21: ("電磁學", ["實驗與素養探究", "實驗設計與誤差", "文字敘述轉物理量"]),
    22: ("力學", ["生活情境建模", "跨章節概念整合", "文字敘述轉物理量"]),
    23: ("波動與光學", ["圖表判讀", "跨章節概念整合", "文字敘述轉物理量"]),
    24: ("電磁學", ["生活情境建模", "跨章節概念整合", "文字敘述轉物理量"]),
}


def rel_url(path):
    return quote(path.relative_to(ROOT).as_posix(), safe="/")


def clean(text):
    return re.sub(r"\s+", " ", text or "").strip()


def page_lines(page):
    fragments = []

    def visitor(text, cm, tm, font, size):
        text = clean(text)
        if text:
            fragments.append((float(tm[4]), float(tm[5]), text))

    page.extract_text(visitor_text=visitor)
    lines = []
    for x, y, text in sorted(fragments, key=lambda item: (-item[1], item[0])):
        for line in lines:
            if abs(line["y"] - y) <= 3.0:
                line["parts"].append((x, text))
                line["y"] = (line["y"] + y) / 2
                break
        else:
            lines.append({"y": y, "parts": [(x, text)]})
    return [
        {
            "y": line["y"],
            "text": "".join(part for _, part in sorted(line["parts"])),
        }
        for line in lines
    ]


def find_nonchoice_starts(pdf_path):
    reader = PdfReader(str(pdf_path))
    candidates = []
    in_nonchoice = False
    for page_index, page in enumerate(reader.pages, start=1):
        for line in page_lines(page):
            text = line["text"]
            if "第貳" in text or "第貳部分" in text or "第 貳 部 分" in text:
                in_nonchoice = True
            if not in_nonchoice:
                continue
            if re.match(r"^一[、.．]", text):
                candidates.append({"label": "一", "page": page_index, "y": line["y"]})
            if re.match(r"^二[、.．]", text):
                candidates.append({"label": "二", "page": page_index, "y": line["y"]})
    first = next((item for item in candidates if item["label"] == "一"), None)
    second = next((item for item in candidates if item["label"] == "二" and first and (item["page"], -item["y"]) > (first["page"], -first["y"])), None)
    if not first:
        last_page = len(reader.pages)
        first = {"label": "一", "page": last_page, "y": float(reader.pages[-1].mediabox.height) - 90}
    if not second:
        second = {"label": "二", "page": first["page"], "y": 260.0}
    return first, second, reader


def crop_nonchoice(pdf_path, year, first, second, reader):
    rendered = {}

    def render(page_no):
        if page_no not in rendered:
            rendered[page_no] = convert_from_path(
                str(pdf_path),
                first_page=page_no,
                last_page=page_no,
                dpi=DPI,
                poppler_path=str(POPPLER_PATH),
            )[0]
        return rendered[page_no]

    year_dir = OUTPUT_ROOT / str(year)
    year_dir.mkdir(parents=True, exist_ok=True)
    results = {}
    segments = [
        (25, first, second),
        (26, second, None),
    ]
    for no, start, next_start in segments:
        images = []
        audits = []
        end_page = next_start["page"] if next_start else len(reader.pages)
        for page_no in range(start["page"], end_page + 1):
            page = reader.pages[page_no - 1]
            image = render(page_no)
            page_w = float(page.mediabox.width)
            page_h = float(page.mediabox.height)
            sx = image.width / page_w
            sy = image.height / page_h
            left = int(45 * sx)
            right = int((page_w - 45) * sx)
            top_pdf = min(page_h - 48, (start["y"] + 18) if page_no == start["page"] else page_h - 82)
            manual_bottom = MANUAL_NONCHOICE_BOTTOMS.get((year, no))
            if manual_bottom and manual_bottom["page"] == page_no:
                bottom_pdf = manual_bottom["bottomPdfY"]
                next_boundary = bottom_pdf
            elif next_start and page_no == next_start["page"]:
                bottom_pdf = min(page_h - 48, next_start["y"] + 14)
                next_boundary = bottom_pdf
            else:
                bottom_pdf = 54
                next_boundary = None
            top = max(0, int((page_h - top_pdf) * sy))
            bottom = min(image.height, int((page_h - bottom_pdf) * sy))
            if bottom <= top + 80:
                continue
            suffix = "" if start["page"] == end_page else f"-p{page_no}"
            out_path = year_dir / f"q{no:02d}{suffix}.png"
            cropped = image.crop((left, top, right, bottom))
            if year == 108 and no == 26:
                draw = ImageDraw.Draw(cropped)
                draw.rectangle((0, 0, cropped.width, 24), fill="white")
            cropped.save(out_path, optimize=True)
            images.append(rel_url(out_path))
            audits.append(
                {
                    "page": page_no,
                    "topPdfY": round(top_pdf, 2),
                    "bottomPdfY": round(page_h - bottom / sy, 2),
                    "nextBoundaryPdfY": round(next_boundary, 2) if next_boundary is not None else None,
                    "nextQuestion": no + 1 if no == 25 else None,
                }
            )
        results[no] = {"images": images, "audit": audits}
    return results


def rubric_chunks(year):
    path = DOWNLOADS / str(year) / "nonChoiceRubric.pdf"
    if not path.exists():
        return {}
    text = "\n".join(page.extract_text() or "" for page in PdfReader(str(path)).pages)
    normalized = clean(text)
    first_match = re.search(r"第\s*一\s*題(.+?)(?=第\s*二\s*題|$)", normalized)
    second_match = re.search(r"第\s*二\s*題(.+)$", normalized)
    return {
        25: clean(first_match.group(1))[:1500] if first_match else normalized[:1200],
        26: clean(second_match.group(1))[:1500] if second_match else normalized[1200:2400],
    }


def infer_unit(text):
    if any(k in text for k in ["比熱", "量熱", "熱", "溫度"]):
        return "熱學"
    if any(k in text for k in ["透鏡", "繞射", "干涉", "聲", "波長", "雷射", "共鳴"]):
        return "波動與光學"
    if any(k in text for k in ["電流", "電阻", "電壓", "磁", "電場", "電位", "光電"]):
        return "電磁學"
    if any(k in text for k in ["斜面", "摩擦", "滑車", "動量", "碰撞", "力矩"]):
        return "力學"
    return "實驗與探究"


def infer_literacy(text):
    hits = ["文字敘述轉物理量"]
    if any(k in text for k in ["實驗", "測量", "數據", "作圖", "儀器", "探討"]):
        hits.append("實驗與素養探究")
    if any(k in text for k in ["圖", "表", "曲線", "作圖", "數據"]):
        hits.append("圖表判讀")
    if any(k in text for k in ["誤差", "測量", "校正", "實驗", "作圖"]):
        hits.append("實驗設計與誤差")
    if any(k in text for k in ["生活", "日常", "熱氣球", "汽車", "聲音", "擴音器"]):
        hits.append("生活情境建模")
    if any(k in text for k in ["推導", "模型", "驗證", "關係", "能量", "電磁", "熱"]):
        hits.append("跨章節概念整合")
    return list(dict.fromkeys(hits))


def ordered_literacy(names):
    unique = set(names)
    if not unique:
        unique.add("文字敘述轉物理量")
    if any(name in unique for name in ["實驗與素養探究", "實驗設計與誤差"]):
        unique.add("實驗與素養探究")
    return [name for name in LITERACY_NAMES if name in unique]


def normalize_literacy(question):
    text = " ".join(
        clean(question.get(key, ""))
        for key in ["questionText", "solution", "commonMistake", "commonMistakes", "keyConcept"]
    )
    hits = []
    for name in question.get("literacyTypes", []) or []:
        if name in LITERACY_NAMES:
            hits.append(name)
        hits.extend(LEGACY_LITERACY_MAP.get(name, []))
    for name, keywords in LITERACY_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            hits.append(name)
    hits.append("文字敘述轉物理量")
    question["literacyTypes"] = ordered_literacy(hits)


def normalize_questions(analysis):
    year = int(analysis["year"])
    for question in analysis.get("questions", []):
        no = int(question.get("no", 0))
        if year == 110 and no in YEAR_110_OVERRIDES:
            unit, literacy = YEAR_110_OVERRIDES[no]
            question["unit"] = unit
            question["literacyTypes"] = literacy
        else:
            normalize_literacy(question)


def solution_from_rubric(year, no, unit, rubric):
    rubric = (
        rubric or ""
    ).replace("題目中", "原題所述").replace("題目中的", "原題所述的").replace("題目給定", "原題給定")
    if rubric:
        return (
            f"本題為 {year} 學年度指考非選擇題第{'一' if no == 25 else '二'}大題。官方評分重點如下："
            + rubric
            + " 作答時需完整列出物理模型、公式推導、代入計算與單位；若需要作圖，需標明座標軸物理量與符號定義。"
        )
    return f"本題為非選擇題，需依題目建立{unit}模型，列出公式推導、計算過程、單位與最後結論。"


def recalc_stats(analysis):
    normalize_questions(analysis)
    unit_counter = Counter(q.get("unit", "未分類") for q in analysis.get("questions", []))
    total = sum(unit_counter.values()) or 1
    analysis["unitStats"] = [
        {"unit": unit, "count": count, "percent": round(count * 100 / total, 1)}
        for unit, count in sorted(unit_counter.items(), key=lambda item: UNIT_ORDER.index(item[0]) if item[0] in UNIT_ORDER else 99)
    ]
    literacy_counter = Counter()
    for q in analysis.get("questions", []):
        for name in q.get("literacyTypes", []):
            literacy_counter[name] += 1
    analysis["literacyTypes"] = [
        {"name": name, "count": literacy_counter.get(name, 0)}
        for name in LITERACY_NAMES
    ]
    inquiry = literacy_counter.get("實驗與素養探究", 0)
    analysis["inquiryQuestionCount"] = inquiry
    analysis["inquiryQuestionPercent"] = round(inquiry * 100 / total, 1)


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    for analysis in data["analysis"]:
        year = int(analysis["year"])
        if not 100 <= year <= 110:
            recalc_stats(analysis)
            continue
        pdf_path = DOWNLOADS / str(year) / "questionPdf.pdf"
        if not pdf_path.exists():
            continue
        first, second, reader = find_nonchoice_starts(pdf_path)
        if year in MANUAL_NONCHOICE_STARTS:
            first, second = MANUAL_NONCHOICE_STARTS[year]
        shot_data = crop_nonchoice(pdf_path, year, first, second, reader)
        rubrics = rubric_chunks(year)
        questions = [q for q in analysis.get("questions", []) if int(q.get("no", 0)) <= 24]
        for no in [25, 26]:
            text = rubrics.get(no, "")
            unit = infer_unit(text)
            literacy = infer_literacy(text)
            special = SPECIAL_NONCHOICE.get((year, no), {})
            questions.append(
                {
                    "no": no,
                    "unit": special.get("unit", unit),
                    "literacyTypes": special.get("literacyTypes", literacy),
                    "answer": "非選擇題",
                    "solution": special.get("solution", solution_from_rubric(year, no, unit, text)),
                    "questionText": f"{year} 學年度指考物理非選擇題第{'一' if no == 25 else '二'}大題，詳見官方試題截圖。",
                    "shotImages": shot_data.get(no, {}).get("images", []),
                    "shotStatus": "auto-cropped-nonchoice",
                    "shotSource": "official-pdf",
                    "shotAudit": shot_data.get(no, {}).get("audit", []),
                    "solutionDiagrams": special.get("solutionDiagrams", []),
                }
            )
        analysis["questions"] = sorted(questions, key=lambda q: int(q["no"]))
        recalc_stats(analysis)
    DATA_PATH.write_text("\ufeff" + json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
