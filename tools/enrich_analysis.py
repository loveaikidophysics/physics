import json
import re
from collections import Counter
from pathlib import Path

from docx import Document
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"
EXTRACTED = ROOT / "data" / "extracted"


UNIT_KEYWORDS = [
    ("近代物理", ["量子", "光電", "德布羅意", "波耳", "原子", "原子核", "核衰變", "半衰期", "輻射", "光子", "電子伏特", "宇宙", "紅移", "微波背景"]),
    ("熱學", ["熱", "溫度", "氣體", "莫耳", "分子", "速率分布", "比熱", "熱量", "熱平衡", "壓力", "體積", "內能", "熵", "焦耳"]),
    ("波動與光學", ["波", "聲", "駐波", "干涉", "繞射", "頻率", "波長", "折射", "反射", "透鏡", "光柵", "都卜勒", "水波", "光譜"]),
    ("電磁學", ["電", "磁", "電場", "磁場", "電流", "電阻", "電容", "電壓", "電動勢", "感應", "線圈", "洛侖茲", "庫侖", "安培", "伏特"]),
    ("實驗與探究", ["實驗", "測量", "誤差", "圖表", "數據", "斜率", "校正", "儀器", "作圖", "判讀", "量熱器"]),
    ("力學", ["力", "質量", "加速度", "速度", "動能", "位能", "動量", "碰撞", "圓周", "軌道", "重力", "彈簧", "摩擦", "力矩", "平衡", "拋", "衛星", "滑輪"]),
]

LITERACY_KEYWORDS = [
    ("實驗與素養探究", ["實驗", "探究", "測量", "誤差", "儀器", "校正", "量熱器", "操作", "控制變因", "散射", "數據", "圖表", "曲線", "斜率", "推論", "判讀"]),
    ("圖表判讀", ["圖", "曲線", "表格", "圖表", "關係圖", "分布圖", "數據", "斜率", "面積"]),
    ("實驗設計與誤差", ["實驗", "測量", "誤差", "儀器", "校正", "量熱器", "操作"]),
    ("生活情境建模", ["汽車", "單車", "腳踏車", "棒球", "電扶梯", "地震", "樂器", "衛星", "起重機", "職棒", "水波槽"]),
    ("跨章節概念整合", ["題組", "同時", "綜合", "能量", "動量", "電磁", "熱", "實驗"]),
    ("文字敘述轉物理量", ["何者", "多少", "量值", "大小關係", "正比", "至少", "約為", "判斷"]),
]

UNIT_CONCEPTS = {
    "力學": "受力圖、牛頓運動定律、能量守恆、動量守恆、圓周運動或力矩平衡",
    "熱學": "熱量守恆、理想氣體模型、分子動能與溫度關係、熱力學第一定律",
    "波動與光學": "波速 v=fλ、駐波條件、干涉/繞射條件、幾何光學成像關係",
    "電磁學": "庫侖定律、電路定律、磁力與電磁感應、磁通量變化",
    "近代物理": "量子化、光電效應、物質波、原子與核物理、天文觀測概念",
    "實驗與探究": "控制變因、圖表斜率/截距、有效數字、誤差來源與資料判讀",
}

