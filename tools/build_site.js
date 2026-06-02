const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "official-links.json");
const ceecBase = "https://www.ceec.edu.tw";
const fixedQuestionPdfUrls = {
  107:
    "https://www.ceec.edu.tw/files/file_pool/1/0j075625661497981164/08-107%E5%AD%B8%E5%B9%B4%E5%BA%A6%E6%8C%87%E8%80%83%E7%89%A9%E7%90%86%E7%A7%91_%E5%AE%9A%E7%A8%BF.pdf",
};
const htmlFiles = fs
  .readdirSync(root)
  .filter((name) => /^ceec_p\d+\.html$/.test(name))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function absolutize(href) {
  const clean = decodeEntities(href);
  if (/^https?:\/\//.test(clean)) return clean;
  return ceecBase + clean;
}

function extractRows(html) {
  const rowRegex = /<tr>\s*<td class="date">([\s\S]*?)<\/td>\s*<td class="title">\s*([\s\S]*?)\s*<\/td>\s*<td class="download">\s*([\s\S]*?)<\/td>\s*<\/tr>/g;
  const rows = [];
  let match;
  while ((match = rowRegex.exec(html))) {
    const date = match[1].trim();
    const title = match[2].replace(/\s+/g, "").trim();
    const downloads = [];
    const linkRegex = /<a href="([^"]+)"[^>]*title="([^"]*)"[^>]*>([^<]+)<\/a>/g;
    let link;
    while ((link = linkRegex.exec(match[3]))) {
      downloads.push({
        label: decodeEntities(link[3].trim()),
        title: decodeEntities(link[2].trim()),
        url: absolutize(link[1]),
      });
    }
    rows.push({ date, title, downloads });
  }
  return rows;
}

const officialRows = htmlFiles.flatMap((name) =>
  extractRows(fs.readFileSync(path.join(root, name), "utf8")),
);

const exams = officialRows
  .filter((row) => /物理/.test(row.title))
  .map((row) => {
    const year = Number(row.title.match(/(\d+)學年度/)?.[1]);
    const type = row.title.includes("分科測驗") ? "分科測驗" : "指定科目考試";
    return {
      year,
      type,
      title: row.title,
      publishDate: row.date,
      official: {
        questionPdf: row.downloads.find((d) => d.label === "試題內容" && /\.pdf/i.test(d.url))?.url || "",
        questionDocx: row.downloads.find((d) => d.label === "試題內容" && /\.docx/i.test(d.url))?.url || "",
        answerSheet: row.downloads.find((d) => d.label === "答題卷")?.url || "",
        choiceAnswer: row.downloads.find((d) => /選擇/.test(d.label))?.url || "",
        nonChoiceRubric: row.downloads.find((d) => /非選擇/.test(d.label))?.url || "",
      },
    };
  })
  .filter((exam) => exam.year >= 100 && exam.year <= 114 && !/補考|補救/.test(exam.title))
  .sort((a, b) => b.year - a.year);

for (const exam of exams) {
  if (fixedQuestionPdfUrls[exam.year]) {
    exam.official.questionPdf = fixedQuestionPdfUrls[exam.year];
  }
}

let existingAnalysis = [];
if (fs.existsSync(dataPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, ""));
    existingAnalysis = Array.isArray(existing.analysis) ? existing.analysis : [];
  } catch {
    existingAnalysis = [];
  }
}

const analysisTemplate = exams.map((exam) => {
  const existing = existingAnalysis.find((item) => Number(item.year) === exam.year);
  if (existing && Array.isArray(existing.questions) && existing.questions.length) {
    return existing;
  }
  return {
  year: exam.year,
  type: exam.type,
  status: "待逐題校訂",
  note:
    "已整理官方檔案連結。單元比例、素養題型與逐題詳解需依試題逐題判讀後填入，避免未校訂資料誤導複習。",
  annualFeatureAnalysis:
    "已整理官方檔案連結。待逐題校訂後可補入當年度試題特色、科學科技議題與實驗探究取向。",
  scienceTechnologyIssues: [],
  unitStats: [
    { unit: "力學", count: 0, percent: 0 },
    { unit: "熱學", count: 0, percent: 0 },
    { unit: "波動與光學", count: 0, percent: 0 },
    { unit: "電磁學", count: 0, percent: 0 },
    { unit: "近代物理", count: 0, percent: 0 },
    { unit: "實驗與探究", count: 0, percent: 0 },
  ],
  literacyTypes: [
    "圖表判讀",
    "實驗設計與誤差",
    "生活情境建模",
    "跨章節概念整合",
    "文字敘述轉物理量",
  ].map((name) => ({ name, count: 0 })),
  questions: [],
  };
});

const payload = {
  generatedAt: new Date().toISOString(),
  source: {
    name: "大考中心：分科測驗（110 前指考）歷年試題及答題卷／一般試題",
    url: "https://www.ceec.edu.tw/xmfile?xsmsid=0J052427633128416650",
  },
  exams,
  analysis: analysisTemplate,
};

const pretestData = {
  groups: [
    {
      id: "semi",
      title: "題組一：半導體製程與 EUV 曝光",
      focus: "從晶圓、光刻、繞射限制到摻雜與 PN 接面，訓練學生把科技名詞轉回波動、電磁與近代物理模型。",
      questions: [
        {
          id: "semi-1",
          difficulty: "基礎",
          concept: "波長與繞射限制",
          intent: "檢查學生是否理解短波長可降低繞射造成的圖形模糊。",
          prompt: "半導體光刻中，若要在晶圓上製作更細小的線寬，EUV 使用比可見光更短的波長。下列哪一項最能說明短波長的優點？",
          options: [
            "短波長光一定具有較小的頻率，所以能量較低",
            "短波長可降低繞射造成的擴散，使圖樣解析度提高",
            "短波長會讓光速變大，因此曝光時間縮短",
            "短波長會使矽晶圓變成導體，因此不需摻雜"
          ],
          answer: "B",
          explanation: "光刻解析度受繞射限制影響，可用類似 \\(d\\propto \\lambda/NA\\) 的想法理解；波長 \\(\\lambda\\) 越短，繞射造成的最小可分辨尺度越小，因此較能做出細線寬。"
        },
        {
          id: "semi-2",
          difficulty: "中等",
          concept: "光刻與光阻",
          intent: "判斷學生是否能把製程步驟對應到光化學與遮罩成像。",
          prompt: "在光刻 Photolithography 中，光罩上的圖形經曝光轉移到塗有光阻的晶圓表面。光阻在此製程中的主要功能為何？",
          options: [
            "提供電子作為 N 型摻雜來源",
            "增加晶圓的比熱，使晶圓較不易升溫",
            "受光後化學性質改變，讓後續顯影留下特定圖形",
            "讓所有入射光完全反射，避免晶圓吸收能量"
          ],
          answer: "C",
          explanation: "光阻的重點是受光後溶解度或化學性質改變，顯影後形成圖案。此題不需要大學化的材料化學，只要抓住「光造成可選擇移除」即可。"
        },
        {
          id: "semi-3",
          difficulty: "基礎",
          concept: "摻雜與 N 型半導體",
          intent: "確認學生能從價電子數判斷多數載子。",
          prompt: "在矽晶體中摻入少量五價元素，例如磷，可形成哪一類半導體？其多數載子為何？",
          options: [
            "P 型，電洞為多數載子",
            "N 型，電子為多數載子",
            "P 型，電子為多數載子",
            "本質半導體，沒有多數載子"
          ],
          answer: "B",
          explanation: "矽為四價，五價雜質多出一個較容易成為自由載子的電子，因此形成 N 型半導體，電子為多數載子。"
        },
        {
          id: "semi-4",
          difficulty: "中等",
          concept: "PN 接面與內建電場",
          intent: "把半導體接面連回電場力與載子分離。",
          prompt: "太陽能電池可視為 PN 接面受到光照後產生電子與電洞。PN 接面內建電場的主要作用是什麼？",
          options: [
            "把電子與電洞往相反方向分離，形成可輸出的電流",
            "使所有光子都變成熱，提升溫度差",
            "讓電阻變成無限大，避免任何電流流動",
            "只改變光的波長，與電荷運動無關"
          ],
          answer: "A",
          explanation: "光吸收可產生電子-電洞對，PN 接面的內建電場會對正、負載子施加相反方向的電力，使電荷分離並形成光電流。"
        },
        {
          id: "semi-5",
          difficulty: "進階",
          concept: "CMOS 感測器與光電轉換",
          intent: "整合光子能量、電子電洞對與訊號讀出。",
          prompt: "手機相機的 CMOS 感測器中，每個像素可近似為小型光電二極體。它把影像光訊號轉成電訊號的基本機制為何？",
          options: [
            "鏡頭把光子直接轉換成聲波，再由麥克風讀出",
            "像素吸光後只改變溫度，完全不涉及電荷",
            "光子使矽原子核分裂，釋放大量能量",
            "光子在半導體中產生電子與電洞，累積電荷後讀出電壓或電流"
          ],
          answer: "D",
          explanation: "CMOS/CCD 感測器都可用光電轉換理解：光子能量若足以被半導體吸收，會產生電子-電洞對；累積的電荷量與入射光強、曝光時間有關，再被電路轉成訊號。"
        }
      ]
    },
    {
      id: "drone",
      title: "題組二：無人機飛行操控",
      focus: "用牛頓運動定律與轉動觀念解釋四旋翼的懸停、平移與姿態控制。",
      questions: [
        {
          id: "drone-1",
          difficulty: "基礎",
          concept: "力平衡與懸停",
          intent: "確認學生能建立垂直方向合力為零的模型。",
          prompt: "一架四旋翼無人機在空中穩定懸停，且高度不變。若無人機總重為 \\(mg\\)，四個螺旋槳提供的總升力量值應為何？",
          options: [
            "小於 \\(mg\\)",
            "等於 \\(mg\\)",
            "大於 \\(mg\\)",
            "等於 0"
          ],
          answer: "B",
          explanation: "懸停且高度不變代表垂直方向加速度為 0，依牛頓第二定律 \\(\\sum F_y=0\\)，總升力需等於重力 \\(mg\\)。"
        },
        {
          id: "drone-2",
          difficulty: "中等",
          concept: "推力分解與前進",
          intent: "檢查學生是否能把傾斜推力分解成水平與鉛直分量。",
          prompt: "四旋翼要由懸停轉為向前加速，常會讓機身稍微向前俯仰 pitch。此時總推力方向傾斜，其效果為何？",
          options: [
            "推力完全向下，所以無人機必定墜落",
            "推力只有鉛直分量，水平運動不會改變",
            "推力具有向前的水平分量，使無人機向前加速",
            "重力會轉向前方，所以無人機向前移動"
          ],
          answer: "C",
          explanation: "機身傾斜後，螺旋槳總推力不再完全鉛直，可分解成鉛直分量與水平分量；水平分量造成前進加速度。"
        },
        {
          id: "drone-3",
          difficulty: "中等",
          concept: "偏航 yaw 與反作用力矩",
          intent: "確認學生能用力矩平衡解釋旋轉控制。",
          prompt: "四旋翼無人機要原地偏航 yaw，常調整順時針與逆時針旋轉螺旋槳的轉速差。主要原因是什麼？",
          options: [
            "改變兩組螺旋槳的反作用力矩，使機身產生繞鉛直軸的角加速度",
            "只要讓任一螺旋槳停轉，無人機就會保持水平而不轉動",
            "偏航只和重力有關，與螺旋槳轉向無關",
            "偏航時不需要任何力矩，只需改變質量"
          ],
          answer: "A",
          explanation: "螺旋槳轉動時，機身受反作用力矩。四旋翼以相反轉向的螺旋槳互相抵消力矩；若刻意造成兩組力矩不平衡，就能產生偏航。"
        },
        {
          id: "drone-4",
          difficulty: "中等",
          concept: "滾轉 roll 與力矩",
          intent: "讓學生用力矩方向判斷姿態改變。",
          prompt: "若無人機要向右滾轉 roll，簡化來看可讓左側螺旋槳升力大於右側。下列敘述何者正確？",
          options: [
            "左右升力不同只會改變溫度，不會造成轉動",
            "左側升力較大會使機身產生繞前後軸的力矩",
            "右側升力較小會使重力消失",
            "只要總升力等於重力，姿態一定不會改變"
          ],
          answer: "B",
          explanation: "左右兩側升力作用線不同，形成繞機身前後軸的淨力矩，使機身滾轉。總力決定平動，淨力矩決定轉動，兩者需分開判斷。"
        },
        {
          id: "drone-5",
          difficulty: "進階",
          concept: "角動量與力矩平衡",
          intent: "整合角動量守恆與反向旋轉設計。",
          prompt: "四旋翼通常設計成兩個螺旋槳順時針旋轉、兩個逆時針旋轉。此設計最重要的物理目的為何？",
          options: [
            "讓每個螺旋槳都不需要電能",
            "讓螺旋槳角動量與反作用力矩大致互相抵消，避免機身自轉",
            "讓重力變小，因此更容易起飛",
            "讓空氣密度增加，升力一定變成兩倍"
          ],
          answer: "B",
          explanation: "若所有螺旋槳同向旋轉，機身會受到同方向反作用力矩而自轉。反向旋轉配置可讓總力矩接近平衡，是四旋翼穩定控制的關鍵。"
        }
      ]
    },
    {
      id: "optic",
      title: "題組三：干涉與光電感測器",
      focus: "把雙狹縫、薄膜干涉、光電效應與 CMOS/CCD 感測器連成同一條光電轉換線索。",
      questions: [
        {
          id: "optic-1",
          difficulty: "基礎",
          concept: "雙狹縫條紋間距",
          intent: "確認學生會判斷 \\(\\Delta y=\\lambda L/d\\) 的比例關係。",
          prompt: "雙狹縫實驗中，螢幕距離 \\(L\\) 固定、光波長 \\(\\lambda\\) 固定。若狹縫間距 \\(d\\) 變大，亮紋間距 \\(\\Delta y\\) 會如何改變？",
          options: [
            "變小",
            "變大",
            "不變",
            "先變大再變小"
          ],
          answer: "A",
          explanation: "雙狹縫亮紋間距 \\(\\Delta y=\\lambda L/d\\)。在 \\(\\lambda\\)、\\(L\\) 固定時，\\(d\\) 越大，\\(\\Delta y\\) 越小。"
        },
        {
          id: "optic-2",
          difficulty: "中等",
          concept: "抗反射鍍膜與薄膜干涉",
          intent: "把薄膜干涉連到光電元件效率。",
          prompt: "太陽能電池表面常加抗反射鍍膜，使某波長反射光彼此相消。若近似正入射，鍍膜折射率為 \\(n\\)，常見的四分之一波長厚度條件可寫成哪一項？",
          options: [
            "\\(t=\\lambda n\\)",
            "\\(t=\\lambda/(4n)\\)",
            "\\(t=4n\\lambda\\)",
            "\\(t=0\\)"
          ],
          answer: "B",
          explanation: "在薄膜內波長為 \\(\\lambda/n\\)，四分之一波長膜厚約為 \\(t=\\lambda/(4n)\\)。反射光的相位差可設計成相消，降低反射、增加進入元件的光。"
        },
        {
          id: "optic-3",
          difficulty: "基礎",
          concept: "光電效應閾頻",
          intent: "檢查學生是否能區分光強與頻率的角色。",
          prompt: "某金屬表面需要頻率高於閾頻 \\(f_0\\) 的光才會放出光電子。若入射光頻率低於 \\(f_0\\)，但光強非常大，結果最合理的是什麼？",
          options: [
            "一定放出更多高能光電子",
            "只要照很久就一定放出光電子",
            "光電子速率變為光速",
            "仍不會產生光電子"
          ],
          answer: "D",
          explanation: "光電效應中單一光子能量 \\(E=hf\\)。若 \\(f<f_0\\)，每個光子的能量不足以克服逸出功，增加光強只增加光子數，不會使單一光子能量變大。"
        },
        {
          id: "optic-4",
          difficulty: "中等",
          concept: "CMOS/CCD 亮度訊號",
          intent: "連結光強、曝光時間與累積電荷。",
          prompt: "同一 CMOS 像素在未飽和前，若入射光強變為原來 2 倍且曝光時間不變，該像素累積的電荷量大致如何改變？",
          options: [
            "約變為 2 倍",
            "約變為 1/2",
            "必定變為 0",
            "與光強完全無關"
          ],
          answer: "A",
          explanation: "未飽和時，入射光子數約與光強及曝光時間成正比；光子數越多，產生的電子-電洞對與累積電荷越多，因此訊號約變為 2 倍。"
        },
        {
          id: "optic-5",
          difficulty: "進階",
          concept: "條紋間距數值估算",
          intent: "讓學生在科技情境中快速代入並判讀量級。",
          prompt: "雙狹縫間距 \\(d=0.40\\,\\mathrm{mm}\\)，以波長 \\(600\\,\\mathrm{nm}\\) 的光照射，螢幕距離 \\(L=2.0\\,\\mathrm{m}\\)。亮紋間距最接近多少？",
          options: [
            "\\(0.30\\,\\mathrm{mm}\\)",
            "\\(1.5\\,\\mathrm{mm}\\)",
            "\\(3.0\\,\\mathrm{mm}\\)",
            "\\(30\\,\\mathrm{mm}\\)"
          ],
          answer: "C",
          explanation: "\\(\\Delta y=\\lambda L/d=(600\\times10^{-9})(2.0)/(0.40\\times10^{-3})=3.0\\times10^{-3}\\,\\mathrm{m}\\)，即 \\(3.0\\,\\mathrm{mm}\\)。"
        }
      ]
    },
    {
      id: "cooling",
      title: "題組四：AI 資料中心散熱",
      focus: "用熱學與能量守恆分析 GPU 耗電、散熱方式、液冷與資料中心能源效率。",
      questions: [
        {
          id: "cooling-1",
          difficulty: "基礎",
          concept: "功率與能量",
          intent: "確認學生會用 \\(P=E/t\\) 做耗能估算。",
          prompt: "一組 AI 伺服器運作時電功率為 \\(10\\,\\mathrm{kW}\\)。若連續運作 \\(10\\,\\mathrm{s}\\)，其消耗電能最接近多少？",
          options: [
            "\\(1\\,\\mathrm{kJ}\\)",
            "\\(100\\,\\mathrm{kJ}\\)",
            "\\(10\\,\\mathrm{MJ}\\)",
            "\\(100\\,\\mathrm{MJ}\\)"
          ],
          answer: "B",
          explanation: "由 \\(E=Pt\\)，\\(10\\,\\mathrm{kW}=10,000\\,\\mathrm{W}\\)，所以 \\(E=10,000\\times10=100,000\\,\\mathrm{J}=100\\,\\mathrm{kJ}\\)。"
        },
        {
          id: "cooling-2",
          difficulty: "中等",
          concept: "水冷與 \\(Q=mc\\Delta T\\)",
          intent: "檢查學生是否能把功率轉成單位時間帶走的熱量。",
          prompt: "液冷系統需帶走 \\(20\\,\\mathrm{kW}\\) 的熱。若水溫升高 \\(5.0^{\\circ}\\mathrm{C}\\)，取水的比熱 \\(c=4200\\,\\mathrm{J/(kg\\cdot ^{\\circ}C)}\\)，每秒約需多少水流量？",
          options: [
            "\\(0.095\\,\\mathrm{kg/s}\\)",
            "\\(0.48\\,\\mathrm{kg/s}\\)",
            "\\(0.95\\,\\mathrm{kg/s}\\)",
            "\\(4.8\\,\\mathrm{kg/s}\\)"
          ],
          answer: "C",
          explanation: "每秒需帶走熱量 \\(P=20,000\\,\\mathrm{J/s}\\)。由 \\(P=\\dot{m}c\\Delta T\\)，\\(\\dot{m}=20000/(4200\\times5.0)\\approx0.95\\,\\mathrm{kg/s}\\)。"
        },
        {
          id: "cooling-3",
          difficulty: "基礎",
          concept: "熱傳導與熱阻",
          intent: "將散熱片材料選擇連到熱傳導。",
          prompt: "GPU 晶片常接觸銅或鋁製散熱片。選用高熱傳導率材料的主要目的為何？",
          options: [
            "降低晶片到散熱片之間的熱阻，使熱更快傳出",
            "讓電流完全停止，避免產生任何熱",
            "讓晶片的質量變成 0",
            "只增加熱輻射，完全不影響熱傳導"
          ],
          answer: "A",
          explanation: "散熱片的任務是把晶片局部熱量快速傳到較大表面積處，再交給空氣或液體帶走。高熱傳導率代表同樣溫差下熱流較大，熱阻較小。"
        },
        {
          id: "cooling-4",
          difficulty: "中等",
          concept: "PUE 能源效率",
          intent: "讓學生讀懂資料中心效率指標。",
          prompt: "資料中心的 PUE 定義為總用電功率除以 IT 設備用電功率。若 IT 設備耗電 \\(5.0\\,\\mathrm{MW}\\)，整座資料中心總耗電 \\(6.0\\,\\mathrm{MW}\\)，PUE 為多少？",
          options: [
            "0.20",
            "0.83",
            "1.0",
            "1.2"
          ],
          answer: "D",
          explanation: "\\(PUE=P_{\\mathrm{total}}/P_{\\mathrm{IT}}=6.0/5.0=1.2\\)。PUE 越接近 1，代表冷卻、供電轉換等非 IT 額外耗能越少。"
        },
        {
          id: "cooling-5",
          difficulty: "進階",
          concept: "液冷與比熱",
          intent: "整合比熱、密度與對流帶熱能力。",
          prompt: "相較於一般風冷，液冷常能在高功率 AI 伺服器中更有效移除熱量。以高三熱學觀點，下列哪一項最合理？",
          options: [
            "水的比熱較大，且單位體積可帶走較多熱量",
            "水不遵守能量守恆，因此可以讓熱消失",
            "液冷使 GPU 不再耗電",
            "液冷只靠真空傳熱，與對流無關"
          ],
          answer: "A",
          explanation: "水的比熱大，且密度遠高於空氣；同樣溫升下，每秒流過的水可帶走大量熱量。能量沒有消失，而是由冷卻液帶到散熱器或冷卻塔。"
        }
      ]
    }
  ]
};

