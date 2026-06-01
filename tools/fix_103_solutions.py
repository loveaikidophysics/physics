import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"


FIRST_THREE = {
    1: ("波動與光學", "在吉他空腔圓孔前吹奏特定頻率聲音，判斷吉他弦振動的主要物理現象。", "答案 E。外來聲波頻率若接近吉他空腔或琴弦的自然頻率，系統吸收能量的效率大增，即使不直接撥弦也會使琴身與弦產生明顯振動，這是共鳴現象。回聲、反射、折射與繞射都不能解釋特定頻率造成振幅顯著增大的特徵。"),
    2: ("近代物理", "核反應爐注入硼酸可停止連鎖反應，判斷硼酸主要吸收的粒子。", "答案 C。核分裂連鎖反應由中子撞擊燃料核後再產生更多中子維持。硼酸中的硼具有很大的中子吸收截面，可吸收熱中子，降低有效中子數，使連鎖反應停止。因此應選中子，C。"),
    3: ("熱學", "氦氣與氮氣經速度選擇閥逸出後重新熱平衡，判斷分壓與分子數變化。", "答案 C。速度選擇閥讓速率高於 400 m/s 的分子逸出。同溫下 vrms = √(3RT/M)，氦分子量小，速率分布較偏高速，因此氦逸出比例較高，留在鋼瓶中的氦分子數減少較多。重新熱平衡後兩氣體溫度相同；同體積同溫下分壓 p=nRT/V 與莫耳數成正比，所以氮氣分壓較氦氣高，選 C。"),
}

UNIT_FIX = {
    4: "電磁學", 5: "力學", 6: "波動與光學", 7: "波動與光學",
    8: "近代物理", 9: "電磁學", 10: "熱學", 11: "力學",
    12: "力學", 13: "力學", 14: "熱學", 15: "力學",
    16: "力學", 17: "力學", 18: "實驗與探究", 19: "波動與光學",
    20: "電磁學", 21: "近代物理", 22: "近代物理", 23: "力學", 24: "電磁學",
}


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    analysis = next(item for item in data["analysis"] if int(item["year"]) == 103)
    for q in analysis["questions"]:
        no = int(q["no"])
        if no in FIRST_THREE:
            unit, text, sol = FIRST_THREE[no]
            q["unit"] = unit
            q["questionText"] = text
            q["solution"] = sol
            q["commonMistake"] = "常見錯誤：只看關鍵字而未判斷真正控制現象的物理機制。"
            q["commonMistakes"] = q["commonMistake"]
            q["keyConcept"] = "關鍵觀念：共鳴、中子連鎖反應控制、理想氣體速率分布與分壓。"
        else:
            q["unit"] = UNIT_FIX.get(no, q.get("unit"))
            q["commonMistake"] = q.get("commonMistake") or "常見錯誤：未先確認物理模型與題目問法，導致套用錯誤公式。"
            q["commonMistakes"] = q.get("commonMistakes") or q["commonMistake"]
            q["keyConcept"] = q.get("keyConcept") or "關鍵觀念：依題型使用電場、磁場、熱量、動量、能量、波動與近代物理模型。"
        q["literacyTypes"] = ["圖表判讀", "原理推演"]
        q["solutionStatus"] = "teacher-reviewed-draft"
    DATA_PATH.write_text("\ufeff" + json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