SCI_TECH_TOPICS = [
    ("量子科學與量子科技", ["量子", "海森堡", "薛丁格", "普朗克", "德布羅意", "波耳", "光電"]),
    ("原子結構與核物理", ["拉塞福", "α粒子", "原子核", "核衰變", "半衰期", "輻射"]),
    ("天文觀測與宇宙學", ["宇宙", "紅移", "微波背景", "JWST", "韋伯", "望遠鏡", "L2"]),
    ("熱力學與能源轉換", ["量熱器", "熱平衡", "比熱", "熱量", "焦耳", "溫度", "氣體"]),
    ("波動、聲學與地震科學", ["地震", "水波槽", "聲波", "駐波", "波速", "頻率", "波長"]),
    ("電磁科技與電路應用", ["電路", "電流", "電阻", "線圈", "磁場", "電磁感應", "感應電動勢"]),
    ("交通、運動與工程情境", ["汽車", "單車", "腳踏車", "棒球", "起重機", "電扶梯", "滑輪"]),
    ("資料判讀與實驗量測", ["實驗", "測量", "誤差", "儀器", "校正", "數據", "圖表", "曲線", "斜率", "判讀"]),
]


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path, payload):
    path.write_text("\ufeff" + json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def clean_text(text):
    return re.sub(r"\s+", " ", (text or "")).strip()


def docx_lines(path):
    doc = Document(path)
    lines = []
    for paragraph in doc.paragraphs:
        text = clean_text(paragraph.text)
        if text:
            lines.append(text)
    return lines


def pdf_text(path):
    reader = PdfReader(str(path))
    chunks = []
    for page in reader.pages:
        chunks.append(page.extract_text() or "")
    return "\n".join(chunks)


def save_extracted(year, name, text):
    folder = EXTRACTED / str(year)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / f"{name}.txt").write_text(text, encoding="utf-8")


def answer_key(year):
    path = ROOT / "downloads" / str(year) / "choiceAnswer.pdf"
    text = pdf_text(path)
    save_extracted(year, "choiceAnswer", text)
    answers = {}
    for no, ans in re.findall(r"(?<!\d)(\d{1,2})\s+([A-E]{1,5}|／|/)(?![A-Za-z])", text):
        n = int(no)
        if 1 <= n <= 40:
            answers[n] = "非選擇題" if ans in {"／", "/"} else ans
    return answers


def split_questions_from_lines(lines):
    questions = {}
    current = None
    buffer = []
    for line in lines:
        match = re.match(r"^(\d{1,2})[.、．]\s*(.+)", line)
        if match:
            if current is not None:
                questions[current] = clean_text(" ".join(buffer))
            current = int(match.group(1))
            buffer = [match.group(2)]
        elif current is not None:
            if re.match(r"^\([A-E]\)", line) or len(buffer) < 12:
                buffer.append(line)
    if current is not None:
        questions[current] = clean_text(" ".join(buffer))
    return questions


def question_texts(year):
    folder = ROOT / "downloads" / str(year)
    docx = folder / "questionDocx.docx"
    if docx.exists():
        lines = docx_lines(docx)
        save_extracted(year, "questionDocx", "\n".join(lines))
        return split_questions_from_lines(lines)
    pdf = folder / "questionPdf.pdf"
    if pdf.exists():
        text = pdf_text(pdf)
        save_extracted(year, "questionPdf", text)
        lines = [clean_text(line) for line in text.splitlines() if clean_text(line)]
        return split_questions_from_lines(lines)
    return {}


def nonchoice_summary(year):
    path = ROOT / "downloads" / str(year) / "nonChoiceRubric.pdf"
    if not path.exists():
        return {}
    text = pdf_text(path)
    save_extracted(year, "nonChoiceRubric", text)
    chunks = {}
    parts = re.split(r"(?:第\s*)?([一二三四五六七八九十\d]{1,3})\s*(?:題|大題)", text)
    # The split is inconsistent across years; keep a compact fallback by Arabic question numbers.
    for match in re.finditer(r"第\s*(\d{1,2})\s*題([\s\S]*?)(?=第\s*\d{1,2}\s*題|$)", text):
        no = int(match.group(1))
        chunks[no] = clean_text(match.group(2))[:900]
    return chunks


def infer_unit(text, no, exam_type):
    if any(k in text for k in ["拉塞福", "α粒子", "原子核", "波耳", "德布羅意", "量子"]):
        return "近代物理"
    score = Counter()
    for unit, keywords in UNIT_KEYWORDS:
        score[unit] += sum(text.count(k) for k in keywords)
    if score:
        unit, points = score.most_common(1)[0]
        if points:
            return unit
    # 指考常見排列：前段力學/熱學，中段波電，後段近代與實驗。
    if no <= 8:
        return "力學"
    if no <= 11:
        return "熱學"
    if no <= 15:
        return "波動與光學"
    if no <= 20:
        return "電磁學"
    return "近代物理" if exam_type == "指定科目考試" else "實驗與探究"