const pretestExtraQuestions = {
  semi: [
    {
      id: "semi-6",
      difficulty: "基礎",
      concept: "光子能量與波長",
      intent: "確認學生會用 \\(E=hc/\\lambda\\) 判斷短波長光子能量較高。",
      prompt: "EUV 的波長約為 \\(13.5\\,\\mathrm{nm}\\)，可見光常見波長約為 \\(540\\,\\mathrm{nm}\\)。若只比較單一光子能量，下列判斷何者正確？",
      options: [
        "EUV 光子能量較低，因為波長較短",
        "EUV 光子能量較高，因為 \\(E=hc/\\lambda\\)",
        "兩者光子能量相同，因為光速相同",
        "可見光光子一定可直接打出矽中的所有電子"
      ],
      answer: "B",
      explanation: "光子能量 \\(E=hc/\\lambda\\)。波長越短，單一光子能量越大；因此 \\(13.5\\,\\mathrm{nm}\\) 的 EUV 光子能量高於 \\(540\\,\\mathrm{nm}\\) 的可見光。"
    },
    {
      id: "semi-7",
      difficulty: "基礎",
      concept: "光阻顯影",
      intent: "檢查學生是否能把曝光、顯影與圖形轉移連起來。",
      prompt: "在正光阻製程中，被光照到的區域較容易被顯影液移除。若光罩讓某處受到較強曝光，顯影後該處最可能如何？",
      options: [
        "較容易被移除，露出下方材料",
        "一定變成超導體",
        "一定產生較大的重力",
        "光阻厚度完全不變，無法形成圖形"
      ],
      answer: "A",
      explanation: "正光阻的受光區溶解度增加，顯影時較容易被移除。這讓光罩上的明暗分布轉為材料表面的保護區與開口區。"
    },
    {
      id: "semi-8",
      difficulty: "基礎",
      concept: "P 型半導體",
      intent: "確認學生能由價電子數判斷多數載子。",
      prompt: "矽為四價元素。若在矽晶格中摻入少量三價硼原子，最合理的結果為何？",
      options: [
        "形成 N 型半導體，電子為多數載子",
        "形成 P 型半導體，電洞為多數載子",
        "矽原子核全部裂變",
        "材料一定成為絕對絕緣體"
      ],
      answer: "B",
      explanation: "三價硼比四價矽少一個價電子，容易形成電洞，因此產生 P 型半導體；多數載子為電洞。"
    },
    {
      id: "semi-9",
      difficulty: "基礎",
      concept: "PN 接面與二極體",
      intent: "確認學生理解順向偏壓可降低接面障壁。",
      prompt: "PN 接面二極體在順向偏壓時較容易導通。以高中電場觀點理解，主要原因為何？",
      options: [
        "外加電場完全消除所有電荷",
        "外加電壓降低接面位能障壁，使載子較容易跨越接面",
        "二極體質量減少，所以電流變大",
        "半導體中的光速變成無限大"
      ],
      answer: "B",
      explanation: "順向偏壓會降低 PN 接面的位能障壁，使電子與電洞較容易穿越接面而形成電流；反向偏壓則使障壁加大。"
    },
    {
      id: "semi-10",
      difficulty: "中等",
      concept: "單狹縫繞射角度",
      intent: "用 \\(a\\sin\\theta=m\\lambda\\) 估算短波長的繞射角。",
      prompt: "若把線寬近似為狹縫寬 \\(a=100\\,\\mathrm{nm}\\)，EUV 波長 \\(\\lambda=13.5\\,\\mathrm{nm}\\)。第一暗紋近似滿足 \\(a\\sin\\theta=\\lambda\\)，則 \\(\\sin\\theta\\) 約為多少？",
      options: [
        "0.0135",
        "0.135",
        "1.35",
        "13.5"
      ],
      answer: "B",
      explanation: "第一暗紋取 \\(m=1\\)，所以 \\(\\sin\\theta=\\lambda/a=13.5/100=0.135\\)。若波長變短，\\(\\sin\\theta\\) 變小，繞射擴散較不明顯。"
    },
    {
      id: "semi-11",
      difficulty: "中等",
      concept: "干涉式微影週期",
      intent: "用干涉週期公式建立微影條紋尺度。",
      prompt: "兩束相干光夾角為 \\(2\\theta\\)，在光阻上形成明暗條紋，週期可估為 \\(p=\\lambda/(2\\sin\\theta)\\)。若 \\(\\lambda=400\\,\\mathrm{nm}\\)、\\(\\theta=30^\\circ\\)，則 \\(p\\) 約為多少？",
      options: [
        "\\(200\\,\\mathrm{nm}\\)",
        "\\(400\\,\\mathrm{nm}\\)",
        "\\(800\\,\\mathrm{nm}\\)",
        "\\(1600\\,\\mathrm{nm}\\)"
      ],
      answer: "B",
      explanation: "代入 \\(p=\\lambda/(2\\sin\\theta)=400/(2\\times0.5)=400\\,\\mathrm{nm}\\)。夾角越大，\\(\\sin\\theta\\) 越大，條紋週期越小。"
    },
    {
      id: "semi-12",
      difficulty: "中等",
      concept: "EUV 光子能量估算",
      intent: "訓練學生用 \\(hc\\approx1240\\,\\mathrm{eV\\cdot nm}\\) 快速估算。",
      prompt: "取 \\(hc\\approx1240\\,\\mathrm{eV\\cdot nm}\\)。波長 \\(13.5\\,\\mathrm{nm}\\) 的 EUV 光子能量最接近多少？",
      options: [
        "\\(9.2\\,\\mathrm{eV}\\)",
        "\\(46\\,\\mathrm{eV}\\)",
        "\\(92\\,\\mathrm{eV}\\)",
        "\\(920\\,\\mathrm{eV}\\)"
      ],
      answer: "C",
      explanation: "\\(E=hc/\\lambda\\approx1240/13.5\\approx92\\,\\mathrm{eV}\\)。短波長不只提高解析度，也使單一光子能量提高。"
    },
    {
      id: "semi-13",
      difficulty: "中等",
      concept: "摻雜濃度與載子數",
      intent: "用濃度乘體積估算摻雜原子數。",
      prompt: "某區域摻雜濃度為 \\(1.0\\times10^{15}\\,\\mathrm{cm^{-3}}\\)，體積為 \\(2.0\\times10^{-8}\\,\\mathrm{cm^3}\\)。若每個雜質約提供一個載子，載子數約為多少？",
      options: [
        "\\(2.0\\times10^{7}\\)",
        "\\(2.0\\times10^{15}\\)",
        "\\(5.0\\times10^{22}\\)",
        "\\(2.0\\times10^{-23}\\)"
      ],
      answer: "A",
      explanation: "載子數 \\(N=nV=(1.0\\times10^{15})(2.0\\times10^{-8})=2.0\\times10^{7}\\)。濃度乘體積即可估算總數。"
    },
    {
      id: "semi-14",
      difficulty: "中等",
      concept: "CMOS 像素曝光",
      intent: "把光強、曝光時間與累積電荷量連起來。",
      prompt: "某 CMOS 像素未飽和時，累積電荷量與入射光強及曝光時間成正比。若光強變為原來 \\(3\\) 倍、曝光時間變為原來 \\(1/2\\)，累積電荷量變為原來多少？",
      options: [
        "\\(1/6\\)",
        "\\(1/2\\)",
        "\\(3/2\\)",
        "\\(6\\)"
      ],
      answer: "C",
      explanation: "電荷量比例為 \\(3\\times(1/2)=3/2\\)。未飽和區可用線性模型；若已飽和，比例關係就不再成立。"
    },
    {
      id: "semi-15",
      difficulty: "進階",
      concept: "解析度比例估算",
      intent: "用 \\(d\\propto\\lambda\\) 比較兩種曝光波長。",
      prompt: "若先忽略數值孔徑差異，光刻最小可分辨尺度可粗略視為與波長成正比。\\(193\\,\\mathrm{nm}\\) 深紫外光改成 \\(13.5\\,\\mathrm{nm}\\) EUV，理想上尺度約可縮小為原來多少？",
      options: [
        "\\(13.5/193\\)，約 \\(0.070\\)",
        "\\(193/13.5\\)，約 \\(14.3\\)",
        "\\(193+13.5\\)",
        "不會改變"
      ],
      answer: "A",
      explanation: "若 \\(d\\propto\\lambda\\)，比例為 \\(d_{\\mathrm{EUV}}/d_{193}=13.5/193\\approx0.070\\)。短波長可降低繞射限制，但實際製程還需考慮光學系統與光阻材料。"
    },
    {
      id: "semi-16",
      difficulty: "進階",
      concept: "電荷通過電位差的能量",
      intent: "用 \\(\\Delta E=q\\Delta V\\) 連結 PN 接面位能障壁。",
      prompt: "一個電子通過 \\(0.60\\,\\mathrm{V}\\) 的電位差時，電能改變量大小為多少？",
      options: [
        "\\(0.60\\,\\mathrm{eV}\\)",
        "\\(1.2\\,\\mathrm{eV}\\)",
        "\\(6.0\\,\\mathrm{J}\\)",
        "\\(0\\)"
      ],
      answer: "A",
      explanation: "以電子伏特為單位時，帶一個基本電荷的粒子通過 \\(1\\,\\mathrm{V}\\) 對應 \\(1\\,\\mathrm{eV}\\)。所以 \\(|\\Delta E|=0.60\\,\\mathrm{eV}\\)。"
    },
    {
      id: "semi-17",
      difficulty: "進階",
      concept: "LED 能隙與波長",
      intent: "用 \\(E=hc/\\lambda\\) 估算 LED 發光波長。",
      prompt: "某 LED 半導體能隙約 \\(2.0\\,\\mathrm{eV}\\)。若光子能量近似等於能隙，發光波長最接近多少？取 \\(hc=1240\\,\\mathrm{eV\\cdot nm}\\)。",
      options: [
        "\\(310\\,\\mathrm{nm}\\)",
        "\\(620\\,\\mathrm{nm}\\)",
        "\\(1240\\,\\mathrm{nm}\\)",
        "\\(2480\\,\\mathrm{nm}\\)"
      ],
      answer: "B",
      explanation: "\\(\\lambda=hc/E=1240/2.0=620\\,\\mathrm{nm}\\)。能隙越大，發出光子的波長越短。"
    },
    {
      id: "semi-18",
      difficulty: "進階",
      concept: "光電流估算",
      intent: "用光子數、量子效率與電荷量估算電流。",
      prompt: "一個光電二極體每秒吸收 \\(5.0\\times10^{15}\\) 個光子，量子效率為 \\(80\\%\\)。若每個有效光子產生一個電子，光電流約為多少？取 \\(e=1.6\\times10^{-19}\\,\\mathrm{C}\\)。",
      options: [
        "\\(0.64\\,\\mathrm{mA}\\)",
        "\\(6.4\\,\\mathrm{mA}\\)",
        "\\(64\\,\\mathrm{mA}\\)",
        "\\(0.64\\,\\mathrm{A}\\)"
      ],
      answer: "A",
      explanation: "每秒電子數 \\(N=0.80(5.0\\times10^{15})=4.0\\times10^{15}\\)。電流 \\(I=Ne=(4.0\\times10^{15})(1.6\\times10^{-19})=6.4\\times10^{-4}\\,\\mathrm{A}=0.64\\,\\mathrm{mA}\\)。"
    },
    {
      id: "semi-19",
      difficulty: "進階",
      concept: "像素電容與電子數",
      intent: "用 \\(Q=CV\\) 與 \\(N=Q/e\\) 估算感測器訊號。",
      prompt: "某 CMOS 像素電容 \\(C=2.0\\,\\mathrm{fF}\\)，累積電壓 \\(V=0.80\\,\\mathrm{V}\\)。若 \\(e=1.6\\times10^{-19}\\,\\mathrm{C}\\)，累積電子數約為多少？",
      options: [
        "\\(1.0\\times10^{4}\\)",
        "\\(1.0\\times10^{7}\\)",
        "\\(1.0\\times10^{12}\\)",
        "\\(1.0\\times10^{19}\\)"
      ],
      answer: "A",
      explanation: "\\(Q=CV=(2.0\\times10^{-15})(0.80)=1.6\\times10^{-15}\\,\\mathrm{C}\\)。電子數 \\(N=Q/e=(1.6\\times10^{-15})/(1.6\\times10^{-19})=1.0\\times10^{4}\\)。"
    },
    {
      id: "semi-20",
      difficulty: "進階",
      concept: "EUV 干涉微影尺度",
      intent: "整合短波長與干涉條紋週期。",
      prompt: "若以 \\(13.5\\,\\mathrm{nm}\\) 的 EUV 做干涉式微影，且 \\(\\theta=30^\\circ\\)，由 \\(p=\\lambda/(2\\sin\\theta)\\) 得條紋週期約為多少？",
      options: [
        "\\(6.75\\,\\mathrm{nm}\\)",
        "\\(13.5\\,\\mathrm{nm}\\)",
        "\\(27\\,\\mathrm{nm}\\)",
        "\\(54\\,\\mathrm{nm}\\)"
      ],
      answer: "B",
      explanation: "\\(p=13.5/(2\\times0.5)=13.5\\,\\mathrm{nm}\\)。這顯示短波長搭配大夾角可形成很細的週期條紋。"
    }
  ],
  drone: [
    {
      id: "drone-6",
      difficulty: "基礎",
      concept: "懸停時單槳升力",
      intent: "用力平衡估算每個螺旋槳所需升力。",
      prompt: "質量 \\(1.2\\,\\mathrm{kg}\\) 的四旋翼無人機懸停，取 \\(g=10\\,\\mathrm{m/s^2}\\)。若四個螺旋槳平均分擔升力，每個螺旋槳升力約多少？",
      options: [
        "\\(1.2\\,\\mathrm{N}\\)",
        "\\(3.0\\,\\mathrm{N}\\)",
        "\\(12\\,\\mathrm{N}\\)",
        "\\(48\\,\\mathrm{N}\\)"
      ],
      answer: "B",
      explanation: "懸停時總升力 \\(F=mg=1.2\\times10=12\\,\\mathrm{N}\\)。四個螺旋槳平均分擔，單槳升力為 \\(12/4=3.0\\,\\mathrm{N}\\)。"
    },
    {
      id: "drone-7",
      difficulty: "基礎",
      concept: "升力與鉛直加速度",
      intent: "確認學生能用合力方向判斷升降。",
      prompt: "若無人機總升力大於重力，且機身未傾斜，忽略空氣阻力時它會如何運動？",
      options: [
        "向上加速",
        "向下加速",
        "水平向前加速",
        "必定原地偏航"
      ],
      answer: "A",
      explanation: "鉛直合力 \\(\\sum F_y=F_{\\mathrm{lift}}-mg\\)。若 \\(F_{\\mathrm{lift}}>mg\\)，合力向上，無人機向上加速。"
    },
    {
      id: "drone-8",
      difficulty: "基礎",
      concept: "yaw、pitch、roll 定義",
      intent: "釐清三種姿態轉動軸。",
      prompt: "無人機繞鉛直軸轉向，使機頭朝向改變，這種姿態控制稱為什麼？",
      options: [
        "yaw 偏航",
        "pitch 俯仰",
        "roll 滾轉",
        "自由落體"
      ],
      answer: "A",
      explanation: "yaw 是繞鉛直軸的轉動；pitch 是機頭上仰或下俯；roll 是左右側抬高或降低。"
    },
    {
      id: "drone-9",
      difficulty: "基礎",
      concept: "反向旋轉與力矩抵消",
      intent: "理解相反轉向螺旋槳的設計目的。",
      prompt: "四旋翼常讓兩個螺旋槳順時針、兩個逆時針旋轉。最主要是為了什麼？",
      options: [
        "讓反作用力矩互相抵消，減少機身自轉",
        "讓重力消失",
        "讓所有螺旋槳都不需要電池",
        "讓空氣密度變成零"
      ],
      answer: "A",
      explanation: "螺旋槳轉動時，機身受到反作用力矩。相反轉向設計可讓總力矩近似抵消，使懸停更穩定。"
    },
    {
      id: "drone-10",
      difficulty: "中等",
      concept: "傾斜推力分解",
      intent: "用 \\(F_x=F\\sin\\theta\\) 估算水平加速度。",
      prompt: "質量 \\(2.0\\,\\mathrm{kg}\\) 的無人機總推力為 \\(10\\,\\mathrm{N}\\)，推力相對鉛直方向傾斜 \\(30^\\circ\\)。其水平分量造成的加速度約為多少？",
      options: [
        "\\(1.25\\,\\mathrm{m/s^2}\\)",
        "\\(2.5\\,\\mathrm{m/s^2}\\)",
        "\\(5.0\\,\\mathrm{m/s^2}\\)",
        "\\(10\\,\\mathrm{m/s^2}\\)"
      ],
      answer: "B",
      explanation: "水平推力 \\(F_x=F\\sin30^\\circ=10(0.5)=5\\,\\mathrm{N}\\)。水平加速度 \\(a_x=F_x/m=5/2.0=2.5\\,\\mathrm{m/s^2}\\)。"
    },
    {
      id: "drone-11",
      difficulty: "中等",
      concept: "傾斜飛行維持高度",
      intent: "用 \\(F\\cos\\theta=mg\\) 求總推力。",
      prompt: "無人機質量 \\(1.0\\,\\mathrm{kg}\\)，取 \\(g=10\\,\\mathrm{m/s^2}\\)。若機身傾斜 \\(20^\\circ\\) 但仍要維持高度，總推力量值約需滿足何式？",
      options: [
        "\\(F\\cos20^\\circ=10\\,\\mathrm{N}\\)",
        "\\(F\\sin20^\\circ=10\\,\\mathrm{N}\\)",
        "\\(F=0\\)",
        "\\(F\\tan20^\\circ=0\\)"
      ],
      answer: "A",
      explanation: "維持高度表示鉛直加速度為 0，所以總推力的鉛直分量等於重力：\\(F\\cos20^\\circ=mg=10\\,\\mathrm{N}\\)。"
    },
    {
      id: "drone-12",
      difficulty: "中等",
      concept: "力矩估算",
      intent: "用 \\(\\tau=rF\\) 計算左右升力差造成的力矩。",
      prompt: "無人機左側升力比右側大 \\(1.0\\,\\mathrm{N}\\)，兩側螺旋槳到中心距離約 \\(0.25\\,\\mathrm{m}\\)。造成的滾轉力矩量級約為多少？",
      options: [
        "\\(0.025\\,\\mathrm{N\\cdot m}\\)",
        "\\(0.25\\,\\mathrm{N\\cdot m}\\)",
        "\\(2.5\\,\\mathrm{N\\cdot m}\\)",
        "\\(25\\,\\mathrm{N\\cdot m}\\)"
      ],
      answer: "B",
      explanation: "簡化估算 \\(\\tau=r\\Delta F=(0.25)(1.0)=0.25\\,\\mathrm{N\\cdot m}\\)。力矩使機身產生角加速度。"
    },
    {
      id: "drone-13",
      difficulty: "中等",
      concept: "角加速度",
      intent: "用 \\(\\sum\\tau=I\\alpha\\) 連接力矩與轉動。",
      prompt: "若機身對某轉軸的轉動慣量 \\(I=0.050\\,\\mathrm{kg\\cdot m^2}\\)，淨力矩 \\(\\tau=0.20\\,\\mathrm{N\\cdot m}\\)，角加速度約為多少？",
      options: [
        "\\(0.010\\,\\mathrm{rad/s^2}\\)",
        "\\(0.25\\,\\mathrm{rad/s^2}\\)",
        "\\(4.0\\,\\mathrm{rad/s^2}\\)",
        "\\(10\\,\\mathrm{rad/s^2}\\)"
      ],
      answer: "C",
      explanation: "\\(\\alpha=\\tau/I=0.20/0.050=4.0\\,\\mathrm{rad/s^2}\\)。力矩越大或轉動慣量越小，姿態改變越快。"
    },
    {
      id: "drone-14",
      difficulty: "中等",
      concept: "偏航控制",
      intent: "用兩組反向旋轉螺旋槳的反作用力矩差解釋 yaw。",
      prompt: "四旋翼要在高度大致不變下偏航，可讓一組順時針螺旋槳升速、另一組逆時針螺旋槳降速，同時調整總升力。主要目的為何？",
      options: [
        "製造繞鉛直軸的淨反作用力矩",
        "讓質量改變",
        "讓重力變成水平",
        "讓所有力矩都為零"
      ],
      answer: "A",
      explanation: "偏航需要繞鉛直軸的淨力矩。改變兩組反向旋轉螺旋槳轉速差，可改變反作用力矩平衡；若總升力仍調整到接近 \\(mg\\)，高度可大致維持。"
    },
    {
      id: "drone-15",
      difficulty: "進階",
      concept: "承載重量與升力餘裕",
      intent: "用力平衡判斷載重增加後的轉速需求。",
      prompt: "無人機加掛酬載後總質量由 \\(1.0\\,\\mathrm{kg}\\) 變為 \\(1.5\\,\\mathrm{kg}\\)。若要繼續懸停，總升力需變為原來多少倍？",
      options: [
        "\\(0.50\\) 倍",
        "\\(1.0\\) 倍",
        "\\(1.5\\) 倍",
        "\\(2.25\\) 倍"
      ],
      answer: "C",
      explanation: "懸停所需總升力等於 \\(mg\\)。質量由 \\(1.0\\) 變 \\(1.5\\) 倍，所需總升力也變為 \\(1.5\\) 倍。"
    },
    {
      id: "drone-16",
      difficulty: "進階",
      concept: "鉛直加速度計算",
      intent: "用 \\(F_{\\mathrm{lift}}-mg=ma\\) 求升降加速度。",
      prompt: "質量 \\(1.0\\,\\mathrm{kg}\\) 的無人機總升力 \\(13\\,\\mathrm{N}\\)，取 \\(g=10\\,\\mathrm{m/s^2}\\)。若機身未傾斜，鉛直加速度為何？",
      options: [
        "向上 \\(3\\,\\mathrm{m/s^2}\\)",
        "向上 \\(13\\,\\mathrm{m/s^2}\\)",
        "向下 \\(3\\,\\mathrm{m/s^2}\\)",
        "0"
      ],
      answer: "A",
      explanation: "淨力 \\(F_{\\mathrm{net}}=13-10=3\\,\\mathrm{N}\\)，所以 \\(a=F_{\\mathrm{net}}/m=3/1.0=3\\,\\mathrm{m/s^2}\\)，方向向上。"
    },
    {
      id: "drone-17",
      difficulty: "進階",
      concept: "維持高度時的水平加速度",
      intent: "整合 \\(F\\cos\\theta=mg\\) 與 \\(F\\sin\\theta=ma_x\\)。",
      prompt: "無人機傾斜 \\(15^\\circ\\) 前進，且調整推力使高度不變。忽略阻力，水平加速度可寫成哪一式？",
      options: [
        "\\(a_x=g\\tan15^\\circ\\)",
        "\\(a_x=g\\cos15^\\circ\\)",
        "\\(a_x=g/\\sin15^\\circ\\)",
        "\\(a_x=0\\)"
      ],
      answer: "A",
      explanation: "維持高度有 \\(F\\cos\\theta=mg\\)，水平分量 \\(F\\sin\\theta=ma_x\\)。兩式相除得 \\(a_x=g\\tan\\theta\\)，代入 \\(\\theta=15^\\circ\\)。"
    },
    {
      id: "drone-18",
      difficulty: "進階",
      concept: "角動量守恆與反作用",
      intent: "從系統角動量觀點理解機身反轉。",
      prompt: "若單一螺旋槳由靜止快速加速成順時針旋轉，而外界對整個機身與螺旋槳系統的力矩很小，機身最可能受到什麼效果？",
      options: [
        "受到反向力矩而有逆時針轉動趨勢",
        "完全不受任何反作用",
        "重力方向改變",
        "電池電壓變為零"
      ],
      answer: "A",
      explanation: "螺旋槳角動量增加時，若外力矩很小，系統總角動量需近似守恆；機身會受到反向力矩，產生反向轉動趨勢。"
    },
    {
      id: "drone-19",
      difficulty: "進階",
      concept: "升高所需功率",
      intent: "用 \\(P=mgh/t\\) 估算爬升的最低平均功率。",
      prompt: "質量 \\(2.0\\,\\mathrm{kg}\\) 的無人機在 \\(5.0\\,\\mathrm{s}\\) 內升高 \\(10\\,\\mathrm{m}\\)，取 \\(g=10\\,\\mathrm{m/s^2}\\)。忽略損失，增加重力位能所需平均功率至少多少？",
      options: [
        "\\(20\\,\\mathrm{W}\\)",
        "\\(40\\,\\mathrm{W}\\)",
        "\\(200\\,\\mathrm{W}\\)",
        "\\(400\\,\\mathrm{W}\\)"
      ],
      answer: "B",
      explanation: "\\(\\Delta U=mgh=(2.0)(10)(10)=200\\,\\mathrm{J}\\)。平均功率 \\(P=\\Delta U/t=200/5.0=40\\,\\mathrm{W}\\)。實際馬達功率會因效率與空氣阻力而更大。"
    },
    {
      id: "drone-20",
      difficulty: "進階",
      concept: "螺旋槳轉速與升力比例",
      intent: "用比例模型處理工程情境。",
      prompt: "簡化模型中，螺旋槳升力近似與轉速平方成正比。若某螺旋槳轉速變為原來 \\(1.10\\) 倍，升力約變為原來多少？",
      options: [
        "\\(1.10\\) 倍",
        "\\(1.21\\) 倍",
        "\\(2.20\\) 倍",
        "\\(0.91\\) 倍"
      ],
      answer: "B",
      explanation: "若 \\(F\\propto \\omega^2\\)，轉速變為 \\(1.10\\) 倍時，升力比例為 \\((1.10)^2=1.21\\)。"
    }
  ],
  optic: [
    {
      id: "optic-6",
      difficulty: "基礎",
      concept: "相長與相消干涉",
      intent: "確認學生能由路徑差判斷亮暗紋。",
      prompt: "雙狹縫干涉中，兩束光到某點的路徑差為 \\(2\\lambda\\)。該點最可能出現什麼？",
      options: [
        "亮紋",
        "暗紋",
        "完全無法判斷，因為頻率必為零",
        "折射率一定為零"
      ],
      answer: "A",
      explanation: "路徑差為整數倍波長 \\(m\\lambda\\) 時相長干涉，形成亮紋。\\(2\\lambda\\) 對應 \\(m=2\\)。"
    },
    {
      id: "optic-7",
      difficulty: "基礎",
      concept: "條紋間距趨勢",
      intent: "用 \\(\\Delta y=\\lambda L/d\\) 判斷變因。",
      prompt: "雙狹縫實驗中，若只把入射光波長變長，其他條件不變，亮紋間距會如何？",
      options: [
        "變大",
        "變小",
        "不變",
        "必定變成零"
      ],
      answer: "A",
      explanation: "\\(\\Delta y=\\lambda L/d\\)。當 \\(L\\) 與 \\(d\\) 固定時，\\(\\lambda\\) 越大，條紋間距 \\(\\Delta y\\) 越大。"
    },
    {
      id: "optic-8",
      difficulty: "基礎",
      concept: "光電效應中的頻率",
      intent: "區分頻率與光強對光電子能量的影響。",
      prompt: "光電效應中，若入射光頻率高於閾頻，增加光強但頻率不變，最直接增加的是什麼？",
      options: [
        "光電子數量或光電流",
        "單一光子能量",
        "普朗克常數",
        "金屬逸出功"
      ],
      answer: "A",
      explanation: "光強增加代表每秒入射光子數增加，因此光電子數量與光電流可增加；單一光子能量仍為 \\(E=hf\\)，不因光強而改變。"
    },
    {
      id: "optic-9",
      difficulty: "基礎",
      concept: "CMOS 感測器",
      intent: "理解感測器把光訊號轉成電訊號。",
      prompt: "CMOS/CCD 感測器中的像素主要偵測哪一種量，並轉成影像亮度？",
      options: [
        "吸收光子後產生並累積的電荷量",
        "空氣中的聲壓",
        "鏡頭質量",
        "地球磁場方向"
      ],
      answer: "A",
      explanation: "每個像素可吸收光子並產生電子與電洞。累積電荷量越多，讀出的訊號通常越大，影像亮度也越高。"
    },
    {
      id: "optic-10",
      difficulty: "中等",
      concept: "由條紋間距求波長",
      intent: "用 \\(\\lambda=\\Delta y d/L\\) 完成反推。",
      prompt: "雙狹縫間距 \\(d=0.50\\,\\mathrm{mm}\\)，螢幕距離 \\(L=2.0\\,\\mathrm{m}\\)，亮紋間距 \\(\\Delta y=2.5\\,\\mathrm{mm}\\)。光波長約為多少？",
      options: [
        "\\(125\\,\\mathrm{nm}\\)",
        "\\(250\\,\\mathrm{nm}\\)",
        "\\(625\\,\\mathrm{nm}\\)",
        "\\(2500\\,\\mathrm{nm}\\)"
      ],
      answer: "C",
      explanation: "\\(\\lambda=\\Delta y d/L=(2.5\\times10^{-3})(0.50\\times10^{-3})/2.0=6.25\\times10^{-7}\\,\\mathrm{m}=625\\,\\mathrm{nm}\\)。"
    },
    {
      id: "optic-11",
      difficulty: "中等",
      concept: "抗反射膜厚",
      intent: "用四分之一波長膜厚估算。",
      prompt: "某抗反射鍍膜折射率 \\(n=1.38\\)，欲讓真空波長 \\(552\\,\\mathrm{nm}\\) 的光近似相消反射，四分之一波長膜厚約多少？",
      options: [
        "\\(50\\,\\mathrm{nm}\\)",
        "\\(100\\,\\mathrm{nm}\\)",
        "\\(200\\,\\mathrm{nm}\\)",
        "\\(552\\,\\mathrm{nm}\\)"
      ],
      answer: "B",
      explanation: "四分之一波長膜厚 \\(t=\\lambda/(4n)=552/(4\\times1.38)=100\\,\\mathrm{nm}\\)。此厚度讓兩道反射光可近似相消。"
    },
    {
      id: "optic-12",
      difficulty: "中等",
      concept: "光電效應最大動能",
      intent: "用 \\(K_{\\max}=hf-\\phi\\) 計算。",
      prompt: "某光子能量為 \\(2.5\\,\\mathrm{eV}\\)，金屬逸出功為 \\(1.8\\,\\mathrm{eV}\\)。光電子最大動能為多少？",
      options: [
        "\\(0.7\\,\\mathrm{eV}\\)",
        "\\(1.8\\,\\mathrm{eV}\\)",
        "\\(2.5\\,\\mathrm{eV}\\)",
        "\\(4.3\\,\\mathrm{eV}\\)"
      ],
      answer: "A",
      explanation: "\\(K_{\\max}=hf-\\phi=2.5-1.8=0.7\\,\\mathrm{eV}\\)。逸出功是光電子離開金屬表面需克服的最低能量。"
    },
    {
      id: "optic-13",
      difficulty: "中等",
      concept: "感測器光電流",
      intent: "用光子數與電子電量估算電流。",
      prompt: "某感測器每秒吸收 \\(1.0\\times10^{12}\\) 個光子，量子效率為 \\(50\\%\\)。若每個有效光子產生一個電子，電流約多少？取 \\(e=1.6\\times10^{-19}\\,\\mathrm{C}\\)。",
      options: [
        "\\(8.0\\times10^{-8}\\,\\mathrm{A}\\)",
        "\\(1.6\\times10^{-7}\\,\\mathrm{A}\\)",
        "\\(8.0\\times10^{-4}\\,\\mathrm{A}\\)",
        "\\(1.6\\,\\mathrm{A}\\)"
      ],
      answer: "A",
      explanation: "每秒有效電子數 \\(N=0.50(1.0\\times10^{12})=5.0\\times10^{11}\\)。電流 \\(I=Ne=(5.0\\times10^{11})(1.6\\times10^{-19})=8.0\\times10^{-8}\\,\\mathrm{A}\\)。"
    },
    {
      id: "optic-14",
      difficulty: "中等",
      concept: "薄膜相消條件",
      intent: "用光程差判斷相消反射。",
      prompt: "薄膜內折射率為 \\(n\\)，正入射光在膜內往返一次的光程差近似為多少？",
      options: [
        "\\(2nt\\)",
        "\\(nt/2\\)",
        "\\(t/n\\)",
        "\\(0\\)"
      ],
      answer: "A",
      explanation: "光在薄膜中下行再上行，幾何距離為 \\(2t\\)，乘上折射率得光程差約 \\(2nt\\)。再配合反射時的相位變化，可判斷相消或相長。"
    },
    {
      id: "optic-15",
      difficulty: "進階",
      concept: "繞射角解析度",
      intent: "用 \\(\\theta\\approx1.22\\lambda/D\\) 估算光學解析度。",
      prompt: "相機鏡頭孔徑 \\(D=2.0\\,\\mathrm{mm}\\)，光波長 \\(\\lambda=500\\,\\mathrm{nm}\\)。繞射造成的最小角度量級 \\(\\theta\\approx1.22\\lambda/D\\) 約為多少？",
      options: [
        "\\(3.1\\times10^{-4}\\,\\mathrm{rad}\\)",
        "\\(3.1\\times10^{-2}\\,\\mathrm{rad}\\)",
        "\\(0.31\\,\\mathrm{rad}\\)",
        "\\(3.1\\,\\mathrm{rad}\\)"
      ],
      answer: "A",
      explanation: "\\(\\theta\\approx1.22(500\\times10^{-9})/(2.0\\times10^{-3})=3.05\\times10^{-4}\\,\\mathrm{rad}\\)。孔徑越大或波長越短，繞射限制角度越小。"
    },
    {
      id: "optic-16",
      difficulty: "進階",
      concept: "像素飽和電子數",
      intent: "用 \\(Q=CV\\) 與基本電荷估算滿井容量。",
      prompt: "某像素電容 \\(C=2.0\\,\\mathrm{fF}\\)，飽和電壓約 \\(1.0\\,\\mathrm{V}\\)。可累積電子數約多少？取 \\(e=1.6\\times10^{-19}\\,\\mathrm{C}\\)。",
      options: [
        "\\(1.25\\times10^{4}\\)",
        "\\(1.25\\times10^{7}\\)",
        "\\(2.0\\times10^{15}\\)",
        "\\(3.2\\times10^{-34}\\)"
      ],
      answer: "A",
      explanation: "\\(Q=CV=(2.0\\times10^{-15})(1.0)=2.0\\times10^{-15}\\,\\mathrm{C}\\)。電子數 \\(N=Q/e\\approx(2.0\\times10^{-15})/(1.6\\times10^{-19})=1.25\\times10^4\\)。"
    },
    {
      id: "optic-17",
      difficulty: "進階",
      concept: "曝光時間與訊號",
      intent: "用線性累積模型判斷影像亮度。",
      prompt: "同一像素未飽和時，若入射光強固定，曝光時間由 \\(1/100\\,\\mathrm{s}\\) 改為 \\(1/25\\,\\mathrm{s}\\)，累積訊號約變為原來幾倍？",
      options: [
        "\\(1/4\\)",
        "\\(2\\)",
        "\\(4\\)",
        "\\(25\\)"
      ],
      answer: "C",
      explanation: "曝光時間比例為 \\((1/25)/(1/100)=4\\)。未飽和時累積電荷量與曝光時間成正比，所以訊號約變為 4 倍。"
    },
    {
      id: "optic-18",
      difficulty: "進階",
      concept: "干涉式微影週期",
      intent: "把雙狹縫觀念延伸到光阻週期圖形。",
      prompt: "兩束 \\(400\\,\\mathrm{nm}\\) 相干光在光阻表面交會，\\(\\theta=45^\\circ\\)。用 \\(p=\\lambda/(2\\sin\\theta)\\) 估算條紋週期，最接近多少？",
      options: [
        "\\(141\\,\\mathrm{nm}\\)",
        "\\(283\\,\\mathrm{nm}\\)",
        "\\(400\\,\\mathrm{nm}\\)",
        "\\(566\\,\\mathrm{nm}\\)"
      ],
      answer: "B",
      explanation: "\\(p=400/(2\\sin45^\\circ)=400/(2\\times0.707)\\approx283\\,\\mathrm{nm}\\)。這類明暗週期可轉成光阻圖形。"
    },
    {
      id: "optic-19",
      difficulty: "進階",
      concept: "光電效應截止波長",
      intent: "用 \\(K=hc(1/\\lambda-1/\\lambda_0)\\) 計算光電子動能。",
      prompt: "某金屬截止波長 \\(\\lambda_0=500\\,\\mathrm{nm}\\)。以 \\(400\\,\\mathrm{nm}\\) 光照射，取 \\(hc=1240\\,\\mathrm{eV\\cdot nm}\\)，最大動能約多少？",
      options: [
        "\\(0.62\\,\\mathrm{eV}\\)",
        "\\(1.24\\,\\mathrm{eV}\\)",
        "\\(2.48\\,\\mathrm{eV}\\)",
        "\\(3.10\\,\\mathrm{eV}\\)"
      ],
      answer: "A",
      explanation: "\\(K_{\\max}=hc\\left(1/\\lambda-1/\\lambda_0\\right)=1240(1/400-1/500)=0.62\\,\\mathrm{eV}\\)。"
    },
    {
      id: "optic-20",
      difficulty: "進階",
      concept: "薄膜干涉與感測器效率",
      intent: "整合反射相消與光電轉換效率。",
      prompt: "感測器表面加抗反射膜後，進入半導體的光子數由 \\(8.0\\times10^{11}\\,\\mathrm{s^{-1}}\\) 增為 \\(1.2\\times10^{12}\\,\\mathrm{s^{-1}}\\)。若量子效率不變，光電流變為原來多少倍？",
      options: [
        "\\(0.67\\) 倍",
        "\\(1.0\\) 倍",
        "\\(1.5\\) 倍",
        "\\(2.0\\) 倍"
      ],
      answer: "C",
      explanation: "量子效率不變時，光電流與進入半導體的光子數成正比。比例為 \\((1.2\\times10^{12})/(8.0\\times10^{11})=1.5\\)。"
    }
  ],
  cooling: [
    {
      id: "cooling-6",
      difficulty: "基礎",
      concept: "電能轉熱能",
      intent: "確認學生能用能量守恆理解伺服器散熱。",
      prompt: "AI 伺服器耗電後，若忽略少量訊號能與聲音，電能最後大多轉成什麼？",
      options: [
        "熱能",
        "重力位能",
        "核能",
        "真空能"
      ],
      answer: "A",
      explanation: "電子元件有電阻與開關損耗，消耗的電能最後大多以熱能形式釋放，因此高功率運算必須散熱。"
    },
    {
      id: "cooling-7",
      difficulty: "基礎",
      concept: "三種熱傳方式",
      intent: "辨認熱傳導、熱對流與熱輻射。",
      prompt: "散熱片把晶片熱量傳到金屬鰭片內部，主要屬於哪一種熱傳方式？",
      options: [
        "熱傳導",
        "熱對流",
        "核融合",
        "光電效應"
      ],
      answer: "A",
      explanation: "固體內部由高溫處往低溫處傳熱，主要是熱傳導；鰭片表面再把熱交給流動空氣或冷卻液，則屬於熱對流。"
    },
    {
      id: "cooling-8",
      difficulty: "基礎",
      concept: "水的高比熱",
      intent: "用 \\(Q=mc\\Delta T\\) 判斷液冷優勢。",
      prompt: "水冷系統常用水作冷卻液。以下哪個敘述最能用高三熱學解釋其優勢？",
      options: [
        "水的比熱大，同樣溫升可帶走較多熱量",
        "水會讓能量消失",
        "水不具有質量",
        "水能把重力變成電流"
      ],
      answer: "A",
      explanation: "\\(Q=mc\\Delta T\\)。在質量流率與溫升相近時，比熱 \\(c\\) 越大，每秒可帶走的熱量越多。"
    },
    {
      id: "cooling-9",
      difficulty: "基礎",
      concept: "PUE 定義",
      intent: "確認學生理解 PUE 的物理意義。",
      prompt: "PUE 定義為資料中心總用電功率除以 IT 設備用電功率。若 PUE 越接近 \\(1\\)，代表什麼？",
      options: [
        "非 IT 額外耗能較少，能源效率較好",
        "伺服器完全不耗電",
        "冷卻功率無限大",
        "資料中心違反能量守恆"
      ],
      answer: "A",
      explanation: "\\(PUE=P_{\\mathrm{total}}/P_{\\mathrm{IT}}\\)。理想情況接近 \\(1\\)，表示總用電幾乎都用在 IT 設備，冷卻與供電損耗較少。"
    },
    {
      id: "cooling-10",
      difficulty: "中等",
      concept: "功率與耗能",
      intent: "用 \\(E=Pt\\) 估算伺服器耗電。",
      prompt: "一台 AI 伺服器功率 \\(2.0\\,\\mathrm{kW}\\)，連續運轉 \\(1.0\\,\\mathrm{h}\\)。耗能為多少？",
      options: [
        "\\(0.5\\,\\mathrm{kWh}\\)",
        "\\(2.0\\,\\mathrm{kWh}\\)",
        "\\(20\\,\\mathrm{kWh}\\)",
        "\\(200\\,\\mathrm{kWh}\\)"
      ],
      answer: "B",
      explanation: "\\(E=Pt=(2.0\\,\\mathrm{kW})(1.0\\,\\mathrm{h})=2.0\\,\\mathrm{kWh}\\)。若換成焦耳，\\(2.0\\,\\mathrm{kWh}=7.2\\times10^6\\,\\mathrm{J}\\)。"
    },
    {
      id: "cooling-11",
      difficulty: "中等",
      concept: "水吸熱量",
      intent: "用 \\(Q=mc\\Delta T\\) 求水量。",
      prompt: "水吸收 \\(84\\,\\mathrm{kJ}\\) 熱量後升溫 \\(10^\\circ\\mathrm{C}\\)。取 \\(c=4200\\,\\mathrm{J/(kg\\cdot ^\\circ C)}\\)，水質量約多少？",
      options: [
        "\\(0.20\\,\\mathrm{kg}\\)",
        "\\(2.0\\,\\mathrm{kg}\\)",
        "\\(20\\,\\mathrm{kg}\\)",
        "\\(200\\,\\mathrm{kg}\\)"
      ],
      answer: "B",
      explanation: "\\(m=Q/(c\\Delta T)=84000/(4200\\times10)=2.0\\,\\mathrm{kg}\\)。"
    },
    {
      id: "cooling-12",
      difficulty: "中等",
      concept: "液冷質量流率",
      intent: "用 \\(P=\\dot{m}c\\Delta T\\) 求流率。",
      prompt: "液冷系統需移除 \\(30\\,\\mathrm{kW}\\) 熱量，冷卻水溫升 \\(10^\\circ\\mathrm{C}\\)。取 \\(c=4200\\,\\mathrm{J/(kg\\cdot ^\\circ C)}\\)，水的質量流率約多少？",
      options: [
        "\\(0.071\\,\\mathrm{kg/s}\\)",
        "\\(0.71\\,\\mathrm{kg/s}\\)",
        "\\(7.1\\,\\mathrm{kg/s}\\)",
        "\\(71\\,\\mathrm{kg/s}\\)"
      ],
      answer: "B",
      explanation: "\\(\\dot{m}=P/(c\\Delta T)=30000/(4200\\times10)\\approx0.71\\,\\mathrm{kg/s}\\)。"
    },
    {
      id: "cooling-13",
      difficulty: "中等",
      concept: "PUE 與額外用電",
      intent: "由 PUE 反推非 IT 用電。",
      prompt: "某資料中心 IT 設備功率 \\(8.0\\,\\mathrm{MW}\\)，PUE 為 \\(1.25\\)。整體總功率與非 IT 額外功率分別為何？",
      options: [
        "\\(10\\,\\mathrm{MW}\\)、\\(2\\,\\mathrm{MW}\\)",
        "\\(8\\,\\mathrm{MW}\\)、\\(1.25\\,\\mathrm{MW}\\)",
        "\\(6.4\\,\\mathrm{MW}\\)、\\(0\\)",
        "\\(1.25\\,\\mathrm{MW}\\)、\\(8\\,\\mathrm{MW}\\)"
      ],
      answer: "A",
      explanation: "\\(P_{\\mathrm{total}}=PUE\\times P_{\\mathrm{IT}}=1.25\\times8.0=10\\,\\mathrm{MW}\\)。非 IT 額外功率為 \\(10-8=2\\,\\mathrm{MW}\\)。"
    },
    {
      id: "cooling-14",
      difficulty: "中等",
      concept: "PUE 改善效益",
      intent: "用 PUE 計算節能量。",
      prompt: "IT 功率固定為 \\(10\\,\\mathrm{MW}\\)。若 PUE 從 \\(1.40\\) 降至 \\(1.20\\)，總功率減少多少？",
      options: [
        "\\(0.2\\,\\mathrm{MW}\\)",
        "\\(2.0\\,\\mathrm{MW}\\)",
        "\\(10\\,\\mathrm{MW}\\)",
        "\\(20\\,\\mathrm{MW}\\)"
      ],
      answer: "B",
      explanation: "原總功率 \\(1.40\\times10=14\\,\\mathrm{MW}\\)，新總功率 \\(1.20\\times10=12\\,\\mathrm{MW}\\)，減少 \\(2.0\\,\\mathrm{MW}\\)。"
    },
    {
      id: "cooling-15",
      difficulty: "進階",
      concept: "熱阻模型",
      intent: "用 \\(\\Delta T=PR_{\\theta}\\) 估算晶片溫升。",
      prompt: "某 GPU 功率 \\(300\\,\\mathrm{W}\\)，晶片到冷卻液的等效熱阻 \\(R_{\\theta}=0.20^\\circ\\mathrm{C/W}\\)。溫升約為多少？",
      options: [
        "\\(1.5^\\circ\\mathrm{C}\\)",
        "\\(15^\\circ\\mathrm{C}\\)",
        "\\(60^\\circ\\mathrm{C}\\)",
        "\\(1500^\\circ\\mathrm{C}\\)"
      ],
      answer: "C",
      explanation: "熱阻模型 \\(\\Delta T=PR_{\\theta}\\)。代入 \\(\\Delta T=300\\times0.20=60^\\circ\\mathrm{C}\\)。"
    },
    {
      id: "cooling-16",
      difficulty: "進階",
      concept: "對流散熱估算",
      intent: "用 \\(P=hA\\Delta T\\) 做量級估算。",
      prompt: "某散熱器有效面積 \\(A=0.50\\,\\mathrm{m^2}\\)，對流係數 \\(h=80\\,\\mathrm{W/(m^2\\cdot ^\\circ C)}\\)，溫差 \\(\\Delta T=20^\\circ\\mathrm{C}\\)。可帶走功率約多少？",
      options: [
        "\\(80\\,\\mathrm{W}\\)",
        "\\(400\\,\\mathrm{W}\\)",
        "\\(800\\,\\mathrm{W}\\)",
        "\\(8000\\,\\mathrm{W}\\)"
      ],
      answer: "C",
      explanation: "\\(P=hA\\Delta T=80\\times0.50\\times20=800\\,\\mathrm{W}\\)。增大面積、流速或溫差可提高對流散熱。"
    },
    {
      id: "cooling-17",
      difficulty: "進階",
      concept: "風冷與液冷比較",
      intent: "用比熱與密度比較單位體積帶熱能力。",
      prompt: "若同樣體積流量下，水比空氣更能帶走熱量，最主要可由哪些物理量理解？",
      options: [
        "水的密度與比熱都較大",
        "水沒有溫度",
        "空氣不遵守熱學定律",
        "液冷不需要能量守恆"
      ],
      answer: "A",
      explanation: "每秒帶走熱量可估為 \\(P=\\dot{m}c\\Delta T\\)，而 \\(\\dot{m}=\\rho\\dot{V}\\)。同體積流量 \\(\\dot{V}\\) 下，密度 \\(\\rho\\) 與比熱 \\(c\\) 較大者能帶走較多熱。"
    },
    {
      id: "cooling-18",
      difficulty: "進階",
      concept: "GPU 叢集液冷流率",
      intent: "整合總功率與水冷流率估算。",
      prompt: "資料中心一排伺服器含 \\(100\\) 顆 GPU，每顆耗電 \\(700\\,\\mathrm{W}\\)。若全部熱量由水帶走，水溫升 \\(7.0^\\circ\\mathrm{C}\\)，取 \\(c=4200\\,\\mathrm{J/(kg\\cdot ^\\circ C)}\\)，需質量流率約多少？",
      options: [
        "\\(0.24\\,\\mathrm{kg/s}\\)",
        "\\(2.4\\,\\mathrm{kg/s}\\)",
        "\\(24\\,\\mathrm{kg/s}\\)",
        "\\(240\\,\\mathrm{kg/s}\\)"
      ],
      answer: "B",
      explanation: "總功率 \\(P=100\\times700=70000\\,\\mathrm{W}\\)。\\(\\dot{m}=P/(c\\Delta T)=70000/(4200\\times7.0)\\approx2.4\\,\\mathrm{kg/s}\\)。"
    },
    {
      id: "cooling-19",
      difficulty: "進階",
      concept: "廢熱再利用",
      intent: "用能量守恆估算廢熱可加熱水量。",
      prompt: "某系統回收 \\(4.2\\times10^6\\,\\mathrm{J}\\) 廢熱用來加熱水，使水升溫 \\(20^\\circ\\mathrm{C}\\)。取 \\(c=4200\\,\\mathrm{J/(kg\\cdot ^\\circ C)}\\)，可加熱水質量約多少？",
      options: [
        "\\(5\\,\\mathrm{kg}\\)",
        "\\(50\\,\\mathrm{kg}\\)",
        "\\(500\\,\\mathrm{kg}\\)",
        "\\(5000\\,\\mathrm{kg}\\)"
      ],
      answer: "B",
      explanation: "\\(m=Q/(c\\Delta T)=(4.2\\times10^6)/(4200\\times20)=50\\,\\mathrm{kg}\\)。廢熱不是消失，而是可轉移到其他物體。"
    },
    {
      id: "cooling-20",
      difficulty: "進階",
      concept: "能源效率與耗電成本",
      intent: "用功率、時間與 PUE 估算整體耗能。",
      prompt: "IT 設備功率 \\(5.0\\,\\mathrm{MW}\\)，PUE 為 \\(1.30\\)。連續運轉 \\(2.0\\,\\mathrm{h}\\)，整座資料中心耗能約多少？",
      options: [
        "\\(10\\,\\mathrm{MWh}\\)",
        "\\(13\\,\\mathrm{MWh}\\)",
        "\\(6.5\\,\\mathrm{MWh}\\)",
        "\\(1.3\\,\\mathrm{MWh}\\)"
      ],
      answer: "B",
      explanation: "總功率 \\(P_{\\mathrm{total}}=1.30\\times5.0=6.5\\,\\mathrm{MW}\\)。耗能 \\(E=Pt=6.5\\times2.0=13\\,\\mathrm{MWh}\\)。"
    }
  ]
};

