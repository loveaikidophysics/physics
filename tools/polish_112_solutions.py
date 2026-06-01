import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"


APPEND = {
    5: " 檢查選項時，(A)(B)(C) 都含有不該出現的 M 或自然長度 l，表示把單擺質量或彈簧自然長度誤列為週期因素；(D) 的量綱為 (m)(N/m)/kg=m/s²，但使用了 l 而非擺長 L，物理量來源錯誤。只有 Lk/m 同時符合週期推導與量綱 m/s²。",
    6: " 若選 (A) 或 (B)，代表 v₀ 只讓飛行時間等於 τ 或 2τ，空中球數不足；(C) 的 3τ 也不足以保證至少四顆同時在空中。由 T>4τ 推得的 v₀ 下限再代回 h=v₀²/(2g)，才能得到題目要求的最高點高度下限。",
    8: " 也可由能量守恆寫成初態 mgh=任一時刻 K+U_s。彈簧尚未壓縮時 U_s=0，故 K 最大為 mgh；開始壓縮後 U_s 增加，K 必減少。終點 K=0，U_s=mgh，因此彈簧作功為 -mgh，這也排除 (B)(C) 的敘述。",
    11: " 相位差與路徑差的關係為 Δφ=2πΔL/λ。相消需要 Δφ=(2m+1)π，因此 ΔL=(m+1/2)λ。代入 λ=1.0 m，m=0 時 ΔL=0.50 m；若 ΔL=1.0 m 或 2.0 m，則 Δφ=2π 或 4π，反而是相長干涉。",
    16: " 對圓軌道而言，若瞬時近似圓軌道，v=√(GM/r)，高度下降時速率可能增加，但這不代表力學能增加，因 E=-GMm/(2r)，r 變小時 E 更負。阻力矩 τ=r×F_drag 與角動量方向相反，所以角動量量值下降；這是判斷 (B)(C)(E) 的核心。",
    20: " 判斷原理是：強作用主要束縛核子，電磁作用支配帶電粒子的電磁力，重力在核反應尺度極弱；而 β 衰變與微中子的產生是弱交互作用的典型特徵。本題反應含正電子與微中子，所以不是單純的強作用或電磁作用，而應填弱作用。作答時可寫「弱作用（力）」、「弱力」、「弱核力」或「弱交互作用（力）」；若寫核力但沒有指出弱交互作用，容易與強核力混淆，不能完整對應微中子產生的機制。",
    21: " 單位檢查也相符：E/c 的單位為 J/(m s⁻¹)=N m·s/m=N s=kg m s⁻¹，正是動量單位。若只寫 E=hf 而未連到 p=h/λ，會少掉題目要求的『由動量與波長關係出發』；若寫 p=hf，則單位為能量而非動量。完整答案需呈現 p=h/λ、λ=c/f、p=hf/c=E/c 三步。",
}


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    analysis = next(item for item in data["analysis"] if int(item["year"]) == 112)
    for question in analysis["questions"]:
        no = int(question["no"])
        if no in APPEND and APPEND[no] not in question["solution"]:
            question["solution"] += APPEND[no]
    DATA_PATH.write_text(
        "\ufeff" + json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