def infer_literacy(text, answer):
    hits = []
    for name, keywords in LITERACY_KEYWORDS:
        if any(k in text for k in keywords):
            hits.append(name)
    if answer == "非選擇題" and "文字敘述轉物理量" not in hits:
        hits.append("文字敘述轉物理量")
    return hits or ["文字敘述轉物理量"]


def key_concept(unit, text):
    if any(k in text for k in ["圖", "曲線", "表格", "圖表", "關係圖", "分布圖", "數據", "斜率", "面積"]):
        return f"{UNIT_CONCEPTS[unit]}；同時注意圖表的斜率、面積或相對大小。"
    return UNIT_CONCEPTS[unit]


def solution_text(no, answer, unit, literacy, rubric):
    if rubric:
        return (
            "本題為非選擇題。解題時先釐清題目給定量與要求量，建立符合情境的模型；"
            f"核心使用「{key_concept(unit, rubric)}」。作答需列出主要公式、代入步驟、單位與最後結論。"
            "官方評分重點要求推理過程清楚；若觀念與公式正確但計算小誤，通常仍可取得部分分數。"
        )
    if answer == "非選擇題":
        return (
            "本題為非選擇題，但目前官方評分原則未能穩定對應到此題號。請依原題圖文列式，"
            f"以「{key_concept(unit, '')}」完成推導，最後檢查單位、方向與有效數字。"
        )
    if len(answer) > 1:
        return (
            f"官方答案為 {answer}。此題屬多選題，逐一檢查各選項是否符合「{key_concept(unit, '')}」。"
            "保留與基本定律、量綱、方向或極限情形相符的選項；刪去只在特例成立、單位不合或因果關係倒置的敘述。"
        )
    return (
        f"官方答案為 {answer}。先把題目情境轉成物理模型，再使用「{key_concept(unit, '')}」判斷。"
        "若涉及計算，先列式再代入數值；若是概念題，檢查選項的單位、方向、守恆關係與適用條件，最後選出唯一相符者。"
    )


def common_error(unit, literacy):
    if "圖表判讀" in literacy:
        return "常見錯誤是只看圖形高低而忽略橫軸、面積、斜率或曲線所代表的物理量。"
    if unit == "力學":
        return "常見錯誤是漏畫受力、把速度與加速度方向混淆，或在非保守力存在時誤用機械能守恆。"
    if unit == "電磁學":
        return "常見錯誤是磁力方向判定錯誤、混淆電場與電位，或忘記感應電動勢取決於磁通量變化率。"
    if unit == "熱學":
        return "常見錯誤是把溫度與熱量等同，或在熱平衡題中漏算容器、相變與能量散失條件。"
    if unit == "波動與光學":
        return "常見錯誤是混淆頻率、波速與波長，或把駐波節點/腹點數與波長關係數錯。"
    if unit == "近代物理":
        return "常見錯誤是把古典粒子軌跡想像直接套入量子現象，或混淆原子、原子核與電子能階。"
    return "常見錯誤是未說明控制變因、量測方式或資料處理依據，導致結論缺乏可檢驗性。"


def science_topics(source_texts):
    scores = Counter()
    for text in source_texts:
        for topic, keywords in SCI_TECH_TOPICS:
            if any(keyword in text for keyword in keywords):
                scores[topic] += 1
    return [{"name": name, "count": count} for name, count in scores.most_common()]