const pretestDifficultyRank = { "基礎": 0, "中等": 1, "進階": 2 };
for (const group of pretestData.groups) {
  group.questions.push(...(pretestExtraQuestions[group.id] || []));
  group.questions.sort((a, b) => {
    const rankDelta = (pretestDifficultyRank[a.difficulty] ?? 99) - (pretestDifficultyRank[b.difficulty] ?? 99);
    if (rankDelta) return rankDelta;
    return Number(a.id.split("-")[1]) - Number(b.id.split("-")[1]);
  });
}
const pretestQuestionTotal = pretestData.groups.reduce((sum, group) => sum + group.questions.length, 0);

fs.writeFileSync(
  dataPath,
  "\ufeff" + JSON.stringify(payload, null, 2),
  "utf8",
);

const site = String.raw`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>100-114 指考／分科物理歷屆整理</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #17202a;
      --muted: #5f6b7a;
      --line: #d7dde5;
      --panel: #ffffff;
      --paper: #f6f8fb;
      --accent: #14745f;
      --accent-2: #b83256;
      --warn: #9a5a00;
      --blue: #2d5f9a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif;
      background: var(--paper);
      color: var(--ink);
      line-height: 1.6;
    }
    header {
      padding: 28px clamp(18px, 4vw, 48px) 18px;
      background: #fff;
      border-bottom: 1px solid var(--line);
    }
    h1 {
      margin: 0 0 8px;
      font-size: clamp(24px, 4vw, 40px);
      letter-spacing: 0;
    }
    h2 { margin: 0 0 12px; font-size: 22px; }
    h3 { margin: 0 0 8px; font-size: 18px; }
    p { margin: 0 0 12px; }
    main { padding: 24px clamp(18px, 4vw, 48px) 48px; }
    .toolbar {
      display: grid;
      grid-template-columns: minmax(160px, 220px) minmax(180px, 1fr);
      gap: 12px;
      margin-top: 18px;
    }
    select, input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      color: var(--ink);
      font: inherit;
    }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(320px, .95fr);
      gap: 18px;
      align-items: start;
    }
    section, .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 18px;
    }
    .small { color: var(--muted); font-size: 14px; }
    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: #fdfefe;
      color: var(--muted);
      font-size: 13px;
      white-space: nowrap;
    }
    .badge.warn { border-color: #f0c36d; color: var(--warn); background: #fff8e8; }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    a.button {
      display: inline-flex;
      align-items: center;
      min-height: 34px;
      padding: 6px 10px;
      border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--blue);
      text-decoration: none;
      background: #fff;
    }
    .bars { display: grid; gap: 10px; }
    .bar-row {
      display: grid;
      grid-template-columns: 96px 1fr 48px;
      gap: 10px;
      align-items: center;
      font-size: 14px;
    }
    .bar {
      height: 12px;
      border-radius: 999px;
      background: #e8edf3;
      overflow: hidden;
    }
    .bar > span { display: block; height: 100%; background: var(--accent); }
    .resource-list {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0 6px 0 0;
      list-style: none;
      max-height: 224px;
      overflow-x: hidden;
      overflow-y: auto;
      scrollbar-width: thin;
    }
    .resource-list a {
      display: block;
      width: 100%;
      min-height: 58px;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      color: var(--ink);
      text-decoration: none;
      background: #fff;
    }
    .resource-list a:hover {
      border-color: var(--accent);
      background: #f1faf7;
    }
    .resource-list strong {
      display: block;
      font-size: 15px;
      line-height: 1.35;
    }
    .resource-list span {
      display: block;
      color: var(--muted);
      font-size: 13px;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th, td {
      padding: 10px 8px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    th { color: var(--muted); font-weight: 700; }
    details {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      margin-bottom: 10px;
    }
    summary {
      cursor: pointer;
      padding: 12px 14px;
      font-weight: 700;
    }
    details > div { padding: 0 14px 14px; }
    .wide { grid-column: 1 / -1; }
    .paired-panels {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 18px;
      align-items: stretch;
    }
    .paired-panels > section {
      min-height: 300px;
      height: 100%;
    }
    .question-workspace {
      display: grid;
      grid-template-columns: minmax(360px, 1fr) minmax(320px, .62fr);
      gap: 16px;
      align-items: start;
    }
    .question-preview {
      min-height: 520px;
      max-height: 76vh;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 16px;
      position: sticky;
      top: 12px;
    }
    .question-preview h3 { margin-bottom: 10px; }
    .question-text {
      white-space: pre-wrap;
      line-height: 1.75;
      font-size: 16px;
    }
    .solution-text {
      line-height: 1.85;
      font-size: 16px;
    }
    .solution-text sub,
    .solution-text sup {
      font-size: 0.78em;
      line-height: 0;
    }
    .solution-diagrams {
      display: grid;
      gap: 12px;
      margin: 14px 0 18px;
    }
    .solution-diagram {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 12px;
    }
    .solution-diagram__title {
      margin: 0 0 8px;
      font-weight: 800;
      color: var(--muted);
    }
    .solution-diagram > svg {
      display: block;
      width: 100%;
      max-width: 720px;
      height: auto;
    }
    .solution-diagram mjx-container svg,
    .solution-text mjx-container svg {
      display: inline;
      width: auto;
      max-width: none;
      height: auto;
    }
    .solution-text mjx-container {
      font-size: 1em !important;
      line-height: 1.2;
    }
    .solution-diagram .solution-text mjx-container {
      font-size: .95em !important;
    }
    .official-preview {
      display: grid;
      gap: 12px;
      margin: 12px 0 18px;
    }
    .official-preview__frame {
      width: 100%;
      height: min(74vh, 760px);
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #f7f9fc;
    }
    .official-preview__image {
      display: block;
      width: 100%;
      height: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
    }
    .official-preview__meta {
      color: var(--muted);
      font-size: 13px;
      margin: 0;
    }
    .question-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 12px 0;
    }
    .question-list {
      display: grid;
      gap: 10px;
      max-height: 76vh;
      overflow: auto;
      padding-right: 4px;
    }
    .question-item {
      width: 100%;
      min-height: 58px;
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      font: inherit;
      font-weight: 700;
      text-align: left;
      cursor: pointer;
    }
    .question-item:hover,
    .question-item.active {
      border-color: var(--accent);
      background: #f1faf7;
    }
    .mono { font-family: ui-monospace, Consolas, monospace; }
    mjx-container {
      overflow-x: auto;
      overflow-y: hidden;
      max-width: 100%;
    }
    .pretest-section {
      margin-top: 28px;
      padding: 0;
      overflow: hidden;
      border-color: #b8c7df;
      background: #f8fbff;
    }
    .pretest-hero {
      padding: clamp(22px, 4vw, 36px);
      color: #fff;
      background:
        linear-gradient(135deg, rgba(9, 26, 54, .96), rgba(24, 60, 118, .94)),
        radial-gradient(circle at 80% 20%, rgba(124, 58, 237, .42), transparent 34%);
    }
    .pretest-hero h2 {
      margin: 0 0 8px;
      font-size: clamp(26px, 4vw, 42px);
    }
    .pretest-hero p {
      max-width: 960px;
      color: #dce8ff;
      font-size: 16px;
    }
    .pretest-kicker {
      display: inline-flex;
      margin-bottom: 10px;
      padding: 4px 10px;
      border: 1px solid rgba(191, 219, 254, .65);
      border-radius: 999px;
      color: #bfdbfe;
      font-size: 13px;
      font-weight: 700;
    }
    .pretest-body {
      display: grid;
      gap: 18px;
      padding: 18px;
    }
    .pretest-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      position: sticky;
      top: 0;
      z-index: 2;
      padding: 10px;
      border: 1px solid #d4dfef;
      border-radius: 8px;
      background: rgba(248, 251, 255, .96);
      backdrop-filter: blur(8px);
    }
    .pretest-nav a,
    .pretest-nav button,
    .pretest-mode button,
    .pretest-reset {
      min-height: 36px;
      padding: 7px 12px;
      border: 1px solid #c7d2e5;
      border-radius: 999px;
      background: #fff;
      color: #12345f;
      font: inherit;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
    }
    .pretest-nav a:hover,
    .pretest-nav button:hover,
    .pretest-mode button:hover,
    .pretest-reset:hover {
      border-color: #2563eb;
      background: #eef6ff;
    }
    .pretest-grid {
      display: grid;
      gap: 14px;
    }
    .pretest-card,
    .theme-card,
    .quiz-card,
    .focus-card {
      border: 1px solid #d4dfef;
      border-radius: 8px;
      background: #fff;
      padding: 16px;
    }
    .pretest-card h3,
    .theme-card h3,
    .quiz-card h3,
    .focus-card h3 {
      color: #0f2d52;
    }
    .pretest-card ul,
    .theme-card ul,
    .focus-card ul {
      margin: 8px 0 0;
      padding-left: 20px;
    }
    .trend-list {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin: 12px 0 0;
      padding: 0;
    }
    .trend-list li {
      list-style: none;
      padding: 12px;
      border: 1px solid #d4dfef;
      border-radius: 8px;
      background: #f4f8ff;
    }
    .theme-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(320px, .65fr);
      gap: 14px;
      align-items: start;
    }
    .theme-layout > div {
      min-width: 0;
    }
    .theme-card p,
    .theme-card li,
    .formula-box,
    .ask-box {
      line-height: 1.75;
      overflow-wrap: break-word;
    }
    .definition-box,
    .reference-box {
      line-height: 1.65;
      overflow-wrap: break-word;
    }
    .concept-diagram {
      margin: 14px 0;
      padding: 12px;
      border: 1px solid #c7d2e5;
      border-radius: 8px;
      background: #f8fbff;
    }
    .concept-diagram > svg {
      display: block;
      width: 100%;
      height: auto;
    }
    .concept-diagram mjx-container svg {
      display: inline;
      width: auto;
      max-width: none;
      height: auto;
    }
    .concept-diagram p {
      margin: 10px 0 0;
      color: #334155;
      font-size: 15px;
      line-height: 1.7;
    }
    .concept-diagram .label {
      font: 700 16px "Noto Sans TC", "Microsoft JhengHei", sans-serif;
      fill: #0f172a;
      paint-order: stroke;
      stroke: #fff;
      stroke-width: 5px;
      stroke-linejoin: round;
    }
    .concept-diagram .small-label {
      font-size: 13px;
      fill: #475569;
    }
    .pretest-topic-tabs {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin: 12px 0;
    }
    .topic-tab {
      display: grid;
      grid-template-columns: 42px minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      min-height: 64px;
      padding: 10px 12px;
      border: 1px solid #c7d2e5;
      border-radius: 8px;
      background: #fff;
      color: #0f2d52;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .topic-tab:hover {
      border-color: #2563eb;
      background: #f4f8ff;
    }
    .topic-tab.active {
      border-color: #2563eb;
      background: #eaf3ff;
      box-shadow: inset 0 0 0 1px #2563eb;
    }
    .topic-tab svg {
      width: 36px;
      height: 36px;
      color: #2563eb;
    }
    .topic-tab strong,
    .topic-tab span {
      display: block;
      overflow-wrap: break-word;
    }
    .topic-tab span {
      color: #64748b;
      font-size: 13px;
      line-height: 1.35;
    }
    .formula-box,
    .ask-box,
    .definition-box,
    .reference-box,
    .explain-box {
      border-radius: 8px;
      padding: 12px;
      background: #eef6ff;
      border: 1px solid #c7d2e5;
    }
    .formula-box {
      color: #0f2d52;
      font-weight: 700;
    }
    .definition-box {
      background: #f8fafc;
    }
    .definition-box strong {
      color: #0f2d52;
    }
    .reference-box {
      background: #f5f3ff;
      border-color: #ddd6fe;
    }
    .reference-box h4 {
      margin: 0 0 8px;
      color: #4c1d95;
      font-size: 15px;
    }
    .reference-box ul {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
    }
    .reference-box li {
      list-style: none;
    }
    .reference-box a {
      color: #1d4ed8;
      font-weight: 700;
      text-decoration: none;
    }
    .reference-box a:hover {
      text-decoration: underline;
    }
    .pretest-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px;
      border: 1px solid #c7d2e5;
      border-radius: 8px;
      background: #0f2d52;
      color: #fff;
    }
    .pretest-mode {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .pretest-mode button.active {
      border-color: #60a5fa;
      background: #dbeafe;
      color: #0f2d52;
    }
    .pretest-score {
      font-weight: 800;
      color: #dbeafe;
    }
    .pretest-quiz-shell {
      max-height: 82vh;
      overflow-y: auto;
      padding-right: 6px;
      scrollbar-width: thin;
    }
    .quiz-group {
      display: grid;
      gap: 12px;
      margin-bottom: 18px;
    }
    .quiz-card {
      display: grid;
      gap: 12px;
    }
    .quiz-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      color: #475569;
      font-size: 13px;
    }
    .difficulty {
      border-radius: 999px;
      padding: 2px 8px;
      background: #eef2ff;
      color: #4338ca;
      font-weight: 700;
    }
    .option-list {
      display: grid;
      gap: 8px;
    }
    .option-btn {
      width: 100%;
      min-height: 42px;
      padding: 10px 12px;
      border: 1px solid #c7d2e5;
      border-radius: 8px;
      background: #fff;
      color: #17202a;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .option-btn:hover {
      border-color: #2563eb;
      background: #f4f8ff;
    }
    .option-btn.correct {
      border-color: #16a34a;
      background: #ecfdf3;
      color: #14532d;
      font-weight: 800;
    }
    .option-btn.wrong {
      border-color: #dc2626;
      background: #fef2f2;
      color: #7f1d1d;
      font-weight: 800;
    }
    .answer-result {
      font-weight: 800;
    }
    .answer-result.correct { color: #15803d; }
    .answer-result.wrong { color: #dc2626; }
    .teacher-intent {
      border-left: 4px solid #7c3aed;
      padding-left: 10px;
      color: #4c1d95;
      background: #f5f3ff;
    }
    .top-link { margin-left: auto; }
    @media print {
      body { background: #fff; color: #000; }
      header, .toolbar, .pretest-nav, .pretest-toolbar, .question-list, .links, .resource-list { display: none !important; }
      main { padding: 0; }
      section, .card, .pretest-section, .pretest-card, .theme-card, .quiz-card, .focus-card {
        border-color: #999;
        box-shadow: none;
        break-inside: avoid;
      }
      .pretest-hero {
        color: #000;
        background: #fff;
        border-bottom: 2px solid #000;
      }
      .pretest-hero p,
      .pretest-kicker { color: #000; }
      .pretest-quiz-shell { max-height: none; overflow: visible; }
      .option-btn { border-color: #999; }
      a { color: #000; }
    }
    @media (max-width: 900px) {
      .grid, .toolbar { grid-template-columns: 1fr; }
      .paired-panels { grid-template-columns: 1fr; }
      .paired-panels > section { min-height: auto; }
      .question-workspace { grid-template-columns: 1fr; }
      .question-preview { position: static; min-height: auto; max-height: none; }
      .question-list { max-height: none; }
      .bar-row { grid-template-columns: 82px 1fr 44px; }
      .pretest-grid, .trend-list, .theme-layout { grid-template-columns: 1fr; }
      .pretest-topic-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .topic-tab { grid-template-columns: 34px minmax(0, 1fr); padding: 9px; }
      .topic-tab svg { width: 30px; height: 30px; }
      .pretest-nav { position: static; }
      .pretest-quiz-shell { max-height: none; overflow: visible; padding-right: 0; }
    }
  </style>
  <script>
    window.MathJax = {
      tex: {
        inlineMath: [["\\(", "\\)"]],
        displayMath: [["\\[", "\\]"]],
        processEscapes: true
      },
      svg: { fontCache: "global" }
    };
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
</head>
<body>
  <header>
    <h1>100-114 學年度指考／分科物理歷屆整理</h1>
    <p>薇閣高級中學林群智老師整理編製</p>
    <div class="toolbar">
      <select id="yearSelect" aria-label="選擇年度"></select>
    </div>
  </header>
  <main>
    <div class="grid">
      <section>
        <h2 id="examTitle">年度資料</h2>
        <div id="examMeta"></div>
        <div class="links" id="officialLinks"></div>
      </section>
      <section>
        <h2>單元比例</h2>
        <div class="bars" id="unitBars"></div>
      </section>
      <div class="wide paired-panels">
        <section>
          <h2>題型統計</h2>
          <table>
            <thead><tr><th>題型</th><th>題數</th></tr></thead>
            <tbody id="literacyTable"></tbody>
          </table>
        </section>
        <section>
          <h2>該年度時事與素養延伸連結</h2>
          <ul class="resource-list" id="resourceLinks"></ul>
        </section>
      </div>
      <section class="wide">
        <h2>逐題詳解</h2>
        <div class="question-workspace">
          <article class="question-preview" id="questionPreview"></article>
          <div class="question-list" id="questionList"></div>
        </div>
      </section>
    </div>
    <section class="wide pretest-section" id="pretestTop">
      <div class="pretest-hero">
        <span class="pretest-kicker">高三考前複習｜科技情境｜素養題</span>
        <h2>2026 分科測驗物理科技情境與素養題預試題</h2>
        <p>半導體製程｜無人機｜光電感測｜AI資料中心散熱</p>
        <p>內容以高中物理可掌握的模型、公式、圖表判讀與實驗探究為主，協助把科技新聞與真實工程情境轉換成可解題的物理語言。</p>
      </div>
      <div class="pretest-body">
        <nav class="pretest-nav" aria-label="預試題快速導覽">
          <a href="#trendOverview">命題趨勢</a>
          <a href="#themeSemiconductor">半導體製程</a>
          <a href="#themeDrone">無人機操控</a>
          <a href="#themeOptic">干涉與感測</a>
          <a href="#themeCooling">資料中心散熱</a>
          <a href="#pretestQuiz">互動預試題</a>
          <button type="button" id="pretestTopButton" class="top-link">回到頂部</button>
        </nav>

        <article class="pretest-card" id="trendOverview">
          <h3>命題趨勢總覽</h3>
          <p>近年物理考題更重視「把真實情境翻譯成物理模型」。考生不只要會代公式，也要能辨認物理量、讀圖、估算量級，並把力學、波動、電磁、熱學與近代物理整合到同一個科技案例中。</p>
          <ul class="trend-list">
            <li><strong>真實科技情境化</strong><br>半導體、無人機、感測器、資料中心等都可成為題幹。</li>
            <li><strong>跨章節整合</strong><br>同一題可能同時用到波動、能量、電場與熱學。</li>
            <li><strong>圖表判讀</strong><br>從曲線斜率、截距、比例與座標軸單位讀出物理量。</li>
            <li><strong>實驗探究</strong><br>理解控制變因、誤差來源與可測量量。</li>
            <li><strong>物理模型建立</strong><br>先畫力圖、光路、能量流，再決定公式。</li>
            <li><strong>減少單純公式代入</strong><br>會考「為什麼可用這個模型」，不是只問數字。</li>
          </ul>
        </article>

        <div class="pretest-grid">
          <article class="theme-card" id="themeSemiconductor">
            <h3>主題一：半導體製程中的物理</h3>
            <div class="theme-layout">
              <div>
                <p>半導體製程可用「材料導電性可被控制」和「光把圖形轉到晶圓」兩條主線理解。矽晶圓先被塗上光阻，光刻 Photolithography 讓光罩圖形曝光在光阻上；顯影後保留下來的光阻可當作保護層，未被保護處再經蝕刻或離子佈植，形成電路結構。若用兩束相干光在光阻上形成明暗條紋，也可利用干涉強度分布製作週期性微結構，這就是干涉式微影的基本想法。</p>
                <div class="concept-diagram">
                  <svg viewBox="0 0 760 430" role="img" aria-label="干涉式微影示意圖">
                    <defs>
                      <marker id="beamArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb"></path>
                      </marker>
                      <marker id="periodArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155"></path>
                      </marker>
                    </defs>
                    <rect x="70" y="286" width="620" height="48" rx="8" fill="#fde68a" stroke="#d97706" stroke-width="2"></rect>
                    <rect x="70" y="334" width="620" height="62" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-width="2"></rect>
                    <line x1="380" y1="74" x2="380" y2="286" stroke="#64748b" stroke-dasharray="8 8" stroke-width="2"></line>
                    <line x1="250" y1="76" x2="352" y2="272" stroke="#2563eb" stroke-width="8" stroke-linecap="round" marker-end="url(#beamArrow)"></line>
                    <line x1="510" y1="76" x2="408" y2="272" stroke="#7c3aed" stroke-width="8" stroke-linecap="round" marker-end="url(#beamArrow)"></line>
                    <path d="M 338 134 A 58 58 0 0 1 422 134" fill="none" stroke="#64748b" stroke-width="2"></path>
                    <path d="M 356 118 A 30 30 0 0 1 380 108" fill="none" stroke="#64748b" stroke-width="2"></path>
                    <path d="M 380 108 A 30 30 0 0 1 404 118" fill="none" stroke="#64748b" stroke-width="2"></path>
                    <path d="M 112 236 C 142 214 172 214 202 236 S 262 258 292 236 S 352 214 382 236 S 442 258 472 236 S 532 214 562 236 S 622 258 652 236" fill="none" stroke="#0f172a" stroke-width="3"></path>
                    <line x1="110" y1="286" x2="650" y2="286" stroke="#64748b" stroke-width="1.5"></line>
                    <rect x="112" y="290" width="34" height="40" fill="#1d4ed8" opacity=".35"></rect>
                    <rect x="202" y="290" width="34" height="40" fill="#1d4ed8" opacity=".35"></rect>
                    <rect x="292" y="290" width="34" height="40" fill="#1d4ed8" opacity=".35"></rect>
                    <rect x="382" y="290" width="34" height="40" fill="#1d4ed8" opacity=".35"></rect>
                    <rect x="472" y="290" width="34" height="40" fill="#1d4ed8" opacity=".35"></rect>
                    <rect x="562" y="290" width="34" height="40" fill="#1d4ed8" opacity=".35"></rect>
                    <line x1="129" y1="272" x2="219" y2="272" stroke="#334155" stroke-width="2" marker-start="url(#periodArrow)" marker-end="url(#periodArrow)"></line>
                    <line x1="129" y1="260" x2="129" y2="282" stroke="#334155" stroke-width="2"></line>
                    <line x1="219" y1="260" x2="219" y2="282" stroke="#334155" stroke-width="2"></line>
                    <text x="232" y="278" class="label small-label">週期 p</text>
                    <text x="206" y="52" class="label">相干光 1</text>
                    <text x="466" y="52" class="label">相干光 2</text>
                    <text x="430" y="122" class="label small-label">兩束光夾角 2θ</text>
                    <text x="321" y="120" class="label small-label">半角 θ</text>
                    <text x="112" y="224" class="label small-label">光阻表面光強 I(x)</text>
                    <text x="116" y="318" class="label small-label">亮紋曝光較強</text>
                    <text x="450" y="318" class="label small-label">暗紋曝光較弱</text>
                    <text x="336" y="317" class="label">光阻層</text>
                    <text x="332" y="372" class="label">矽晶圓</text>
                    <text x="92" y="420" class="label small-label">顯影後得到週期性光阻圖形，再用蝕刻把圖形轉移到晶圓；保留或移除取決於正光阻或負光阻。</text>
                  </svg>
                  <p>兩束相干平面波對稱入射，單束光與法線夾角為 \(\theta\)，兩束光夾角為 \(2\theta\)。在光阻表面距中心 \(x\) 的位置，兩束光路徑差可寫成 \(\Delta=2x\sin\theta\)；亮紋條件為 \(\Delta=m\lambda\)，暗紋條件為 \(\Delta=\left(m+\frac{1}{2}\right)\lambda\)。相鄰亮紋間距為 \(p=\lambda/(2\sin\theta)\)。顯影後先得到週期性光阻圖形，再以蝕刻把圖形轉移到矽晶圓。</p>
                </div>
                <p>EUV 使用約 \(13.5\,\mathrm{nm}\) 的極紫外光。從高三波動觀點看，曝光圖形的最小可分辨尺度受繞射限制影響，波長越短，繞射造成的模糊越小，因此更有利於做出細線寬。摻雜則是把少量雜質原子放入矽晶格，改變自由電子或電洞的數量；P 型、N 型半導體接在一起形成 PN 接面，內建電場能分離電子與電洞，連結到 LED、太陽能電池、CMOS 感測器等元件。</p>
                <ul>
                  <li>矽晶圓、光刻、EUV、繞射限制</li>
                  <li>摻雜、P 型與 N 型半導體、PN 接面</li>
                  <li>LED、太陽能電池、CMOS 感測器</li>
                </ul>
              </div>
              <div>
                <div class="definition-box"><strong>名詞定義：</strong>EUV 是 Extreme Ultraviolet，指波長約 \(13.5\,\mathrm{nm}\) 的極紫外光；摻雜是加入微量雜質以改變多數載子；PN 接面是 P 型與 N 型半導體接觸後形成的電荷分離區與內建電場。</div>
                <div class="formula-box">高三必懂公式：\(E=hf\)、\(c=f\lambda\)、解析度與波長成正相關，可用 \(d\propto \lambda\) 判斷趨勢。</div>
                <div class="ask-box">可能分科測驗問法：短波長為何提升解析度？摻雜後多數載子為何？PN 接面如何分離光生載子？</div>
                <div class="reference-box">
                  <h4>參考網站／影片</h4>
                  <ul>
                    <li><a href="https://www.asml.com/zh-tw/technology?icmp=tw-learn-more-about-asml-technology" target="_blank" rel="noopener">ASML：全方位微影技術介紹</a></li>
                    <li><a href="https://zh.wikipedia.org/zh-tw/%E5%8D%8A%E5%B0%8E%E9%AB%94" target="_blank" rel="noopener">半導體基本概念</a></li>
                    <li><a href="https://www.youtube.com/results?search_query=EUV+%E6%A5%B5%E7%B4%AB%E5%A4%96%E5%85%89+%E5%BE%AE%E5%BD%B1+%E5%8E%9F%E7%90%86" target="_blank" rel="noopener">YouTube：EUV 極紫外光微影原理</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </article>

          <article class="theme-card" id="themeDrone">
            <h3>主題二：無人機飛行操控原理</h3>
            <div class="theme-layout">
              <div>
                <p>四旋翼無人機的核心是「總力控制平動、總力矩控制轉動」。懸停時，四個螺旋槳的總升力等於重力，鉛直方向合力為零。若要前進，機身會先產生俯仰 pitch，使總推力不再完全鉛直；推力的水平分量提供向前加速度，鉛直分量則仍需接近重力以維持高度。</p>
                <p>每個螺旋槳旋轉時都會給機身一個反作用力矩。四軸通常讓相鄰螺旋槳反向旋轉，使角動量與反作用力矩大致抵消。若要偏航 yaw，可讓順時針與逆時針兩組螺旋槳的轉速不再平衡，產生繞鉛直軸的淨力矩；若要滾轉 roll 或俯仰 pitch，則改變左右或前後螺旋槳升力，讓機身先傾斜，再利用推力分量改變行進方向。</p>
                <ul>
                  <li>升力與重力、懸停條件</li>
                  <li>前進、後退、左右移動</li>
                  <li>yaw、pitch、roll、力矩平衡</li>
                </ul>
              </div>
              <div>
                <div class="definition-box"><strong>名詞定義：</strong>yaw 是繞鉛直軸的偏航轉動；pitch 是機頭上仰或下俯的俯仰轉動；roll 是左右側抬高或降低的滾轉。角動量守恆表示沒有外力矩時，系統總角動量不會自行改變。</div>
                <div class="formula-box">高三必懂公式：\(\sum F=ma\)、\(\tau=rF\sin\theta\)、\(\sum \tau=I\alpha\)。</div>
                <div class="ask-box">可能分科測驗問法：哪一組螺旋槳轉速改變會造成偏航？機身傾斜時推力如何分解？</div>
                <div class="reference-box">
                  <h4>參考網站／影片</h4>
                  <ul>
                    <li><a href="https://hom-wang.gitbooks.io/quadcopter/content/02_Principles.html" target="_blank" rel="noopener">四軸無人機：飛行原理</a></li>
                    <li><a href="https://learn.parallax.com/courses/understanding-the-physics-of-multirotor-flight/lessons/rotation-torque-and-angular-momentum/" target="_blank" rel="noopener">Parallax：Rotation, Torque and Angular Momentum</a></li>
                    <li><a href="https://www.youtube.com/watch?v=rNo2Gb_9ag4" target="_blank" rel="noopener">YouTube：四軸無人機原理影片</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </article>

          <article class="theme-card" id="themeOptic">
            <h3>主題三：雙狹縫／薄膜干涉 × 光電元件 × 半導體感測器</h3>
            <div class="theme-layout">
              <div>
                <p>干涉題的重點是路徑差造成相位差。雙狹縫中，兩束相干光在螢幕上疊加，亮紋代表相長干涉、暗紋代表相消干涉；條紋間距可用 \(\Delta y=\lambda L/d\) 估算。若把這種明暗分布照在光阻上，亮處與暗處的化學反應不同，顯影後可形成週期性圖案，再透過蝕刻把圖案轉移到材料表面，這就是干涉式微影與奈米圖案製作的基本模型。</p>
                <p>薄膜干涉則是同一束光在膜的上下表面反射後再疊加。抗反射鍍膜利用相消干涉降低反射，使更多光進入鏡頭或太陽能電池。光電效應與半導體感測器則說明「光訊號如何變成電訊號」：CMOS/CCD 的像素吸收光子後產生電子與電洞，累積電荷再被讀出成影像亮度。</p>
                <ul>
                  <li>雙狹縫干涉與條紋間距</li>
                  <li>薄膜干涉與抗反射鍍膜</li>
                  <li>光電效應、CMOS/CCD、光電轉換</li>
                </ul>
              </div>
              <div>
                <div class="definition-box"><strong>名詞定義：</strong>相干光是頻率相同且相位關係穩定的光；光阻是受光後化學性質改變的薄膜；CMOS/CCD 感測器是把像素中的光生電荷轉成電子訊號的影像元件。</div>
                <div class="formula-box">高三必懂公式：\(\Delta y=\lambda L/d\)、\(2nt=(m+\frac12)\lambda\) 類型的相消條件、\(K_{\max}=hf-\phi\)。</div>
                <div class="ask-box">可能分科測驗問法：改變狹縫距離條紋如何變？抗反射膜厚如何估？光強與頻率對光電效應有何差異？</div>
                <div class="reference-box">
                  <h4>參考網站／影片</h4>
                  <ul>
                    <li><a href="https://phet.colorado.edu/en/simulation/wave-interference" target="_blank" rel="noopener">PhET：Wave Interference 模擬</a></li>
                    <li><a href="https://mtlsites.mit.edu/annual_reports/2010/scanning-beam-interference-lithography/" target="_blank" rel="noopener">MIT：Scanning-beam Interference Lithography</a></li>
                    <li><a href="https://www.ansys.com/zh-tw/simulation-topics/what-is-cmos-image-sensor" target="_blank" rel="noopener">Ansys：什麼是 CMOS 影像感測器</a></li>
                    <li><a href="https://www.youtube.com/results?search_query=%E9%9B%99%E7%8B%B9%E7%B8%AB%E5%B9%B2%E6%B6%89+CMOS+%E5%BD%B1%E5%83%8F%E6%84%9F%E6%B8%AC%E5%99%A8+%E7%89%A9%E7%90%86" target="_blank" rel="noopener">YouTube：雙狹縫干涉與 CMOS 感測器</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </article>

          <article class="theme-card" id="themeCooling">
            <h3>主題四：AI資料中心散熱 × 熱學 × 能量效率</h3>
            <div class="theme-layout">
              <div>
                <p>AI 資料中心的熱學核心是能量守恆。GPU 與伺服器消耗的電能，除了極少部分轉成訊號或聲音外，最後大多以熱的形式釋放，因此高功率運算一定需要散熱設計。晶片到散熱片主要靠熱傳導，散熱片到空氣或冷卻液主要靠熱對流，任何高溫物體也會以熱輻射放出能量。</p>
                <p>風冷利用空氣流動帶走熱；液冷則利用水或冷卻液的高比熱與較大密度，在同樣溫升下帶走更多熱量。若伺服器功率為 \(P\)，每秒產生的熱量約為 \(P\)；冷卻液帶走熱量可用 \(P=\dot{m}c\Delta T\) 估算。資料中心還會用 PUE 衡量能源效率，判斷冷卻、照明與供電轉換等非 IT 用電是否過高。</p>
                <ul>
                  <li>GPU 耗電、熱產生與能量守恆</li>
                  <li>熱傳導、熱對流、熱輻射</li>
                  <li>風冷與液冷、水的高比熱、PUE</li>
                </ul>
              </div>
              <div>
                <div class="definition-box"><strong>名詞定義：</strong>PUE 是 Power Usage Effectiveness，定義為資料中心總用電除以 IT 設備用電：\(PUE=P_{\mathrm{total}}/P_{\mathrm{IT}}\)。理想值接近 1，表示大多數電能都用在伺服器本身，額外冷卻與供電損耗較少。</div>
                <div class="formula-box">高三必懂公式：\(Q=mc\Delta T\)、\(P=E/t\)、\(PUE=P_{\mathrm{total}}/P_{\mathrm{IT}}\)。</div>
                <div class="ask-box">可能分科測驗問法：冷卻水流量如何估算？PUE 怎麼判讀？為什麼液冷比風冷適合高功率設備？</div>
                <div class="reference-box">
                  <h4>參考網站／影片</h4>
                  <ul>
                    <li><a href="https://www.supermicro.com/zh_tw/glossary/pue-for-data-center" target="_blank" rel="noopener">Supermicro：資料中心的 PUE 是什麼？</a></li>
                    <li><a href="https://www.gigabyte.com/Glossary/pue?lan=zh-tw" target="_blank" rel="noopener">GIGABYTE：PUE 電力使用效率</a></li>
                    <li><a href="https://www.youtube.com/results?search_query=%E8%B3%87%E6%96%99%E4%B8%AD%E5%BF%83+%E7%AF%80%E8%83%BD+%E6%95%A3%E7%86%B1+PUE" target="_blank" rel="noopener">YouTube：資料中心節能與散熱</a></li>
                    <li><a href="https://www.youtube.com/results?search_query=%E8%B3%87%E6%96%99%E4%B8%AD%E5%BF%83+PUE+%E6%B6%B2%E5%86%B7+%E6%95%A3%E7%86%B1" target="_blank" rel="noopener">YouTube：資料中心 PUE 與液冷散熱</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </article>
        </div>

        <article class="pretest-card" id="pretestQuiz">
          <h3>互動式預試題</h3>
          <div class="pretest-toolbar">
            <div>
              <div class="pretest-score" id="pretestScore">目前答對 0 / ${pretestQuestionTotal} 題，已作答 0 題，總分 0 分</div>
              <div class="small">學生模式作答後顯示解析；教師模式直接顯示答案、解析與命題意圖。</div>
            </div>
            <div class="pretest-mode" aria-label="預試題模式">
              <button type="button" data-pretest-mode="student" class="active">學生模式</button>
              <button type="button" data-pretest-mode="teacher">教師模式</button>
              <button type="button" class="pretest-reset" id="pretestReset">重新作答</button>
            </div>
          </div>
          <div class="pretest-topic-tabs" id="pretestTopicTabs" aria-label="預試題主題切換"></div>
          <div class="pretest-quiz-shell" id="pretestQuestions"></div>
        </article>
      </div>
    </section>
  </main>
  <script>
    const DATA = ${JSON.stringify(payload)};
    const PRETEST_DATA = ${JSON.stringify(pretestData)};
    const state = { year: DATA.exams[0]?.year };
    const pretestState = { mode: "student", answers: {}, activeTopic: PRETEST_DATA.groups[0]?.id || "" };
    const $ = (id) => document.getElementById(id);
    const assetVersion = encodeURIComponent(DATA.generatedAt || "");
    const linkLabels = {
      questionPdf: "\u8a66\u984c PDF",
      questionDocx: "\u8a66\u984c DOCX",
      answerSheet: "\u7b54\u6848\u5377",
      choiceAnswer: "\u9078\u64c7\u984c\u7b54\u6848",
      nonChoiceRubric: "\u975e\u9078\u64c7\u984c\u8a55\u5206\u539f\u5247"
    };
    const topicResourceLinks = {
      "量子科學與量子科技": [
        { title: "UNESCO 國際量子科學與科技年", source: "UNESCO", url: "https://www.unesco.org/zh/years/quantum-science-technology" },
        { title: "高速量子運算國家戰略", source: "國科會", url: "https://www.nstc.gov.tw/folksonomy/detail/13db2558-7c8a-48d7-aa5b-c6b18d5a1a5e?l=ch" }
      ],
      "波動、聲學與地震科學": [
        { title: "天搖地動感受地震波", source: "中央氣象署", url: "https://pweb.cwa.gov.tw/PopularScience/ec/ec_19.html" },
        { title: "強震即時警報與 P 波、S 波", source: "中央氣象署", url: "https://pweb.cwa.gov.tw/PopularScience/ec/ec_10.html" }
      ],
      "電磁科技與電路應用": [
        { title: "電磁波譜與生活應用", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E9%9B%BB%E7%A3%81%E6%B3%A2%E8%AD%9C+%E7%94%9F%E6%B4%BB%E6%87%89%E7%94%A8+%E7%89%A9%E7%90%86" },
        { title: "電路組裝套件：直流電", source: "PhET", url: "https://phet.colorado.edu/sims/html/circuit-construction-kit-dc-virtual-lab/latest/circuit-construction-kit-dc-virtual-lab_zh_TW.html" },
        { title: "RFID 與悠遊卡電磁感應", source: "YouTube", url: "https://www.youtube.com/results?search_query=RFID+%E6%82%A0%E9%81%8A%E5%8D%A1+%E9%9B%BB%E7%A3%81%E6%84%9F%E6%87%89+%E7%89%A9%E7%90%86" }
      ],
      "資料判讀與實驗量測": [
        { title: "測量不確定度與誤差分析", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E6%B8%AC%E9%87%8F%E4%B8%8D%E7%A2%BA%E5%AE%9A%E5%BA%A6+%E8%AA%A4%E5%B7%AE%E5%88%86%E6%9E%90+%E7%89%A9%E7%90%86" },
        { title: "實驗誤差與有效數字", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%AF%A6%E9%A9%97%E8%AA%A4%E5%B7%AE+%E6%9C%89%E6%95%88%E6%95%B8%E5%AD%97+%E9%AB%98%E4%B8%AD%E7%89%A9%E7%90%86" }
      ],
      "熱力學與能源轉換": [
        { title: "氣體特性互動模擬", source: "PhET", url: "https://phet.colorado.edu/sims/html/gas-properties/1.1.4/gas-properties_zh_TW.html" }
      ],
      "原子結構與核物理": [
        { title: "游離輻射防護與生活", source: "行政院原子能委員會", url: "https://www.aec.gov.tw/" },
        { title: "核能與輻射安全", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E8%BC%BB%E5%B0%84+%E6%A0%B8%E8%83%BD+%E5%AE%89%E5%85%A8+%E7%89%A9%E7%90%86" }
      ],
      "交通、運動與工程情境": [
        { title: "適當拉大車距，反應才有距離", source: "交通部高速公路局", url: "https://www.freeway.gov.tw/Print.aspx?cnid=193&p=42842" },
        { title: "行車保持安全距離", source: "交通部高速公路局", url: "https://www.freeway.gov.tw/Print.aspx?cnid=516&p=2230" }
      ]
    };
    const defaultResourceLinks = [
      { title: "電磁波譜與生活應用", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E9%9B%BB%E7%A3%81%E6%B3%A2%E8%AD%9C+%E7%94%9F%E6%B4%BB%E6%87%89%E7%94%A8+%E7%89%A9%E7%90%86" },
      { title: "測量不確定度與實驗誤差", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E6%B8%AC%E9%87%8F%E4%B8%8D%E7%A2%BA%E5%AE%9A%E5%BA%A6+%E5%AF%A6%E9%A9%97%E8%AA%A4%E5%B7%AE+%E9%AB%98%E4%B8%AD%E7%89%A9%E7%90%86" },
      { title: "電路組裝套件：直流電", source: "PhET", url: "https://phet.colorado.edu/sims/html/circuit-construction-kit-dc-virtual-lab/latest/circuit-construction-kit-dc-virtual-lab_zh_TW.html" },
      { title: "天搖地動感受地震波", source: "中央氣象署", url: "https://pweb.cwa.gov.tw/PopularScience/ec/ec_19.html" }
    ];
    const yearResourceLinks = {
      114: [
        { title: "第1題：2025 國際量子科學與科技年", source: "UNESCO", url: "https://www.unesco.org/zh/years/quantum-science-technology" },
        { title: "第11題：光電效應與光子能量", source: "PhET", url: "https://phet.colorado.edu/sims/cheerpj/photoelectric/latest/photoelectric.html?simulation=photoelectric" },
        { title: "第5題：太陽系行星與衛星資料", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%A4%AA%E9%99%BD%E7%B3%BB+%E8%A1%8C%E6%98%9F+%E8%A1%9B%E6%98%9F+%E7%89%A9%E7%90%86" },
        { title: "第23題：等電位線與電場線實驗", source: "PhET", url: "https://phet.colorado.edu/sims/html/charges-and-fields/latest/charges-and-fields_zh_TW.html" }
      ],
      113: [
        { title: "第9題：2024 花蓮地震與地震波", source: "中央氣象署", url: "https://pweb.cwa.gov.tw/PopularScience/ec/ec_19.html" },
        { title: "第9題：台北101 調諧質量阻尼器", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%8F%B0%E5%8C%97101+%E8%AA%BF%E8%AB%A7%E8%B3%AA%E9%87%8F%E9%98%BB%E5%B0%BC%E5%99%A8+%E7%89%A9%E7%90%86" },
        { title: "第20題：風力發電與能源轉換", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E9%A2%A8%E5%8A%9B%E7%99%BC%E9%9B%BB+%E8%83%BD%E6%BA%90%E8%BD%89%E6%8F%9B+%E9%AB%98%E4%B8%AD%E7%89%A9%E7%90%86" },
        { title: "第22題：電磁波是橫波與偏振", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E9%9B%BB%E7%A3%81%E6%B3%A2+%E6%A9%AB%E6%B3%A2+%E5%81%8F%E6%8C%AF+%E7%89%A9%E7%90%86" }
      ],
      112: [
        { title: "第12題：太陽光譜與氦元素發現", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%A4%AA%E9%99%BD%E5%85%89%E8%AD%9C+%E6%B0%A6%E5%85%83%E7%B4%A0+%E7%89%A9%E7%90%86" },
        { title: "第2題：電磁波譜與光的傳播", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E9%9B%BB%E7%A3%81%E6%B3%A2%E8%AD%9C+%E5%85%89%E7%9A%84%E5%82%B3%E6%92%AD+%E9%AB%98%E4%B8%AD%E7%89%A9%E7%90%86" },
        { title: "第7題：光電效應概念模擬", source: "PhET", url: "https://phet.colorado.edu/sims/cheerpj/photoelectric/latest/photoelectric.html?simulation=photoelectric" },
        { title: "第15題：太陽系行星資料", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%A4%AA%E9%99%BD%E7%B3%BB+%E8%A1%8C%E6%98%9F+%E9%87%8D%E5%8A%9B+%E7%89%A9%E7%90%86" }
      ],
      111: [
        { title: "第21題：拉格朗日點與太空任務", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E6%8B%89%E6%A0%BC%E6%9C%97%E6%97%A5%E9%BB%9E+%E8%A9%B9%E5%A7%86%E6%96%AF%E9%9F%8B%E4%BC%AF+%E7%89%A9%E7%90%86" },
        { title: "第23-24題：密立根光電效應數據", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%AF%86%E7%AB%8B%E6%A0%B9+%E5%85%89%E9%9B%BB%E6%95%88%E6%87%89+%E6%88%AA%E6%AD%A2%E9%9B%BB%E5%A3%93" },
        { title: "第18題：氣體熱力學互動模擬", source: "PhET", url: "https://phet.colorado.edu/sims/html/gas-properties/1.1.4/gas-properties_zh_TW.html" },
        { title: "第9題：光的波粒二象性", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%85%89%E7%9A%84%E6%B3%A2%E7%B2%92%E4%BA%8C%E8%B1%A1%E6%80%A7+%E9%AB%98%E4%B8%AD%E7%89%A9%E7%90%86" }
      ],
      110: [
        { title: "第18題：熱氣球與理想氣體", source: "PhET", url: "https://phet.colorado.edu/sims/html/gas-properties/1.1.4/gas-properties_zh_TW.html" },
        { title: "第19題：銫-137與輻射基礎", source: "行政院原子能委員會", url: "https://www.aec.gov.tw/" },
        { title: "第20題：悠遊卡、RFID與電磁感應", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E6%82%A0%E9%81%8A%E5%8D%A1+RFID+%E9%9B%BB%E7%A3%81%E6%84%9F%E6%87%89+%E7%89%A9%E7%90%86" },
        { title: "第23題：雙狹縫干涉與單狹縫繞射", source: "PhET", url: "https://phet.colorado.edu/sims/html/wave-interference/latest/wave-interference_zh_TW.html" }
      ],
      109: [
        { title: "第3題：X射線、醫學影像與輻射", source: "YouTube", url: "https://www.youtube.com/results?search_query=X%E5%B0%84%E7%B7%9A+%E9%86%AB%E5%AD%B8%E5%BD%B1%E5%83%8F+%E8%BC%BB%E5%B0%84+%E7%89%A9%E7%90%86" },
        { title: "第6題：經顱磁刺激與電磁場", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E7%B6%93%E9%A1%B1%E7%A3%81%E5%88%BA%E6%BF%80+%E9%9B%BB%E7%A3%81%E5%A0%B4+%E7%89%A9%E7%90%86" },
        { title: "第12題：輕軌電車供電與電磁場", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E8%BC%95%E8%BB%8C+%E4%BE%9B%E9%9B%BB+%E9%9B%BB%E7%A3%81%E5%A0%B4+%E7%89%A9%E7%90%86" },
        { title: "第22題：聲納與聲波反射", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E8%81%B2%E7%B4%8D+%E8%81%B2%E6%B3%A2%E5%8F%8D%E5%B0%84+%E7%89%A9%E7%90%86" }
      ],
      108: [
        { title: "第2-3題：2018 諾貝爾物理與光學鑷子", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%85%89%E5%AD%B8%E9%91%B7%E5%AD%90+2018+%E8%AB%BE%E8%B2%9D%E7%88%BE%E7%89%A9%E7%90%86" },
        { title: "第10-11題：GPS衛星與無線電訊號", source: "YouTube", url: "https://www.youtube.com/results?search_query=GPS+%E8%A1%9B%E6%98%9F+%E7%84%A1%E7%B7%9A%E9%9B%BB%E8%A8%8A%E8%99%9F+%E7%89%A9%E7%90%86" },
        { title: "第12題：無線充電與電磁感應", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E7%84%A1%E7%B7%9A%E5%85%85%E9%9B%BB+%E9%9B%BB%E7%A3%81%E6%84%9F%E6%87%89+%E7%89%A9%E7%90%86" },
        { title: "第13-14題：太陽帆與光壓推進", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%A4%AA%E9%99%BD%E5%B8%86+%E5%85%89%E5%A3%93+%E5%85%89%E5%AD%90%E5%8B%95%E9%87%8F" }
      ],
      107: [
        { title: "第12題：電磁流量計與醫療裝置", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E9%9B%BB%E7%A3%81%E6%B5%81%E9%87%8F%E8%A8%88+%E9%86%AB%E7%99%82+%E7%89%A9%E7%90%86" },
        { title: "第24題：耳溫槍、黑體輻射與紅外線", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E8%80%B3%E6%BA%AB%E6%A7%8D+%E9%BB%91%E9%AB%94%E8%BC%BB%E5%B0%84+%E7%B4%85%E5%A4%96%E7%B7%9A" },
        { title: "第2題：光電子與磁場量測", source: "PhET", url: "https://phet.colorado.edu/sims/cheerpj/photoelectric/latest/photoelectric.html?simulation=photoelectric" },
        { title: "第24題：輻射與日常生活", source: "行政院原子能委員會", url: "https://www.aec.gov.tw/" }
      ],
      106: [
        { title: "第6題：黑盒子、聲納與水下聲波", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E9%BB%91%E7%9B%92%E5%AD%90+%E8%81%B2%E7%B4%8D+%E6%B0%B4%E4%B8%8B%E8%81%B2%E6%B3%A2+%E7%89%A9%E7%90%86" },
        { title: "第12題：光電倍增管與弱光偵測", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%85%89%E9%9B%BB%E5%80%8D%E5%A2%9E%E7%AE%A1+%E5%BC%B1%E5%85%89%E5%81%B5%E6%B8%AC+%E7%89%A9%E7%90%86" },
        { title: "第18-19題：光電效應與物質波", source: "PhET", url: "https://phet.colorado.edu/sims/cheerpj/photoelectric/latest/photoelectric.html?simulation=photoelectric" },
        { title: "第17題：電磁感應與磁通量", source: "PhET", url: "https://phet.colorado.edu/sims/html/faradays-law/latest/faradays-law_zh_TW.html" }
      ],
      105: [
        { title: "第18題：狹縫干涉與繞射實驗", source: "PhET", url: "https://phet.colorado.edu/sims/html/wave-interference/latest/wave-interference_zh_TW.html" },
        { title: "第20題：雷射光壓與光子動量", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E9%9B%B7%E5%B0%84+%E5%85%89%E5%A3%93+%E5%85%89%E5%AD%90%E5%8B%95%E9%87%8F" },
        { title: "第21題：鋰離子能階與原子光譜", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%8E%9F%E5%AD%90%E5%85%89%E8%AD%9C+%E8%83%BD%E9%9A%8E+%E9%AB%98%E4%B8%AD%E7%89%A9%E7%90%86" },
        { title: "第13題：載流導線間的磁力", source: "PhET", url: "https://phet.colorado.edu/sims/html/magnets-and-electromagnets/latest/magnets-and-electromagnets_zh_TW.html" }
      ],
      104: [
        { title: "第6題：光纖與全反射通訊", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%85%89%E7%BA%96+%E5%85%A8%E5%8F%8D%E5%B0%84+%E9%80%9A%E8%A8%8A+%E7%89%A9%E7%90%86" },
        { title: "第8題：煞車距離與安全車距", source: "交通部高速公路局", url: "https://www.freeway.gov.tw/Print.aspx?cnid=193&p=42842" },
        { title: "第12題：電荷運動與電磁場", source: "PhET", url: "https://phet.colorado.edu/sims/html/charges-and-fields/latest/charges-and-fields_zh_TW.html" },
        { title: "第18題：量子化與微小線圈", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E9%87%8F%E5%AD%90%E5%8C%96+%E5%BE%AE%E5%B0%8F%E7%B7%9A%E5%9C%88+%E7%89%A9%E7%90%86" }
      ],
      103: [
        { title: "第7題：水滴折射與彩虹色散", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%BD%A9%E8%99%B9+%E6%B0%B4%E6%BB%B4+%E6%8A%98%E5%B0%84+%E8%89%B2%E6%95%A3+%E7%89%A9%E7%90%86" },
        { title: "第10題：核電餘熱與反應爐安全", source: "行政院原子能委員會", url: "https://www.aec.gov.tw/" },
        { title: "第18題：雷射干涉與繞射量測", source: "PhET", url: "https://phet.colorado.edu/sims/html/wave-interference/latest/wave-interference_zh_TW.html" },
        { title: "第22題：X射線最短波長與電子加速", source: "YouTube", url: "https://www.youtube.com/results?search_query=X%E5%B0%84%E7%B7%9A+%E6%9C%80%E7%9F%AD%E6%B3%A2%E9%95%B7+%E9%9B%BB%E5%AD%90%E5%8A%A0%E9%80%9F" }
      ],
      102: [
        { title: "第18題：電磁波源、雷射與無線電", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E9%9B%BB%E7%A3%81%E6%B3%A2+%E9%9B%B7%E5%B0%84+%E7%84%A1%E7%B7%9A%E9%9B%BB+%E7%89%A9%E7%90%86" },
        { title: "第20題：太陽能、核融合與質能轉換", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%A4%AA%E9%99%BD%E8%83%BD+%E6%A0%B8%E8%9E%8D%E5%90%88+%E8%B3%AA%E8%83%BD%E8%BD%89%E6%8F%9B" },
        { title: "第19題：德布羅意物質波與氫原子", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%BE%B7%E5%B8%83%E7%BE%85%E6%84%8F+%E7%89%A9%E8%B3%AA%E6%B3%A2+%E6%B0%AB%E5%8E%9F%E5%AD%90" },
        { title: "第6題：薄膜折射與干涉", source: "PhET", url: "https://phet.colorado.edu/sims/html/bending-light/latest/bending-light_zh_TW.html" }
      ],
      101: [
        { title: "速度選擇器：電場與磁場交互作用", source: "PhET", url: "https://phet.colorado.edu/sims/html/charges-and-fields/latest/charges-and-fields_zh_TW.html" },
        { title: "電路與歐姆定律實驗", source: "PhET", url: "https://phet.colorado.edu/sims/html/circuit-construction-kit-dc-virtual-lab/latest/circuit-construction-kit-dc-virtual-lab_zh_TW.html" },
        { title: "熱學與氣體性質互動模擬", source: "PhET", url: "https://phet.colorado.edu/sims/html/gas-properties/1.1.4/gas-properties_zh_TW.html" },
        { title: "電磁波譜與生活應用", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E9%9B%BB%E7%A3%81%E6%B3%A2%E8%AD%9C+%E7%94%9F%E6%B4%BB%E6%87%89%E7%94%A8+%E7%89%A9%E7%90%86" }
      ],
      100: [
        { title: "第16題：福島核事故與核能安全", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E7%A6%8F%E5%B3%B6%E6%A0%B8%E4%BA%8B%E6%95%85+%E6%A0%B8%E8%83%BD%E5%AE%89%E5%85%A8+%E7%89%A9%E7%90%86" },
        { title: "第24題：光電效應與截止電壓", source: "PhET", url: "https://phet.colorado.edu/sims/cheerpj/photoelectric/latest/photoelectric.html?simulation=photoelectric" },
        { title: "第22題：波以耳定律與氣體實驗", source: "PhET", url: "https://phet.colorado.edu/sims/html/gas-properties/1.1.4/gas-properties_zh_TW.html" },
        { title: "第4題：彈簧振盪與高空彈跳模型", source: "PhET", url: "https://phet.colorado.edu/sims/html/masses-and-springs/latest/masses-and-springs_zh_TW.html" }
      ]
    };
    const yearYoutubeLinks = {
      114: [
        { title: "YouTube：2025 國際量子科學與科技年", source: "YouTube", url: "https://www.youtube.com/results?search_query=2025+%E5%9C%8B%E9%9A%9B%E9%87%8F%E5%AD%90%E7%A7%91%E5%AD%B8%E8%88%87%E7%A7%91%E6%8A%80%E5%B9%B4" },
        { title: "YouTube：光電效應與波耳模型", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%85%89%E9%9B%BB%E6%95%88%E6%87%89+%E6%B3%A2%E8%80%B3%E6%B0%AB%E5%8E%9F%E5%AD%90%E6%A8%A1%E5%9E%8B" }
      ],
      113: [
        { title: "YouTube：2024 花蓮地震與地震波", source: "YouTube", url: "https://www.youtube.com/results?search_query=2024+%E8%8A%B1%E8%93%AE%E5%9C%B0%E9%9C%87+%E5%9C%B0%E9%9C%87%E6%B3%A2" },
        { title: "YouTube：台北101 阻尼器", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%8F%B0%E5%8C%97101+%E9%98%BB%E5%B0%BC%E5%99%A8+%E8%AA%BF%E8%AB%A7%E8%B3%AA%E9%87%8F%E9%98%BB%E5%B0%BC%E5%99%A8" }
      ],
      112: [
        { title: "YouTube：太陽光譜與氦元素", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%A4%AA%E9%99%BD%E5%85%89%E8%AD%9C+%E6%B0%A6%E5%85%83%E7%B4%A0" },
        { title: "YouTube：電磁波譜與光電效應", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E9%9B%BB%E7%A3%81%E6%B3%A2%E8%AD%9C+%E5%85%89%E9%9B%BB%E6%95%88%E6%87%89" }
      ],
      111: [
        { title: "YouTube：拉格朗日點", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E6%8B%89%E6%A0%BC%E6%9C%97%E6%97%A5%E9%BB%9E+%E8%A9%B9%E5%A7%86%E6%96%AF%E9%9F%8B%E4%BC%AF+%E7%89%A9%E7%90%86" },
        { title: "YouTube：密立根光電效應", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%AF%86%E7%AB%8B%E6%A0%B9+%E5%85%89%E9%9B%BB%E6%95%88%E6%87%89" }
      ],
      110: [
        { title: "YouTube：熱氣球與理想氣體", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E7%86%B1%E6%B0%A3%E7%90%83+%E7%90%86%E6%83%B3%E6%B0%A3%E9%AB%94+%E7%89%A9%E7%90%86" },
        { title: "YouTube：悠遊卡 RFID 電磁感應", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E6%82%A0%E9%81%8A%E5%8D%A1+RFID+%E9%9B%BB%E7%A3%81%E6%84%9F%E6%87%89" }
      ],
      109: [
        { title: "YouTube：X射線醫學影像", source: "YouTube", url: "https://www.youtube.com/results?search_query=X%E5%B0%84%E7%B7%9A+%E9%86%AB%E5%AD%B8%E5%BD%B1%E5%83%8F+%E7%89%A9%E7%90%86" },
        { title: "YouTube：聲納與聲波反射", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E8%81%B2%E7%B4%8D+%E8%81%B2%E6%B3%A2%E5%8F%8D%E5%B0%84+%E7%89%A9%E7%90%86" }
      ],
      108: [
        { title: "YouTube：光學鑷子 2018 諾貝爾物理", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%85%89%E5%AD%B8%E9%91%B7%E5%AD%90+2018+%E8%AB%BE%E8%B2%9D%E7%88%BE%E7%89%A9%E7%90%86" },
        { title: "YouTube：GPS 衛星與無線充電", source: "YouTube", url: "https://www.youtube.com/results?search_query=GPS+%E8%A1%9B%E6%98%9F+%E7%84%A1%E7%B7%9A%E5%85%85%E9%9B%BB+%E7%89%A9%E7%90%86" }
      ],
      107: [
        { title: "YouTube：電磁流量計", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E9%9B%BB%E7%A3%81%E6%B5%81%E9%87%8F%E8%A8%88+%E8%A1%80%E6%B5%81+%E7%89%A9%E7%90%86" },
        { title: "YouTube：耳溫槍與黑體輻射", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E8%80%B3%E6%BA%AB%E6%A7%8D+%E9%BB%91%E9%AB%94%E8%BC%BB%E5%B0%84+%E7%89%A9%E7%90%86" }
      ],
      106: [
        { title: "YouTube：黑盒子與水下聲納", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E9%BB%91%E7%9B%92%E5%AD%90+%E6%B0%B4%E4%B8%8B%E8%81%B2%E7%B4%8D+%E8%B6%85%E8%81%B2%E6%B3%A2" },
        { title: "YouTube：光電倍增管", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%85%89%E9%9B%BB%E5%80%8D%E5%A2%9E%E7%AE%A1+%E7%89%A9%E7%90%86" }
      ],
      105: [
        { title: "YouTube：狹縫干涉與繞射", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E7%8B%B9%E7%B8%AB%E5%B9%B2%E6%B6%89+%E7%B9%9E%E5%B0%84+%E7%89%A9%E7%90%86" },
        { title: "YouTube：光壓與光子動量", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%85%89%E5%A3%93+%E5%85%89%E5%AD%90%E5%8B%95%E9%87%8F+%E5%A4%AA%E9%99%BD%E5%B8%86" }
      ],
      104: [
        { title: "YouTube：光纖全反射", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%85%89%E7%BA%96+%E5%85%A8%E5%8F%8D%E5%B0%84+%E7%89%A9%E7%90%86" },
        { title: "YouTube：煞車距離與摩擦力", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E7%85%9E%E8%BB%8A%E8%B7%9D%E9%9B%A2+%E6%91%A9%E6%93%A6%E5%8A%9B+%E7%89%A9%E7%90%86" }
      ],
      103: [
        { title: "YouTube：彩虹與水滴折射", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%BD%A9%E8%99%B9+%E6%B0%B4%E6%BB%B4%E6%8A%98%E5%B0%84+%E7%89%A9%E7%90%86" },
        { title: "YouTube：核電廠餘熱", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E6%A0%B8%E9%9B%BB%E5%BB%A0+%E9%A4%98%E7%86%B1+%E5%8F%8D%E6%87%89%E7%88%90" }
      ],
      102: [
        { title: "YouTube：太陽能與核融合", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%A4%AA%E9%99%BD%E8%83%BD+%E6%A0%B8%E8%9E%8D%E5%90%88+%E8%B3%AA%E8%83%BD%E8%BD%89%E6%8F%9B" },
        { title: "YouTube：德布羅意物質波", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%BE%B7%E5%B8%83%E7%BE%85%E6%84%8F+%E7%89%A9%E8%B3%AA%E6%B3%A2+%E6%B0%AB%E5%8E%9F%E5%AD%90" }
      ],
      101: [
        { title: "YouTube：速度選擇器", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E9%80%9F%E5%BA%A6%E9%81%B8%E6%93%87%E5%99%A8+%E9%9B%BB%E5%A0%B4+%E7%A3%81%E5%A0%B4" },
        { title: "YouTube：直流電路與歐姆定律", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E7%9B%B4%E6%B5%81%E9%9B%BB%E8%B7%AF+%E6%AD%90%E5%A7%86%E5%AE%9A%E5%BE%8B+%E7%89%A9%E7%90%86" }
      ],
      100: [
        { title: "YouTube：福島核事故與核能安全", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E7%A6%8F%E5%B3%B6%E6%A0%B8%E4%BA%8B%E6%95%85+%E6%A0%B8%E8%83%BD%E5%AE%89%E5%85%A8+%E7%89%A9%E7%90%86" },
        { title: "YouTube：光電效應與截止電壓", source: "YouTube", url: "https://www.youtube.com/results?search_query=%E5%85%89%E9%9B%BB%E6%95%88%E6%87%89+%E6%88%AA%E6%AD%A2%E9%9B%BB%E5%A3%93" }
      ]
    };

    function getAnalysis(year) {
      return DATA.analysis.find((item) => item.year === Number(year));
    }

    function esc(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    function renderPlainScientificText(value) {
      const supMap = { "+": "⁺", "-": "⁻", "−": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "(": "⁽", ")": "⁾" };
      const toSup = (text) => String(text).replace(/[+\-−0-9()]/g, (char) => supMap[char] || char);
      const toSub = (text) => "<sub>" + esc(text) + "</sub>";
      const subscriptTokens = [
        ["Ktotal", "K<sub>total</sub>"], ["Kmax", "K<sub>max</sub>"], ["Kmin", "K<sub>min</sub>"],
        ["Etotal", "E<sub>total</sub>"], ["Eloss", "E<sub>loss</sub>"], ["E_loss", "E<sub>loss</sub>"],
        ["ΔUg", "ΔU<sub>g</sub>"], ["Ug", "U<sub>g</sub>"], ["Uf", "U<sub>f</sub>"],
        ["WF", "W<sub>F</sub>"], ["Wf", "W<sub>f</sub>"],
        ["vrms", "v<sub>rms</sub>"], ["vmax", "v<sub>max</sub>"], ["vmin", "v<sub>min</sub>"],
        ["Vin", "V<sub>in</sub>"], ["Vout", "V<sub>out</sub>"], ["Vstop", "V<sub>stop</sub>"],
        ["Vp", "V<sub>p</sub>"], ["Vs", "V<sub>s</sub>"], ["Np", "N<sub>p</sub>"], ["Ns", "N<sub>s</sub>"],
        ["nᵢ", "n<sub>i</sub>"], ["nf", "n<sub>f</sub>"], ["ni", "n<sub>i</sub>"],
        ["rG", "r<sub>G</sub>"], ["rS", "r<sub>S</sub>"], ["rf", "r<sub>f</sub>"],
        ["r甲", "r<sub>甲</sub>"], ["r乙", "r<sub>乙</sub>"], ["r丙", "r<sub>丙</sub>"],
        ["ωG", "ω<sub>G</sub>"], ["ωS", "ω<sub>S</sub>"], ["ω0", "ω<sub>0</sub>"],
        ["m甲", "m<sub>甲</sub>"], ["m乙", "m<sub>乙</sub>"], ["m丙", "m<sub>丙</sub>"],
        ["mp", "m<sub>p</sub>"],
        ["v甲0", "v<sub>甲0</sub>"], ["v乙0", "v<sub>乙0</sub>"], ["v丙0", "v<sub>丙0</sub>"],
        ["v甲", "v<sub>甲</sub>"], ["v乙", "v<sub>乙</sub>"], ["v丙", "v<sub>丙</sub>"],
        ["P甲", "P<sub>甲</sub>"], ["P乙", "P<sub>乙</sub>"], ["P丙", "P<sub>丙</sub>"],
        ["Q甲", "Q<sub>甲</sub>"], ["Q乙", "Q<sub>乙</sub>"], ["Q丙", "Q<sub>丙</sub>"],
        ["T甲", "T<sub>甲</sub>"], ["T乙", "T<sub>乙</sub>"], ["T丙", "T<sub>丙</sub>"], ["Tf", "T<sub>f</sub>"], ["TL", "T<sub>L</sub>"],
        ["θ1", "θ<sub>1</sub>"], ["θ2", "θ<sub>2</sub>"], ["θ3", "θ<sub>3</sub>"],
        ["μ0", "μ<sub>0</sub>"], ["μs", "μ<sub>s</sub>"], ["μk", "μ<sub>k</sub>"],
        ["v0", "v<sub>0</sub>"], ["v1", "v<sub>1</sub>"], ["v2", "v<sub>2</sub>"], ["v3", "v<sub>3</sub>"], ["vf", "v<sub>f</sub>"],
        ["u0", "u<sub>0</sub>"], ["u1", "u<sub>1</sub>"], ["u2", "u<sub>2</sub>"], ["u3", "u<sub>3</sub>"],
        ["a0", "a<sub>0</sub>"], ["a1", "a<sub>1</sub>"], ["a2", "a<sub>2</sub>"],
        ["r0", "r<sub>0</sub>"], ["r1", "r<sub>1</sub>"], ["r2", "r<sub>2</sub>"], ["r3", "r<sub>3</sub>"],
        ["R1", "R<sub>1</sub>"], ["R2", "R<sub>2</sub>"], ["R3", "R<sub>3</sub>"],
        ["T0", "T<sub>0</sub>"], ["T1", "T<sub>1</sub>"], ["T2", "T<sub>2</sub>"], ["T3", "T<sub>3</sub>"],
        ["Ts", "T<sub>s</sub>"], ["Tp", "T<sub>p</sub>"],
        ["P1", "P<sub>1</sub>"], ["P2", "P<sub>2</sub>"], ["P3", "P<sub>3</sub>"], ["P4", "P<sub>4</sub>"],
        ["P0", "P<sub>0</sub>"],
        ["Q1", "Q<sub>1</sub>"], ["Q2", "Q<sub>2</sub>"], ["Q3", "Q<sub>3</sub>"],
        ["V0", "V<sub>0</sub>"], ["V1", "V<sub>1</sub>"], ["V2", "V<sub>2</sub>"], ["V3", "V<sub>3</sub>"],
        ["Imax", "I<sub>max</sub>"], ["I0", "I<sub>0</sub>"], ["I1", "I<sub>1</sub>"], ["I2", "I<sub>2</sub>"], ["I3", "I<sub>3</sub>"],
        ["Is", "I<sub>s</sub>"], ["Iu", "I<sub>u</sub>"],
        ["E0", "E<sub>0</sub>"], ["E1", "E<sub>1</sub>"], ["E2", "E<sub>2</sub>"], ["E3", "E<sub>3</sub>"],
        ["K1", "K<sub>1</sub>"], ["K2", "K<sub>2</sub>"], ["K3", "K<sub>3</sub>"],
        ["m0", "m<sub>0</sub>"], ["m1", "m<sub>1</sub>"], ["m2", "m<sub>2</sub>"], ["m3", "m<sub>3</sub>"],
        ["n0", "n<sub>0</sub>"], ["n1", "n<sub>1</sub>"], ["n2", "n<sub>2</sub>"], ["n3", "n<sub>3</sub>"],
        ["n甲", "n<sub>甲</sub>"], ["n乙", "n<sub>乙</sub>"], ["n丙", "n<sub>丙</sub>"],
        ["f0", "f<sub>0</sub>"], ["f1", "f<sub>1</sub>"], ["f2", "f<sub>2</sub>"],
        ["Fd", "F<sub>d</sub>"], ["Fs", "F<sub>s</sub>"], ["Fb", "F<sub>b</sub>"],
        ["fk", "f<sub>k</sub>"],
        ["μk", "μ<sub>k</sub>"], ["μs", "μ<sub>s</sub>"], ["μβ", "μ<sub>β</sub>"],
        ["λmax", "λ<sub>max</sub>"], ["λmin", "λ<sub>min</sub>"],
        ["λ1", "λ<sub>1</sub>"], ["λ2", "λ<sub>2</sub>"],
        ["θ1", "θ<sub>1</sub>"], ["θ2", "θ<sub>2</sub>"],
        ["τ1", "τ<sub>1</sub>"], ["τ2", "τ<sub>2</sub>"],
        ["Δy", "Δy"], ["ΔP3", "ΔP<sub>3</sub>"], ["ΔP4", "ΔP<sub>4</sub>"],
        ["tP", "t<sub>P</sub>"], ["tS", "t<sub>S</sub>"], ["Req", "R<sub>eq</sub>"],
        ["f甲", "f<sub>甲</sub>"], ["f乙", "f<sub>乙</sub>"], ["f丙", "f<sub>丙</sub>"]
      ];
      const applySubscriptTokens = (text) => subscriptTokens
        .sort((a, b) => b[0].length - a[0].length)
        .reduce((output, [token, replacement]) => {
          const escapedToken = token.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
          const rightBoundary = /[0-9]$/.test(token) ? "(?![0-9_])" : "(?![A-Za-z0-9_])";
          return output.replace(new RegExp("(^|[^A-Za-z0-9_])" + escapedToken + rightBoundary, "g"), "$1" + replacement);
        }, text);
      return applySubscriptTokens(esc(value)
        .replace(/\bPi\b/g, "π")
        .replace(/\bpi\b/g, "π")
        .replace(/\balpha\b/g, "α")
        .replace(/\bbeta\b/g, "β")
        .replace(/\bgamma\b/g, "γ")
        .replace(/\btheta\b/g, "θ")
        .replace(/\blambda\b/g, "λ")
        .replace(/\bomega\b/g, "ω")
        .replace(/\bDelta\b/g, "Δ")
        .replace(/\^\{([^}]+)\}/g, (_, exp) => toSup(exp))
        .replace(/\^\(([^)]+)\)/g, (_, exp) => toSup(exp))
        .replace(/\^([+\-−]?\d+)/g, (_, exp) => toSup(exp))
        .replace(/_([0-9]+|[A-Za-z\u0370-\u03ff]+)/g, (_, sub) => toSub(sub))
      )
        .replace(/\n{2,}/g, "</p><p class=\"solution-text\">")
        .replace(/\n/g, "<br>");
    }

    function renderScientificText(value) {
      const parts = String(value ?? "").split(/(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g);
      return parts.map((part) => {
        if (part.startsWith("\\(") || part.startsWith("\\[")) {
          return esc(part);
        }
        return renderPlainScientificText(part);
      }).join("");
    }

    function cleanQuestionText(value) {
      return String(value || "")
        .replace(/(?:\s*[（(][A-EＡ-Ｅ][）)]\s*){2,}/g, " ")
        .replace(/\s+([，。！？；：、])/g, "$1")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    function renderSolutionDiagrams(diagrams) {
      if (!Array.isArray(diagrams) || !diagrams.length) return "";
      return '<div class="solution-diagrams">' + diagrams.map((diagram) => {
        const title = diagram.title ? '<p class="solution-diagram__title">' + esc(diagram.title) + '</p>' : '';
        const body = String(diagram.svg || '').trim().startsWith('<svg')
          ? diagram.svg
          : '<p class="solution-text">' + renderScientificText(diagram.text || '') + '</p>';
        return '<figure class="solution-diagram">' + title + body + '</figure>';
      }).join("") + '</div>';
    }

    function allPretestQuestions() {
      return PRETEST_DATA.groups.flatMap((group) => group.questions);
    }

    function updatePretestScore() {
      const questions = allPretestQuestions();
      const correct = questions.filter((question) => pretestState.answers[question.id] === question.answer).length;
      const answered = questions.filter((question) => pretestState.answers[question.id]).length;
      const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
      $("pretestScore").textContent = "目前答對 " + correct + " / " + questions.length + " 題，已作答 " + answered + " 題，總分 " + score + " 分";
    }

    function pretestOptionClass(question, letter) {
      const selected = pretestState.answers[question.id];
      const reveal = pretestState.mode === "teacher" || Boolean(selected);
      if (!reveal) return "";
      if (letter === question.answer) return " correct";
      if (selected === letter && selected !== question.answer) return " wrong";
      return "";
    }

    function pretestTopicLabel(id) {
      return {
        semi: "半導體製程",
        drone: "無人機操控",
        optic: "干涉與感測",
        cooling: "資料中心散熱"
      }[id] || id;
    }

    function pretestTopicIcon(id) {
      const icons = {
        semi: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="13" y="13" width="22" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M8 16h5M8 24h5M8 32h5M35 16h5M35 24h5M35 32h5M16 8v5M24 8v5M32 8v5M16 35v5M24 35v5M32 35v5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M19 24h10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
        drone: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="4" fill="currentColor"/><path d="M24 24 12 12M24 24l12-12M24 24 12 36M24 24l12 12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="10" cy="10" r="5" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="38" cy="10" r="5" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="10" cy="38" r="5" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="38" cy="38" r="5" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
        optic: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 28c5-11 11-11 16 0s11 11 16 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M8 14h32M12 36h28" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M18 14v22M30 14v22" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/></svg>',
        cooling: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="4" fill="currentColor"/><path d="M24 8c6 0 8 5 4 10l-4 6M40 24c0 6-5 8-10 4l-6-4M24 40c-6 0-8-5-4-10l4-6M8 24c0-6 5-8 10-4l6 4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" stroke-width="2" opacity=".35"/></svg>'
      };
      return icons[id] || "";
    }

    function renderPretestTopicTabs() {
      $("pretestTopicTabs").innerHTML = PRETEST_DATA.groups.map((group) =>
        '<button type="button" class="topic-tab' + (group.id === pretestState.activeTopic ? ' active' : '') + '" data-pretest-topic="' + esc(group.id) + '">' +
          pretestTopicIcon(group.id) +
          '<span><strong>' + esc(pretestTopicLabel(group.id)) + '</strong><span>' + group.questions.length + ' 題</span></span>' +
        '</button>'
      ).join("");
    }

    function renderPretestQuestion(question, index) {
      const selected = pretestState.answers[question.id];
      const reveal = pretestState.mode === "teacher" || Boolean(selected);
      const isCorrect = selected === question.answer;
      const result = selected
        ? '<p class="answer-result ' + (isCorrect ? 'correct' : 'wrong') + '">' + (isCorrect ? '答對了' : '答錯了') + '：正確答案為 ' + question.answer + '</p>'
        : "";
      const teacherIntent = pretestState.mode === "teacher"
        ? '<p class="teacher-intent"><strong>命題意圖：</strong>' + renderScientificText(question.intent) + '</p>'
        : "";
      const explain = reveal
        ? '<div class="explain-box">' +
            result +
            '<p><strong>正確答案：</strong>' + esc(question.answer) + '</p>' +
            '<p><strong>詳細解析：</strong>' + renderScientificText(question.explanation) + '</p>' +
            '<p><strong>對應物理概念：</strong>' + renderScientificText(question.concept) + '</p>' +
            teacherIntent +
          '</div>'
        : "";
      return '<article class="quiz-card" id="' + esc(question.id) + '" data-question-id="' + esc(question.id) + '">' +
        '<h3>第 ' + (index + 1) + ' 題</h3>' +
        '<div class="quiz-meta"><span class="difficulty">' + esc(question.difficulty) + '</span><span>' + renderScientificText(question.concept) + '</span></div>' +
        '<p>' + renderScientificText(question.prompt) + '</p>' +
        '<div class="option-list">' +
          question.options.map((option, index) => {
            const letter = "ABCD"[index];
            return '<button type="button" class="option-btn' + pretestOptionClass(question, letter) + '" data-question-id="' + esc(question.id) + '" data-answer="' + letter + '">' +
              '<strong>' + letter + '.</strong> ' + renderScientificText(option) +
            '</button>';
          }).join("") +
        '</div>' +
        explain +
      '</article>';
    }

    function renderPretest() {
      const activeGroup = PRETEST_DATA.groups.find((group) => group.id === pretestState.activeTopic) || PRETEST_DATA.groups[0];
      if (activeGroup) pretestState.activeTopic = activeGroup.id;
      renderPretestTopicTabs();
      $("pretestQuestions").innerHTML = activeGroup ?
        '<section class="quiz-group" id="quiz-' + esc(activeGroup.id) + '">' +
          '<div class="focus-card">' +
            '<h3>' + esc(activeGroup.title) + '</h3>' +
            '<p><strong>命題重點：</strong>' + renderScientificText(activeGroup.focus) + '</p>' +
          '</div>' +
          activeGroup.questions.map(renderPretestQuestion).join("") +
        '</section>'
      : "";
      document.querySelectorAll("[data-pretest-mode]").forEach((button) => {
        button.classList.toggle("active", button.dataset.pretestMode === pretestState.mode);
      });
      updatePretestScore();
      typesetPretest();
    }

    function typesetPretest() {
      if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
        window.MathJax.typesetPromise([$("pretestTop")]).catch(() => {});
      }
    }

    function renderSelectors() {
      $("yearSelect").innerHTML = DATA.exams.map((exam) => '<option value="' + exam.year + '">' + exam.year + " 學年度 " + exam.type + '</option>').join("");
      $("yearSelect").value = state.year;
    }

    function renderExam() {
      const exam = DATA.exams.find((item) => item.year === Number(state.year));
      const analysis = getAnalysis(state.year);
      if (!exam || !analysis) return;
      $("examTitle").textContent = exam.year + " 學年度 " + exam.type + "物理";
      $("examMeta").innerHTML = '<p>發布日期：' + exam.publishDate + '</p>' +
        '<p><strong>實驗與素養探究題：</strong>' + (analysis.inquiryQuestionCount || 0) + ' 題（' + (analysis.inquiryQuestionPercent || 0) + '%）</p>' +
        '<p><strong>當年度試題特色分析：</strong>' + (analysis.annualFeatureAnalysis || analysis.note || '') + '</p>';
      $("officialLinks").innerHTML = Object.entries(exam.official)
        .filter(([, url]) => url)
        .map(([key, url]) => '<a class="button" href="' + url + '" target="_blank" rel="noopener">' + linkLabels[key] + '</a>')
        .join("");
      $("unitBars").innerHTML = analysis.unitStats.map((row) =>
        '<div class="bar-row"><span>' + row.unit + '</span><div class="bar"><span style="width:' + row.percent + '%"></span></div><span>' + row.percent + '%</span></div>'
      ).join("");
      $("literacyTable").innerHTML = analysis.literacyTypes.map((row) =>
        '<tr><td>' + row.name + '</td><td>' + row.count + '</td></tr>'
      ).join("");
      const seenLinks = new Set();
      let resources = (yearResourceLinks[Number(analysis.year)] || [])
        .concat(yearYoutubeLinks[Number(analysis.year)] || [])
        .filter((item) => {
          if (seenLinks.has(item.url)) return false;
          seenLinks.add(item.url);
          return true;
        })
        .slice(0, 8);
      if (!resources.length) {
        resources = defaultResourceLinks;
      }
      $("resourceLinks").innerHTML = resources.length
        ? resources.map((item) =>
          '<li><a href="' + esc(item.url) + '" target="_blank" rel="noopener">' +
            '<strong>' + esc(item.title) + '</strong>' +
            '<span>' + esc(item.source) + '</span>' +
          '</a></li>'
        ).join("")
        : '<li class="small">本年度尚未整理延伸連結。</li>';
      $("questionList").innerHTML = analysis.questions.length
        ? analysis.questions.map((q) => '<button class="question-item" type="button" data-no="' + q.no + '">' + esc(questionLabel(analysis, q)) + '：' + esc(q.unit) + '｜答案：' + esc(q.answer || '待補') + '</button>').join("")
        : '<p class="small">尚未匯入逐題詳解。</p>';
      selectQuestion(analysis.questions[0]?.no);
    }

    function isNonChoiceQuestion(q) {
      return String(q?.answer || "").includes("非選");
    }

    function questionLabel(analysis, q) {
      if (!isNonChoiceQuestion(q)) return "第 " + q.no + " 題";
      const nonChoiceIndex = analysis.questions
        .filter((item) => isNonChoiceQuestion(item) && Number(item.no) <= Number(q.no))
        .length;
      const chineseNumbers = ["", "一", "二", "三", "四", "五", "六", "七", "八"];
      return "非選第" + (chineseNumbers[nonChoiceIndex] || nonChoiceIndex) + "題";
    }

    function selectQuestion(no) {
      const analysis = getAnalysis(state.year);
      const q = analysis?.questions.find((item) => item.no === Number(no));
      if (!q) {
        $("questionPreview").innerHTML = '<p class="small">請從右側選擇題目。</p>';
        return;
      }
      document.querySelectorAll(".question-item").forEach((button) => {
        button.classList.toggle("active", Number(button.dataset.no) === q.no);
      });
      const shotImages = q.shotImages || [];
      const label = questionLabel(analysis, q);
      const officialPreview = shotImages.length
        ? '<h3>官方試題預覽</h3>' +
          '<div class="official-preview">' +
            shotImages.map((url, index) =>
              '<div>' +
                '<p class="official-preview__meta">' + esc(label) + (shotImages.length > 1 ? '（第 ' + (index + 1) + ' 張）' : '') + '</p>' +
                '<img class="official-preview__image" src="' + esc(url + '?v=' + assetVersion) + '" alt="' + esc(label) + '官方試題截圖">' +
              '</div>'
            ).join("") +
          '</div>'
        : (q.previewPages || []).length
        ? '<h3>官方試題預覽</h3>' +
          '<div class="official-preview">' +
            (q.previewPages || []).map((url, index) =>
              '<div>' +
                '<p class="official-preview__meta">原卷第 ' + esc((q.sourcePageNumbers || [])[index] || index + 1) + ' 頁</p>' +
                '<iframe class="official-preview__frame" src="' + esc(url) + '" title="' + esc(label) + '官方試題頁面 ' + (index + 1) + '"></iframe>' +
              '</div>'
            ).join("") +
          '</div>'
        : '';
      $("questionPreview").innerHTML =
        '<h3>' + esc(label) + '：' + esc(q.unit) + '</h3>' +
        '<div class="question-actions">' +
          '<span class="badge">答案：' + esc(q.answer || '待補') + '</span>' +
          (q.literacyTypes || []).map((name) => '<span class="badge">' + esc(name) + '</span>').join("") +
        '</div>' +
        officialPreview +
        '<h3>詳解</h3>' +
        '<p class="solution-text">' + renderScientificText(q.solution) + '</p>' +
        renderSolutionDiagrams(q.solutionDiagrams);
      typesetMath();
    }

    function typesetMath() {
      if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
        window.MathJax.typesetPromise([$("questionPreview")]).catch(() => {});
      }
    }

    $("yearSelect").addEventListener("change", (event) => {
      state.year = Number(event.target.value);
      renderExam();
    });
    $("questionList").addEventListener("click", (event) => {
      const button = event.target.closest(".question-item");
      if (button) selectQuestion(button.dataset.no);
    });
    $("pretestQuestions").addEventListener("click", (event) => {
      const button = event.target.closest(".option-btn");
      if (!button) return;
      pretestState.answers[button.dataset.questionId] = button.dataset.answer;
      renderPretest();
      const card = document.getElementById(button.dataset.questionId);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    $("pretestTopicTabs").addEventListener("click", (event) => {
      const button = event.target.closest("[data-pretest-topic]");
      if (!button) return;
      pretestState.activeTopic = button.dataset.pretestTopic;
      renderPretest();
    });
    document.querySelectorAll("[data-pretest-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        pretestState.mode = button.dataset.pretestMode;
        renderPretest();
      });
    });
    $("pretestReset").addEventListener("click", () => {
      pretestState.answers = {};
      renderPretest();
    });
    $("pretestTopButton").addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    renderSelectors();
    renderExam();
    renderPretest();
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(root, "index.html"), "\ufeff" + site, "utf8");
console.log(`Generated ${exams.length} exams`);

