import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"

APPENDS = {
    (102, 16): "比例推導完整寫法為 (T行/T地)²=(r行/r地)³=10³，所以 T行/T地=√1000=10√10；選項中 32 年最接近 31.6 年。",
    (102, 18): "若以維恩位移定律表示，熱輻射峰值滿足 λmaxT=常數；鎢絲溫度改變時整段連續光譜跟著移動，這正是黑體輻射的特徵。",
    (102, 19): "若將條件改寫成角動量，L = r p = r·nh/(2πr)=nh/(2π)，也回到波耳角動量量子化，與物質波模型一致。",
    (101, 21): "逐項判斷：靜止與等速度直線運動皆可令 a=0；等加速度、拋物線與自由落體分別需要固定非零加速度或重力加速度，因此列為不可能。",
    (100, 17): "所以本題不需要使用球面電位差 1.0×10³ V 計算；該電位資料是給第 18 題求總電量使用，對導體內部電場判斷沒有影響。",
}


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    changed = 0
    for analysis in data["analysis"]:
        year = int(analysis["year"])
        for question in analysis.get("questions", []):
            key = (year, int(question["no"]))
            addition = APPENDS.get(key)
            if addition and addition not in question.get("solution", ""):
                question["solution"] = question.get("solution", "").rstrip("。") + "。" + addition
                changed += 1
    DATA_PATH.write_text(
        "\ufeff" + json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"appended {changed} final quality fixes")


if __name__ == "__main__":
    main()
