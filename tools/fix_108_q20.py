import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    analysis = next(item for item in data["analysis"] if int(item["year"]) == 108)
    question = next(item for item in analysis["questions"] if int(item["no"]) == 20)
    question["unit"] = "力學"
    question["literacyTypes"] = ["圖表判讀", "生活情境建模", "文字敘述轉物理量"]
    question["questionText"] = (
        "第19-20題為題組。汽車由靜止出發，在前300 m的加速度a與位置x關係如圖7："
        "0<x<100 m 時 a=1.5 m/s²；100<x<200 m 時 a由1.5 m/s²線性降至0；"
        "200<x<300 m 時 a=0。第20題問前300 m路途中汽車最大速率約為多少 m/s？"
    )
    question["solution"] = (
        "答案 D。汽車由靜止出發，且加速度在 0<x<200 m 皆為正、200<x<300 m 為 0，"
        "所以速率在前 200 m 增加，之後維持定值；最大速率出現在 x=200 m 以後。"
        "因加速度是位置的函數，使用 v dv/dx=a，積分得 1/2 v²=∫a dx，"
        "也就是 v²=2×加速度-位置圖下面積。圖7中 0 到 100 m 面積為 1.5×100=150；"
        "100 到 200 m 為三角形，面積為 1/2×100×1.5=75。總面積為 225 m²/s²。"
        "因此 v_max²=2×225=450，v_max=√450≈21.2 m/s，最接近 21 m/s，選 D。"
        "常見錯誤是把 a-x 圖誤當 a-t 圖，直接用面積當速度變化；本題橫軸是位置，"
        "必須用 v²=v₀²+2∫a dx 的形式。"
    )
    question["commonMistakes"] = "把加速度-位置圖誤當加速度-時間圖；或只算第一段矩形面積，漏掉100到200 m的三角形面積。"
    question["keyConcept"] = "變加速度直線運動；a(x)=v dv/dx；v²=v₀²+2∫a dx；圖下面積判讀。"
    question["solutionStatus"] = "teacher-reviewed-draft"
    DATA_PATH.write_text(
        "\ufeff" + json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
