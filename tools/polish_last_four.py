import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"

EXTRA = {
    (106, 6): "再檢查單位：kHz 表示每秒 10³ 次，因此 33 kHz 不是 33 Hz，也不是 33×10⁶ Hz。用 1500 m/s 除以 33000 s⁻¹ 時，單位會留下 m，數值約 0.0455 m，也就是 4.55 cm；在選項中只有 0.045 m 合理。",
    (106, 17): "若誤把磁場大小 100 mT 直接乘面積，得到的是磁通量 Φ，不是感應電動勢。感應電動勢需要磁通量對時間的變化率；平台區雖然磁通量不為零，但斜率為零，因此沒有感應電動勢。",
    (104, 15): "這是充電情境，不是單一電源直接接電阻。充電器必須先克服電池反電動勢 1.5 V，剩下 2.0-1.5=0.5 V 才落在內電阻上。若把 2.0 V 全部除以 2.5 Ω，會得到放大四倍的錯誤電流。",
    (100, 1): "駐波圖中的相鄰節點距離為 λ/2。兩端固定繩長 5.0 m，圖形等分成五段相鄰節點間距，每段是 1.0 m，所以 λ/2=1.0 m，λ=2.0 m。這也與 L=nλ/2 中 n=5 的判斷一致。",
}


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    lookup = {int(a["year"]): a for a in data["analysis"]}
    for (year, no), extra in EXTRA.items():
        q = next(item for item in lookup[year]["questions"] if int(item["no"]) == no)
        q["solution"] = q.get("solution", "").rstrip() + " " + extra
    DATA_PATH.write_text("\ufeff" + json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
