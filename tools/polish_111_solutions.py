import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"


REPLACE = {
    8: "答案 B。放射性衰變剩餘數 N=N₀(1/2)^(t/T₁/₂)。初始 ²³⁵U 與 ²³⁸U 數量相同，經 t=5.94×10⁹ 年後，比值為 N₂₃₅/N₂₃₈=(1/2)^(5.94/0.704)/(1/2)^(5.94/4.47)=(1/2)^(8.44-1.33)≈(1/2)⁷·¹¹，最接近 2⁻⁷，選 B。物理意義是 ²³⁵U 半衰期較短，所以經過相同時間後剩得較少；不能只比較現在半衰期大小，必須把經歷時間換成各自經過幾個半衰期。",
}


APPEND = {
    4: " 量級檢查也很重要：8.4 J 分給 2.0 kg 的水，每 1 K 需要約 8400 J，所以溫升必只有 10⁻³ K 等級。若得到 0.10 K 或 1.0 K，通常是把 kJ 當成 J、把 2.0 L 的水質量誤當 0.002 kg，或忘記兩個重錘的總能量。",
    5: " 法拉第定律判斷的是穿過線圈面的磁通量，而不是線圈包圍的幾何面積單獨決定。若磁場平行線圈平面，磁場向量與面積向量夾角為 90°，所以 Φ=0。即使甲、乙周長不同、電阻不同，ε 都為 0，因此 I 都為 0；這就是 B 成立而 A、C、D、E 不成立的原因。",
    16: " 平板視深公式可由光線在平板內折射後出射仍與入射光平行推得，物點看起來向平板方向移動 Δ=t-t/n=t(1-1/n)。此位移與板後格線實際距離無關，所以所有水平格線同量平移。若量得 Δ/t，令 k=Δ/t，則 k=1-1/n，得 n=1/(1-k)，因此可由位移與厚度比決定折射率。",
    21: " 若選 L₁，望遠鏡位於地球內側，面向宇宙觀測時太陽與地球的相對方向不如 L₂ 集中，遮陽與隔熱設計較不利；而且地球可能遮擋較多天空方向。L₂ 的優勢不是距離地球最近，而是熱源大致集中在同一側、背景輻射與高能粒子干擾較低、可長時間穩定觀測廣大天空區域。非選作答時列兩項並說明原因即可。",
    23: " 其原理是光電方程 eV₀=hf-ϕ。對同一金屬而言功函數 ϕ 固定，所以改變入射光頻率 f 後，量到的截止電壓 V₀ 會隨 f 呈線性變化：V₀=(h/e)f-ϕ/e。實驗上不是調光強度來求 h/e；光強主要影響光電流大小，截止電壓由最大光電子動能決定。必須調反向電壓使光電流剛好為零，才取得 V₀。",
    25: " 若套用第一極小 sinθ=λ/a，會得到 sinθ>1，表示沒有第一極小角，聲音不會被限制在較窄角度內，而是高度繞射。這正是小開口相對於長波長的典型結果。若誤用 θ≈λ/a 的小角近似，會得到大於 1 的無意義數值；此時應回到題幹說明，判斷張角為 180°。",
}


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    analysis = next(item for item in data["analysis"] if int(item["year"]) == 111)
    for question in analysis["questions"]:
        no = int(question["no"])
        if no in REPLACE:
            question["solution"] = REPLACE[no]
        if no in APPEND and APPEND[no] not in question["solution"]:
            question["solution"] += APPEND[no]
    DATA_PATH.write_text(
        "\ufeff" + json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
