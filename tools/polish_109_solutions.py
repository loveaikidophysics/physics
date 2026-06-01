import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"


APPEND = {
    2: " 單位換算是本題關鍵：1 μW=10⁻⁶ W，1 nm=10⁻⁹ m。也可合併寫成 N=Itλ/(hc)=6600×10⁻⁶×2.0×253.7×10⁻⁹/(6.63×10⁻³⁴×3.0×10⁸)≈1.7×10¹⁶。若忘記每平方公分或把 μW 當 W，會差 10⁶ 倍。",
    3: " 量級上，X 射線頻率 10¹⁶～10²⁰ Hz，波長 λ=c/f 約為 3×10⁻⁸～3×10⁻¹² m，與晶格間距同量級，才適合晶體繞射。0.1 mm=10⁻⁴ m，遠大於 X 射線波長，因此一般雙狹縫幾何不適合。X 射線不帶電，受電場磁場力 F=q(E+v×B)=0，這是 C 正確的核心。",
    10: " 若用氣體動力論表示，1/2m⟨v²⟩=3/2kT，因此 v_rms=√⟨v²⟩∝√T。題目雖然提到體積改變，但定量理想氣體在熱平衡時分子平均動能只由 T 決定。T′=4T 時，v′/v=√(T′/T)=√4=2。",
    12: " 代入時應使用導線到行人的垂直距離 r，而不是行人到電線兩端的距離。計算形式為 B_wire/B_E=[μ₀I/(2πr)]/B_E。依題目數值代入得到約 0.4，表示此磁場小於地磁但同一量級；若把 μ₀=4π×10⁻⁷ T·m/A 中的 2π 約掉錯誤，常會誤選 4.0 或 0.04。",
    17: " 動量守恆以向量相加表示：p⃗甲=p⃗乙+p⃗丙。題圖中乙、丙軌跡彎曲方向顯示兩者電性相反，動量方向分別沿各自軌跡切線；在反應點作向量三角形，可由半徑比得到兩邊為 5 與 3，合向量為 8。又因 |q乙|=|q丙| 且 B 相同，p∝r，所以比值為 8:5:3。",
    24: " 楞次定律可寫成感應磁場總是反抗磁通量變化：甲區 ΔΦ_in 增加，所以 B_ind 指出紙面；乙區 ΔΦ_in 減少，所以 B_ind 指入紙面。磁力密度方向可由 dF=I dℓ×B 判斷，左右兩側渦電流受力形成與原逆時針轉動相反的力矩 τ，機械轉動能因渦電流焦耳熱 P=I²R 而耗散，但直接使角速度下降的是反向磁力矩。",
}


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    analysis = next(item for item in data["analysis"] if int(item["year"]) == 109)
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