def annual_feature_analysis(exam, questions, topics, inquiry_count):
    total = len(questions) or 1
    unit_counts = Counter(q["unit"] for q in questions)
    leading_units = [unit for unit, _ in unit_counts.most_common(3)]
    topic_names = [topic["name"] for topic in topics[:4]]
    if not topic_names:
        topic_names = ["基礎物理概念應用", "圖文資訊判讀"]
    inquiry_percent = round(inquiry_count * 100 / total, 1)
    return (
        f"{exam['year']} 學年度{exam['type']}物理以"
        f"{'、'.join(leading_units)}為主要出題核心，並結合{'、'.join(topic_names)}等科學或科技議題。"
        f"本年度實驗與素養探究題共 {inquiry_count} 題，占 {inquiry_percent}%，"
        "多要求考生從圖表、數據、實驗情境或生活科技案例中建立模型，再以定律、量綱、守恆關係與合理近似完成判斷。"
    )


def make_analysis(exam):
    year = exam["year"]
    answers = answer_key(year)
    qtexts = question_texts(year)
    rubrics = nonchoice_summary(year)
    max_no = max(answers) if answers else 0
    questions = []
    source_texts = []
    for no in range(1, max_no + 1):
        answer = answers.get(no, "")
        text = qtexts.get(no, "")
        rubric = rubrics.get(no, "")
        source_text = f"{text} {rubric}"
        source_texts.append(source_text)
        unit = infer_unit(source_text, no, exam["type"])
        literacy = infer_literacy(source_text, answer)
        questions.append(
            {
                "no": no,
                "unit": unit,
                "literacyTypes": literacy,
                "answer": answer,
                "questionText": text or "本題題文含圖形、表格或公式，文字抽取未完整保留；請搭配官方試題 PDF/DOCX 查看原題。",
                "solution": solution_text(no, answer, unit, literacy, rubric),
                "commonMistake": common_error(unit, literacy),
                "keyConcept": key_concept(unit, source_text),
                "sourceStatus": "official-answer; auto-classified; solution-draft",
                "quality": "auto-draft",
            }
        )
    total = len(questions) or 1
    lit_counts = Counter(t for q in questions for t in q["literacyTypes"])
    inquiry_count = lit_counts.get("實驗與素養探究", 0)
    unit_counts = Counter(q["unit"] for q in questions)
    unit_counts["實驗與探究"] = inquiry_count
    unit_order = ["力學", "熱學", "波動與光學", "電磁學", "近代物理", "實驗與探究"]
    unit_stats = [
        {"unit": unit, "count": unit_counts.get(unit, 0), "percent": round(unit_counts.get(unit, 0) * 100 / total, 1)}
        for unit in unit_order
    ]
    lit_order = ["實驗與素養探究", "圖表判讀", "實驗設計與誤差", "生活情境建模", "跨章節概念整合", "文字敘述轉物理量"]
    literacy_types = [{"name": name, "count": lit_counts.get(name, 0)} for name in lit_order]
    topics = science_topics(source_texts)
    feature_analysis = annual_feature_analysis(exam, questions, topics, inquiry_count)
    return {
        "year": year,
        "type": exam["type"],
        "status": "已自動補入，待人工校訂",
        "note": feature_analysis,
        "annualFeatureAnalysis": feature_analysis,
        "scienceTechnologyIssues": topics,
        "unitStats": unit_stats,
        "literacyTypes": literacy_types,
        "inquiryQuestionCount": inquiry_count,
        "inquiryQuestionPercent": round(inquiry_count * 100 / total, 1),
        "questions": questions,
    }


def main():
    EXTRACTED.mkdir(parents=True, exist_ok=True)
    data = read_json(DATA_PATH)
    data["analysis"] = [make_analysis(exam) for exam in data["exams"]]
    data["generatedAt"] = "2026-05-25T04:00:00+08:00"
    write_json(DATA_PATH, data)
    print(f"enriched {len(data['analysis'])} years, {sum(len(a['questions']) for a in data['analysis'])} questions")


if __name__ == "__main__":
    main()
