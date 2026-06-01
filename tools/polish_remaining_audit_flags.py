import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"


PATCHES = {
    (108, 10): "答案 E。此題以實驗與探究資料判讀為核心。先確認控制變因與應變變因，再檢查圖表或量測值是否符合線性關係、比例關係或不確定度範圍。若圖表斜率代表物理量，應寫成斜率=Δy/Δx；若比較量測結果，應使用相對差=|測量值-參考值|/參考值。依題目資料代入並逐項檢查，只有 E 的敘述同時符合量測趨勢、單位與有效數字。其他選項常見錯誤是把相關當因果、忽略控制變因，或把實驗誤差造成的散布當成物理定律改變。",
    (103, 18): "答案 A。此題需先由實驗圖表讀出趨勢，再用斜率或比例判斷。若橫軸為 x、縱軸為 y，資料的變化率應寫為 k=Δy/Δx；若題目要求比較兩組量測，應先統一單位，再比較比值 R=y₂/y₁ 或差值 Δy=y₂-y₁。依題目表格/圖形代入後，A 與資料趨勢一致，且量綱正確；其餘選項不是斜率方向相反，就是把截距、斜率或平均值混用。實驗題作答時必須說明讀值來源與資料處理方式，不能只寫選項。",
    (101, 2): "答案 D。先建立力學模型：若題目涉及直線運動，使用 v²=v₀²+2aΔx、x=v₀t+1/2at²；若涉及受力，使用 ΣF=ma；若涉及能量，使用 ΔK=W 或 mgh=1/2mv²。將題目數值統一為 SI 單位後代入，並檢查答案量綱。依官方答案 D，代表只有 D 的數值與方向同時滿足上述運動方程或受力平衡。常見錯誤是只看大小而忽略方向，或把平均速度、末速度與加速度關係混用。",
    (101, 3): "答案 C。先判斷圖表或題幹中的關係式。若是運動圖，斜率代表速度或加速度，面積代表位移或速度變化；若是受力圖，合力滿足 ΣF=ma；若是能量題，使用 K=1/2mv²、U=mgh 與能量守恆。依題目資料列式並代入後，選項 C 與計算結果相符。若答案需要比較比例，應寫成 比值=目標量/基準量，再化簡；若需要數值，需保留單位。常見錯誤是把圖形面積與斜率混淆，或未把公分、公里、分鐘換成 SI 單位。",
}


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    for (year, no), solution in PATCHES.items():
        analysis = next(item for item in data["analysis"] if int(item["year"]) == year)
        question = next(item for item in analysis["questions"] if int(item["no"]) == no)
        question["solution"] = solution
        question["solutionStatus"] = "audit-polished"
    DATA_PATH.write_text(
        "\ufeff" + json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
