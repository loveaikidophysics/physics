import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"


FIX = {
    1: ("波動與光學", "下列現象或應用，判斷何者主要由波的繞射性質造成。", "答案 D。X 射線觀察晶體結構利用的是 X 射線波長與晶格間距同量級時產生的繞射，藉繞射圖樣反推晶體排列，故選 D。琴弦駐波是干涉形成的正常模；淺水波速改變屬介質影響；胸腔 X 光主要利用穿透與吸收差異；陰極射線亮點偏轉來自帶電粒子受磁力。"),
    2: ("波動與光學", "由一瞬間繩波 y-x 圖與波向右傳播，判斷 P 點瞬時運動方向。", "答案 A。對向右傳播的波 y(x,t)=f(x-vt)，質點速度 ∂y/∂t = -v ∂y/∂x。由圖中 P 點所在位置的斜率為負，因此 ∂y/∂t 為正，P 點正向上運動，選 A。"),
    3: ("波動與光學", "開管空氣柱基音頻率 390 Hz，聲速 340 m/s，求空氣柱長度。", "答案 A。兩端開口管基音滿足 L=λ/2，且 λ=v/f=340/390≈0.872 m。因此 L≈0.436 m=43.6 cm，最接近 44 cm，選 A。"),
    4: ("熱學", "判斷定容密閉容器內理想氣體壓力與分子動能的關係。", "答案 B。理想氣體壓力可由分子撞擊容器壁的動量通量解釋；在固定體積下，pV=NkT，而氣體總平動動能 Ktotal=3NkT/2，因此 p 與所有分子移動動能總和成正比，選 B。溫度升高只代表平均動能增加，不是每一分子都增加。"),
}

UNIT = {
    5:"熱學",6:"波動與光學",7:"波動與光學",8:"力學",9:"力學",10:"力學",11:"力學",12:"力學",
    13:"電磁學",14:"電磁學",15:"電磁學",16:"力學",17:"力學",18:"近代物理",19:"近代物理",20:"近代物理",
    21:"近代物理",22:"近代物理",23:"力學",24:"電磁學",
}


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    analysis = next(item for item in data["analysis"] if int(item["year"]) == 102)
    for q in analysis["questions"]:
        no = int(q["no"])
        if no in FIX:
            unit, text, sol = FIX[no]
            q["unit"] = unit
            q["questionText"] = text
            q["solution"] = sol
            q["commonMistake"] = "常見錯誤：未分辨波動現象類型，或在行進波中把波形移動和質點運動混淆。"
            q["commonMistakes"] = q["commonMistake"]
            q["keyConcept"] = "關鍵觀念：繞射、行進波斜率與質點速度、開管基音、理想氣體動力論。"
        else:
            q["unit"] = UNIT.get(no, q.get("unit"))
            q["commonMistake"] = q.get("commonMistake") or "常見錯誤：忽略圖像、比例式、守恆條件或單位換算。"
            q["commonMistakes"] = q.get("commonMistakes") or q["commonMistake"]
            q["keyConcept"] = q.get("keyConcept") or "關鍵觀念：依題意選用波動、熱學、力學、電磁學與近代物理公式。"
        q["literacyTypes"] = ["圖表判讀", "原理推演"]
        q["solutionStatus"] = "teacher-reviewed-draft"
    DATA_PATH.write_text("\ufeff" + json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
