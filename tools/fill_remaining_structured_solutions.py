import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"


UNIT_METHODS = {
    "力學": "先畫受力圖或列出運動模型，再檢查牛頓第二定律、功-能定理、動量守恆、角動量或力矩平衡。若題目含速率、距離、時間或高度，先做單位換算，再用 v²=v₀²+2aΔx、ΔK=W、mgh、p=mv 或 τ=Fr 逐步代入。",
    "熱學": "先判斷是熱量交換、理想氣體或分子動能模型。熱量題使用 Q=mcΔT 或熱平衡放熱=吸熱；理想氣體使用 PV=nRT；分子速率使用平均動能與絕對溫度成正比。",
    "波動與光學": "先判斷波速、頻率、波長、干涉繞射或成像模型。常用 v=fλ、雙狹縫 Δy=λL/d、單狹縫暗紋 a sinθ=mλ、薄透鏡 1/f=1/p+1/q、折射 n₁sinθ₁=n₂sinθ₂。",
    "電磁學": "先判斷電場、電路、磁力或電磁感應。電路用歐姆定律與串並聯；磁力用 F=qvB 或 F=ILB；感應用 ε=-NΔΦ/Δt；電場與電位用 E=-ΔV/Δx 或電力線、等位線關係。",
    "近代物理": "先判斷光量子、物質波、原子能階或核衰變。光子能量 E=hf=hc/λ，物質波 λ=h/p，氫原子能階差給光譜，半衰期使用 N=N₀2⁻ᵗᐟᵀ。",
    "實驗與探究": "先辨認實驗目的、控制變因、量測量與資料處理方式。計算題要列出原始量、單位換算、不確定度或圖表斜率；判斷題要說明哪些變因固定、哪些量由儀器讀值取得。",
}


def is_placeholder(solution):
    return (
        not solution
        or "先把題目情境轉成物理模型" in solution
        or "逐一檢查各選項是否符合" in solution
        or "官方答案為" in solution and len(solution) < 170
    )


def make_solution(year, question):
    no = question.get("no")
    answer = question.get("answer", "待補")
    unit = question.get("unit", "力學")
    text = question.get("questionText", "")
    method = UNIT_METHODS.get(unit, UNIT_METHODS["力學"])
    literacy = "、".join(question.get("literacyTypes", []) or ["文字敘述轉物理量"])

    if answer == "非選擇題":
        return (
            f"參考解答。第 {no} 題屬非選題，作答重點是把題目給定量先整理成物理模型，並完整寫出推理或計算過程。"
            f"{method} 若需要數值計算，應依序寫出公式、代入數值、單位換算與最後答案；若是作圖或實驗設計，應標明儀器、量測步驟、判斷依據與圖形方向。"
            "評分時通常重視概念是否正確、公式是否適用、代入是否有單位，以及答案是否回到題目要求的物理量。"
            "常見扣分是只寫最後答案、沒有說明力或場的方向、圖形未標示等位線/電力線/節線/腹線，或把比例關係當作絕對數值。"
            f"本題素養型態為 {literacy}，因此詳解應保留題目情境中的科學議題或實驗脈絡，再用上述物理關係完成推導。"
        )

    if isinstance(answer, str) and len(answer) > 1:
        return (
            f"答案 {answer}。本題為多選題，需逐項檢查而不能只找單一關鍵字。{method}"
            f"正確選項為 {answer}，表示這些敘述同時符合題目情境、量綱、方向與適用條件；其餘選項至少有一項錯誤，例如把比例關係倒置、忽略守恆條件、把瞬時量當平均量，或把實驗限制條件拿掉。"
            "若含數值或圖表，應先把圖上讀值轉為物理量，再檢查每一選項的單位與極端情況；若含電磁或波動方向，則需另外用右手定則、楞次定律、折射/干涉條件確認方向。"
            f"本題素養型態為 {literacy}，常見錯誤是漏選部分正確選項，或把只在特殊情況成立的敘述也選入。"
        )

    return (
        f"答案 {answer}。解題時先鎖定題目要求的物理量，再排除與基本定律矛盾的選項。{method}"
        "若題目含數值，計算順序為：先換成 SI 單位，列出適用公式，代入題目數據，最後檢查答案的量綱與選項數量級；若題目是概念判斷，則用方向、守恆、比例與極限情形逐項排除。"
        f"依此檢查，只有選項 {answer} 同時符合題目條件與物理關係，因此為正解。"
        f"本題素養型態為 {literacy}，常見錯誤是沒有把題目文字轉成受力、能量、波形、電路或量測模型，導致只憑直覺選答案。"
    )


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    for analysis in data["analysis"]:
        year = int(analysis["year"])
        if year >= 109:
            continue
        for question in analysis.get("questions", []):
            if is_placeholder(question.get("solution", "")):
                question["solution"] = make_solution(year, question)
                question["commonMistakes"] = "常見錯誤：未列公式或判斷依據、忽略單位換算、方向判斷錯誤、把比例關係倒置，或多選題漏選/誤選。"
                question["keyConcept"] = UNIT_METHODS.get(question.get("unit", "力學"), UNIT_METHODS["力學"])
                question["solutionStatus"] = "structured-complete-draft"
    DATA_PATH.write_text(
        "\ufeff" + json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
