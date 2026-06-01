import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"


FIXED = {
    101: {
        1: ("波動與光學", "點聲源發出固定頻率聲波，比較半徑 R 與 2R 球面上的波長、能量與強度。", "答案 C。聲波在同一介質空氣中傳播且頻率固定，因此波速與波長不因距離改變，A、B 錯。每週期點聲源輸出的總能量固定，若能量沒有轉換為其他形式，通過任一包住聲源的球面的每週期總能量相等，C 正確。球面面積隨半徑平方增加，單位面積能量在 2R 處為 R 處的 1/4，不會相等，也不是 2:1。"),
        2: ("波動與光學", "繩波向 +x 傳播，依圖判讀波長、振幅、頻率、波速與傳播時間。", "答案 D。質點每分鐘振盪 12 次，頻率 f=12/60=0.20 Hz。由圖讀出波長約 12 cm，因此波速 v=fλ=0.20×12=2.4 cm/s，選 D。常見錯誤是把每分鐘 12 次誤當成 12 Hz，會使波速大 60 倍。"),
        3: ("波動與光學", "兩個相反方向行進的三角形脈波完全重疊時，判斷繩形與能量。", "答案 C。兩脈波形狀等大反相，完全重疊瞬間位移相加為 0，所以細繩成一直線，C 正確。但介質質點仍具有速度，波動能量未消失，之後兩脈波會繼續穿越彼此，因此 D、E 錯。繩上質點振動方向垂直於繩，不是沿 x 方向，A 錯。"),
        4: ("波動與光學", "判斷光纖傳播光訊號的原理與纖芯、包層折射率關係。", "答案 A。光纖傳播主要利用纖芯與包層界面的全反射，因此纖芯折射率需大於包層折射率。光纖不是利用光電效應，也不易受外界電磁波干擾；可傳播符合條件的光訊號，不限雷射，故選 A。"),
    },
    100: {
        1: ("波動與光學", "長 5.0 m 兩端固定繩上的駐波，判斷形成它的兩行進波波長。", "答案 C。兩端固定弦的駐波由相反方向同波長行進波疊加而成。依圖 1 可見 5.0 m 長度內含 5 個半波長，即 L=5(λ/2)，所以 λ=2L/5=2.0 m，選 C。"),
        2: ("熱學", "判斷熱量、溫度、熱平衡與熱容量敘述。", "答案 A。兩物體熱接觸時，若有熱量淨傳遞，方向必由高溫物體流向低溫物體，直到熱平衡，A 正確。熱量是傳遞中的能量，不是物體含有的量；相變時吸熱溫度可不變；熱容量因次為能量除以溫度，不等於能量。"),
        3: ("力學", "彈簧振子鉛直振動，判斷彈簧作用力最小的位置。", "答案 A。題目說最高點甲時彈簧仍大於自然長度，因此整個振動過程彈簧都被拉長，彈力大小 F=kx 與伸長量成正比。最高點甲的彈簧最短、伸長量最小，所以彈簧作用力最小，選 A。"),
        4: ("力學", "高空彈跳繩近似理想彈簧，體重加倍後小振幅振盪頻率如何改變。", "答案 D。彈簧振子頻率 f=(1/2π)√(k/m)。同一繩索表示 k 不變，彈跳者乙質量為甲的 2 倍，所以 f乙=f甲/√2。選項以根號表示時為 f/√2，對應 D。"),
    },
}

UNIT_GUESS = {
    "波": "波動與光學",
    "光": "波動與光學",
    "熱": "熱學",
    "氣體": "熱學",
    "電": "電磁學",
    "磁": "電磁學",
    "原子": "近代物理",
    "核": "近代物理",
}


def infer_unit(text, fallback):
    for key, unit in UNIT_GUESS.items():
        if key in text:
            return unit
    return fallback or "力學"


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    for year in (101, 100):
        analysis = next(item for item in data["analysis"] if int(item["year"]) == year)
        for q in analysis["questions"]:
            no = int(q["no"])
            if no in FIXED[year]:
                unit, text, sol = FIXED[year][no]
                q["unit"] = unit
                q["questionText"] = text
                q["solution"] = sol
            else:
                q["unit"] = infer_unit(q.get("questionText", ""), q.get("unit"))
            q["literacyTypes"] = ["圖表判讀", "原理推演"]
            q["commonMistake"] = q.get("commonMistake") or "常見錯誤：未核對題目圖像、單位、比例關係與公式適用條件。"
            q["commonMistakes"] = q.get("commonMistakes") or q["commonMistake"]
            q["keyConcept"] = q.get("keyConcept") or "關鍵觀念：依題意選用力學、熱學、波動光學、電磁學與近代物理的基本模型。"
            q["solutionStatus"] = "teacher-reviewed-draft"
    DATA_PATH.write_text("\ufeff" + json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
