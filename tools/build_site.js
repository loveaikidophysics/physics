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
      focus: "從晶圓、光刻、光阻、繞射限制到 EUV 與多圖案微影，訓練學生把製程情境轉回波動與光學模型。",
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
            "短波長會使矽晶圓質量變小，因此線寬自動縮小"
          ],
          answer: "B",
          explanation: "光刻解析度受繞射限制影響，可用類似 \\(d\\propto \\lambda/\\mathrm{NA}\\) 的想法理解；波長 \\(\\lambda\\) 越短，繞射造成的最小可分辨尺度越小，因此較能做出細線寬。"
        },
        {
          id: "semi-2",
          difficulty: "中等",
          concept: "光刻與光阻",
          intent: "判斷學生是否能把製程步驟對應到光化學與遮罩成像。",
          prompt: "在光刻 Photolithography 中，光罩上的圖形經曝光轉移到塗有光阻的晶圓表面。光阻在此製程中的主要功能為何？",
          options: [
            "直接把晶圓切成電路導線",
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
          concept: "微影圖形轉移流程",
          intent: "確認學生能辨認微影、顯影與蝕刻的先後關係。",
          prompt: "在典型微影製程中，光罩圖形要轉移到晶圓材料上。下列流程何者最合理？",
          options: [
            "塗佈光阻、曝光、顯影、蝕刻",
            "先蝕刻晶圓、再塗光阻、最後曝光",
            "先摻雜、再讓光罩吸收全部光線",
            "只要用光照射晶圓，不需光阻或蝕刻"
          ],
          answer: "A",
          explanation: "光刻不是光直接把晶圓刻掉，而是先讓光阻性質改變。顯影後形成保護區與開口區，再用蝕刻把圖形轉移到下方材料。"
        },
        {
          id: "semi-4",
          difficulty: "中等",
          concept: "193 nm 與 32 nm 線寬",
          intent: "用繞射限制解釋短波長需求。",
          prompt: "若微影使用波長約 \\(193\\,\\mathrm{nm}\\) 的紫外光，要製作小於 \\(32\\,\\mathrm{nm}\\) 的密集線寬，主要會遇到哪個物理限制？",
          options: [
            "光穿過窄縫後繞射，曝光區域向外擴散",
            "重力使光線向下彎曲，無法曝光",
            "光速在真空中會隨線寬變小而變慢",
            "矽晶圓會自動變成磁鐵"
          ],
          answer: "A",
          explanation: "開口尺度接近或小於光波長時，繞射會使光強分布擴散。線條很密時，相鄰曝光區可能重疊，造成圖形模糊或線條黏連。"
        },
        {
          id: "semi-5",
          difficulty: "進階",
          concept: "多圖案微影",
          intent: "理解多圖案微影如何降低密集圖形的曝光困難。",
          prompt: "多圖案微影常把同一層密集線條拆成兩次或多次曝光。以高中波動觀點看，這麼做的主要好處是什麼？",
          options: [
            "把相鄰線條分到不同光罩，使單次曝光時的間距變大",
            "讓光的頻率變成零，避免繞射",
            "完全不需要對準光罩",
            "讓晶圓質量變小，因此圖案更細"
          ],
          answer: "A",
          explanation: "若所有細線一次曝光，相鄰圖形距離太小會加重繞射與重疊。多圖案微影把密集圖形拆開，使每次曝光的有效間距較大，但代價是步驟變多、對準要求提高。"
        }
      ]
    },
    {
      id: "semisolar",
      title: "題組二：半導體與太陽能電池",
      focus: "從摻雜、P 型與 N 型半導體、PN 接面到太陽能電池與 LED，訓練學生用電場、能量與光電轉換模型解題。",
      questions: [
        {
          id: "semisolar-1",
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
          id: "semisolar-2",
          difficulty: "基礎",
          concept: "P 型半導體",
          intent: "確認學生能由價電子數判斷電洞為多數載子。",
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
          id: "semisolar-3",
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
          id: "semisolar-4",
          difficulty: "基礎",
          concept: "太陽能電池的能量轉換",
          intent: "辨認太陽能電池的主要能量轉換。",
          prompt: "矽太陽能電池受光照時，主要把哪一種能量轉換成可輸出的電能？",
          options: [
            "光能",
            "聲能",
            "重力位能",
            "核能"
          ],
          answer: "A",
          explanation: "太陽能電池吸收光子後，在半導體中產生電子與電洞，再由 PN 接面內建電場分離電荷，形成可輸出的電能。"
        },
        {
          id: "semisolar-5",
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
        }
      ]
    },
    {
      id: "drone",
      title: "題組三：無人機飛行操控",
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
          prompt: "若無人機左右兩側螺旋槳升力不同，例如左側升力大於右側。下列敘述何者正確？",
          options: [
            "左右升力不同只會改變溫度，不會造成轉動",
            "左側升力較大會使機身產生繞前後軸的力矩",
            "右側升力較小會使重力消失",
            "只要總升力等於重力，姿態一定不會改變"
          ],
          answer: "B",
          explanation: "左右兩側升力作用線相對質心有不同力臂，會形成繞機身前後軸的淨力矩，使機身滾轉。總力決定平動，淨力矩決定轉動，兩者需分開判斷。"
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
      title: "題組四：干涉與光電感測器",
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
      title: "題組五：AI 資料中心散熱",
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
      concept: "正光阻與負光阻",
      intent: "確認學生能用顯影後的保留區判斷光阻類型。",
      prompt: "某微影製程使用正光阻。若某區域被光照到後溶解度增加，顯影後該區域最可能如何？",
      options: [
        "光阻更容易被移除，形成開口",
        "光阻一定變成金屬導線",
        "晶圓立即改變重力",
        "所有未曝光區一定消失"
      ],
      answer: "A",
      explanation: "正光阻的受光區較容易溶於顯影液，因此顯影後被移除，露出下方材料。負光阻則常是受光區較不易被移除。"
    },
    {
      id: "semi-9",
      difficulty: "基礎",
      concept: "光罩與曝光圖形",
      intent: "判斷學生是否能把光罩透明區與曝光區連結。",
      prompt: "在光罩微影中，若光罩某區域透明，且使用正光阻，顯影後晶圓表面該位置最可能出現什麼結果？",
      options: [
        "光阻被移除，成為後續蝕刻或佈植的開口",
        "光被透明區完全反射，所以無法曝光",
        "晶圓質量變為零",
        "光罩透明區一定形成暗紋"
      ],
      answer: "A",
      explanation: "透明區讓光通過並照到正光阻，受光區顯影後較易被移除，形成開口。接下來才能把圖形轉移到下方材料。"
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
      concept: "曝光劑量",
      intent: "用 \\(D=It\\) 建立光強與曝光時間的比例關係。",
      prompt: "光阻所需曝光劑量可粗略寫成 \\(D=It\\)，其中 \\(I\\) 為光強、\\(t\\) 為曝光時間。若光強變為原來 \\(2\\) 倍，要維持相同劑量，曝光時間應變為原來多少？",
      options: [
        "\\(1/2\\)",
        "\\(1\\)",
        "\\(2\\)",
        "\\(4\\)"
      ],
      answer: "A",
      explanation: "維持 \\(D=It\\) 不變。若 \\(I\\) 變為 \\(2I\\)，則 \\(t\\) 要變為 \\(t/2\\)，因為 \\((2I)(t/2)=It\\)。"
    },
    {
      id: "semi-14",
      difficulty: "中等",
      concept: "多圖案微影對準誤差",
      intent: "理解多次曝光會增加光罩對準要求。",
      prompt: "多圖案微影把密集線條拆成兩次曝光。若第二次曝光相對第一次偏移，最直接的風險是什麼？",
      options: [
        "兩次圖形位置錯開，造成線寬或間距偏差",
        "光的頻率一定變成零",
        "光罩會自動修正所有誤差",
        "晶圓不再受到任何繞射影響"
      ],
      answer: "A",
      explanation: "多圖案微影可放大單次曝光的有效間距，但需要精準對準。若兩次光罩有相對位移，圖形位置會錯開，造成線寬或間距誤差。"
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
      concept: "光子能量比例",
      intent: "用 \\(E\\propto 1/\\lambda\\) 比較 DUV 與 EUV 光子能量。",
      prompt: "比較 \\(193\\,\\mathrm{nm}\\) 深紫外光與 \\(13.5\\,\\mathrm{nm}\\) EUV。單一 EUV 光子能量約為 \\(193\\,\\mathrm{nm}\\) 光子的幾倍？",
      options: [
        "\\(193/13.5\\approx14.3\\)",
        "\\(13.5/193\\approx0.070\\)",
        "\\(193+13.5\\)",
        "兩者完全相同"
      ],
      answer: "A",
      explanation: "光子能量 \\(E=hc/\\lambda\\)，所以 \\(E_{\\mathrm{EUV}}/E_{193}=193/13.5\\approx14.3\\)。波長越短，單一光子能量越高。"
    },
    {
      id: "semi-17",
      difficulty: "進階",
      concept: "線寬容許誤差",
      intent: "用百分比範圍估算製程規格。",
      prompt: "某製程目標線寬為 \\(32\\,\\mathrm{nm}\\)，容許誤差為 \\(\\pm 10\\%\\)。線寬可接受範圍最接近下列何者？",
      options: [
        "\\(28.8\\sim35.2\\,\\mathrm{nm}\\)",
        "\\(22\\sim42\\,\\mathrm{nm}\\)",
        "\\(31.9\\sim32.1\\,\\mathrm{nm}\\)",
        "\\(3.2\\sim320\\,\\mathrm{nm}\\)"
      ],
      answer: "A",
      explanation: "\\(10\\%\\) 的 \\(32\\,\\mathrm{nm}\\) 為 \\(3.2\\,\\mathrm{nm}\\)，所以範圍是 \\(32\\pm3.2\\)，也就是 \\(28.8\\sim35.2\\,\\mathrm{nm}\\)。"
    },
    {
      id: "semi-18",
      difficulty: "進階",
      concept: "曝光功率與能量",
      intent: "用 \\(E=Pt\\) 計算曝光能量。",
      prompt: "某曝光系統照到光阻的有效功率為 \\(2.0\\,\\mathrm{mW}\\)，曝光時間 \\(0.50\\,\\mathrm{s}\\)。傳到光阻的能量約為多少？",
      options: [
        "\\(1.0\\times10^{-3}\\,\\mathrm{J}\\)",
        "\\(1.0\\,\\mathrm{J}\\)",
        "\\(4.0\\,\\mathrm{J}\\)",
        "\\(0.25\\,\\mathrm{J}\\)"
      ],
      answer: "A",
      explanation: "\\(E=Pt=(2.0\\times10^{-3})(0.50)=1.0\\times10^{-3}\\,\\mathrm{J}\\)。曝光能量不足會造成顯影不完全，過量則可能使圖形擴大。"
    },
    {
      id: "semi-19",
      difficulty: "進階",
      concept: "對準誤差向量",
      intent: "用畢氏定理估算兩方向疊對誤差。",
      prompt: "兩次曝光的疊對誤差在 \\(x\\) 方向為 \\(3.0\\,\\mathrm{nm}\\)，在 \\(y\\) 方向為 \\(4.0\\,\\mathrm{nm}\\)。合成位置誤差大小約多少？",
      options: [
        "\\(1.0\\,\\mathrm{nm}\\)",
        "\\(5.0\\,\\mathrm{nm}\\)",
        "\\(7.0\\,\\mathrm{nm}\\)",
        "\\(25\\,\\mathrm{nm}\\)"
      ],
      answer: "B",
      explanation: "兩方向誤差互相垂直時，可用 \\(\\Delta r=\\sqrt{(3.0)^2+(4.0)^2}=5.0\\,\\mathrm{nm}\\)。這是多次曝光對準控制的重要原因。"
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
  semisolar: [
    {
      id: "semisolar-6",
      difficulty: "基礎",
      concept: "導體、絕緣體與半導體",
      intent: "辨認半導體導電性可被溫度、光照與摻雜調整。",
      prompt: "半導體材料與金屬導體、絕緣體相比，最適合用哪一句描述？",
      options: [
        "導電性介於導體與絕緣體之間，且可用摻雜或光照調整",
        "在任何情況下都完全不導電",
        "一定比金屬導電性更好",
        "只能靠重力產生電流"
      ],
      answer: "A",
      explanation: "半導體的導電性不是固定不變；摻雜可改變多數載子，光照可產生電子與電洞，因此適合製作二極體、太陽能電池與感測器。"
    },
    {
      id: "semisolar-7",
      difficulty: "基礎",
      concept: "電子與電洞在電場中的運動",
      intent: "檢查正負載子受力方向。",
      prompt: "在半導體中，電子帶負電、電洞可視為帶正電。若電場向右，電子與電洞受電力方向何者正確？",
      options: [
        "電子向右，電洞向右",
        "電子向左，電洞向右",
        "電子向右，電洞向左",
        "兩者都不受電場影響"
      ],
      answer: "B",
      explanation: "電力 \\(\\vec{F}=q\\vec{E}\\)。電洞等效帶正電，受力同電場方向；電子帶負電，受力與電場方向相反。"
    },
    {
      id: "semisolar-8",
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
      id: "semisolar-9",
      difficulty: "中等",
      concept: "光子能量與矽能隙",
      intent: "用 \\(E=hc/\\lambda\\) 判斷光子是否足以產生電子-電洞對。",
      prompt: "矽的能隙約 \\(1.1\\,\\mathrm{eV}\\)。若某光子能量為 \\(2.0\\,\\mathrm{eV}\\)，照射矽太陽能電池時最合理的判斷是什麼？",
      options: [
        "光子能量大於能隙，可能產生電子-電洞對",
        "光子能量大於能隙，所以一定完全不被吸收",
        "光子能量與電能無關",
        "只有聲波能產生電子-電洞對"
      ],
      answer: "A",
      explanation: "光子能量若大於能隙，就有機會把電子由價帶激發到導帶，產生電子-電洞對。太陽能電池再利用內建電場分離載子。"
    },
    {
      id: "semisolar-10",
      difficulty: "中等",
      concept: "太陽能電池輸出功率",
      intent: "用 \\(P=IV\\) 計算電功率。",
      prompt: "某太陽能電池在工作點輸出電壓 \\(0.50\\,\\mathrm{V}\\)、電流 \\(2.0\\,\\mathrm{A}\\)。輸出功率為多少？",
      options: [
        "\\(0.25\\,\\mathrm{W}\\)",
        "\\(1.0\\,\\mathrm{W}\\)",
        "\\(2.5\\,\\mathrm{W}\\)",
        "\\(4.0\\,\\mathrm{W}\\)"
      ],
      answer: "B",
      explanation: "\\(P=IV=(2.0)(0.50)=1.0\\,\\mathrm{W}\\)。太陽能電池的輸出會隨光照、溫度與負載改變。"
    },
    {
      id: "semisolar-11",
      difficulty: "中等",
      concept: "太陽能轉換效率",
      intent: "用 \\(\\eta=P_{\\mathrm{out}}/P_{\\mathrm{in}}\\) 估算效率。",
      prompt: "太陽光照度為 \\(1000\\,\\mathrm{W/m^2}\\)，太陽能板面積 \\(0.20\\,\\mathrm{m^2}\\)，輸出功率 \\(40\\,\\mathrm{W}\\)。效率約多少？",
      options: [
        "\\(10\\%\\)",
        "\\(20\\%\\)",
        "\\(40\\%\\)",
        "\\(80\\%\\)"
      ],
      answer: "B",
      explanation: "入射功率 \\(P_{\\mathrm{in}}=(1000)(0.20)=200\\,\\mathrm{W}\\)。效率 \\(\\eta=40/200=0.20=20\\%\\)。"
    },
    {
      id: "semisolar-12",
      difficulty: "中等",
      concept: "太陽能電池串聯與並聯",
      intent: "用電路基本觀念判斷電壓與電流。",
      prompt: "兩片相同太陽能電池串聯時，若各自可提供約 \\(0.60\\,\\mathrm{V}\\)，串聯總電壓約為多少？",
      options: [
        "\\(0.30\\,\\mathrm{V}\\)",
        "\\(0.60\\,\\mathrm{V}\\)",
        "\\(1.20\\,\\mathrm{V}\\)",
        "\\(3.60\\,\\mathrm{V}\\)"
      ],
      answer: "C",
      explanation: "串聯時電壓相加，所以 \\(V_{\\mathrm{total}}=0.60+0.60=1.20\\,\\mathrm{V}\\)。並聯則主要增加可輸出電流。"
    },
    {
      id: "semisolar-13",
      difficulty: "中等",
      concept: "抗反射膜與太陽能電池",
      intent: "連結薄膜干涉與提高入射光吸收。",
      prompt: "太陽能電池表面常加抗反射鍍膜。其主要目的為何？",
      options: [
        "利用相消干涉降低反射，使更多光進入電池",
        "讓重力變小",
        "讓所有光都變成聲波",
        "使電池完全不吸收光"
      ],
      answer: "A",
      explanation: "抗反射膜利用薄膜上下表面反射光的相位差，使反射光相消，降低反射損失，增加進入半導體的光。"
    },
    {
      id: "semisolar-14",
      difficulty: "進階",
      concept: "電荷通過電位差的能量",
      intent: "用 \\(\\Delta E=q\\Delta V\\) 連結接面位能。",
      prompt: "一個電子通過 \\(0.60\\,\\mathrm{V}\\) 的電位差時，電能改變量大小為多少？",
      options: [
        "\\(0.60\\,\\mathrm{eV}\\)",
        "\\(1.2\\,\\mathrm{eV}\\)",
        "\\(6.0\\,\\mathrm{J}\\)",
        "\\(0\\)"
      ],
      answer: "A",
      explanation: "以電子伏特為單位時，帶一個基本電荷的粒子通過 \\(1\\,\\mathrm{V}\\) 對應 \\(1\\,\\mathrm{eV}\\)。因此 \\(|\\Delta E|=0.60\\,\\mathrm{eV}\\)。"
    },
    {
      id: "semisolar-15",
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
      id: "semisolar-16",
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
      id: "semisolar-17",
      difficulty: "進階",
      concept: "太陽能電池最大功率",
      intent: "用填充因子估算最大輸出功率。",
      prompt: "某太陽能電池的開路電壓 \\(V_{\\mathrm{oc}}=0.60\\,\\mathrm{V}\\)、短路電流 \\(I_{\\mathrm{sc}}=5.0\\,\\mathrm{A}\\)，填充因子 \\(FF=0.80\\)。最大功率約為多少？",
      options: [
        "\\(1.2\\,\\mathrm{W}\\)",
        "\\(2.4\\,\\mathrm{W}\\)",
        "\\(3.0\\,\\mathrm{W}\\)",
        "\\(6.0\\,\\mathrm{W}\\)"
      ],
      answer: "B",
      explanation: "最大功率可估為 \\(P_{\\max}=FF\\,V_{\\mathrm{oc}}I_{\\mathrm{sc}}=0.80(0.60)(5.0)=2.4\\,\\mathrm{W}\\)。"
    },
    {
      id: "semisolar-18",
      difficulty: "進階",
      concept: "面積、照度與輸出功率",
      intent: "整合照度、面積與效率計算。",
      prompt: "照度 \\(800\\,\\mathrm{W/m^2}\\) 照在面積 \\(1.5\\,\\mathrm{m^2}\\) 的太陽能板上，效率 \\(18\\%\\)。輸出功率約多少？",
      options: [
        "\\(120\\,\\mathrm{W}\\)",
        "\\(216\\,\\mathrm{W}\\)",
        "\\(800\\,\\mathrm{W}\\)",
        "\\(1200\\,\\mathrm{W}\\)"
      ],
      answer: "B",
      explanation: "入射功率 \\(P_{\\mathrm{in}}=(800)(1.5)=1200\\,\\mathrm{W}\\)。輸出 \\(P_{\\mathrm{out}}=0.18(1200)=216\\,\\mathrm{W}\\)。"
    },
    {
      id: "semisolar-19",
      difficulty: "進階",
      concept: "反向偏壓與光電二極體",
      intent: "理解反向偏壓可加強載子分離與訊號讀出。",
      prompt: "光電二極體常在反向偏壓下工作。下列哪一項最能說明其用途？",
      options: [
        "加強耗盡區電場，使光生電子與電洞較快分離",
        "使光子能量變成負值",
        "讓半導體完全不吸收光",
        "讓電流方向不再受電荷影響"
      ],
      answer: "A",
      explanation: "反向偏壓會加強接面電場並擴大耗盡區，有助於把光生電子與電洞分離，形成可量測的光電流。"
    },
    {
      id: "semisolar-20",
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
      prompt: "質量 \\(2.0\\,\\mathrm{kg}\\) 的無人機在某瞬間總推力為 \\(10\\,\\mathrm{N}\\)，推力相對鉛直方向傾斜 \\(30^\\circ\\)。若只估算此推力水平分量造成的水平加速度，約為多少？",
      options: [
        "\\(1.25\\,\\mathrm{m/s^2}\\)",
        "\\(2.5\\,\\mathrm{m/s^2}\\)",
        "\\(5.0\\,\\mathrm{m/s^2}\\)",
        "\\(10\\,\\mathrm{m/s^2}\\)"
      ],
      answer: "B",
      explanation: "水平推力 \\(F_x=F\\sin30^\\circ=10(0.5)=5\\,\\mathrm{N}\\)。水平加速度 \\(a_x=F_x/m=5/2.0=2.5\\,\\mathrm{m/s^2}\\)。此題只問水平分量；若要同時維持高度，還需檢查鉛直分量是否能平衡重力。"
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
      margin-bottom: 18px;
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
    .main-topic-tabs {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin: 0 0 18px;
      position: sticky;
      top: 0;
      z-index: 5;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(246, 248, 251, .96);
      backdrop-filter: blur(8px);
    }
    .main-topic-tabs button {
      min-height: 46px;
      padding: 10px 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: #0f315f;
      font: inherit;
      font-weight: 900;
      cursor: pointer;
    }
    .main-topic-tabs button:hover {
      border-color: var(--blue);
      background: #eef6ff;
    }
    .main-topic-tabs button.active {
      border-color: var(--blue);
      background: #123d72;
      color: #fff;
    }
    .page-panel { display: none; }
    .page-panel.active { display: block; }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
      align-items: stretch;
    }
    section, .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 18px;
    }
    .grid > section,
    .paired-panels > section {
      display: flex;
      flex-direction: column;
    }
    .grid > section:not(.wide) {
      min-height: 330px;
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
      flex: 1;
      align-content: start;
      gap: 10px;
      margin: 0;
      padding: 0 6px 0 0;
      list-style: none;
      max-height: 280px;
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
      min-height: 340px;
      height: 100%;
    }
    .question-workspace {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(220px, 300px);
      gap: 16px;
      align-items: start;
    }
    .question-preview {
      min-height: 760px;
      max-height: none;
      overflow: visible;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: clamp(18px, 2.2vw, 28px);
    }
    .question-preview h3 { margin-bottom: 10px; }
    .question-text {
      white-space: pre-wrap;
      line-height: 1.75;
      font-size: 16px;
    }
    .solution-text {
      line-height: 2;
      font-size: 17px;
      max-width: 980px;
    }
    .solution-text p {
      margin: 0 0 14px;
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
      max-height: calc(100vh - 116px);
      overflow: auto;
      padding-right: 4px;
      position: sticky;
      top: 74px;
    }
    .question-item {
      width: 100%;
      min-height: 50px;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      font: inherit;
      font-size: 15px;
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
    .history-section {
      margin-top: 28px;
      border-color: #bfd0e7;
      background: #f8fbff;
      overflow: hidden;
    }
    .history-hero {
      margin: -18px -18px 18px;
      padding: clamp(20px, 4vw, 32px);
      color: #fff;
      background: linear-gradient(135deg, #092247, #194f8f);
    }
    .history-hero h2 {
      margin: 0 0 8px;
      font-size: clamp(24px, 3.4vw, 36px);
    }
    .history-hero p {
      max-width: 1000px;
      color: #dbeafe;
    }
    .history-kicker {
      display: inline-flex;
      margin-bottom: 10px;
      padding: 4px 10px;
      border: 1px solid rgba(191, 219, 254, .72);
      border-radius: 999px;
      color: #bfdbfe;
      font-size: 13px;
      font-weight: 800;
    }
    .history-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      align-items: start;
    }
    .history-card {
      border: 1px solid #d4dfef;
      border-radius: 8px;
      background: #fff;
      padding: 16px;
    }
    .history-card h3 {
      color: #0f315f;
      font-size: 19px;
    }
    .history-card p,
    .history-card li {
      font-size: 15px;
    }
    .history-focus-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 12px;
    }
    .history-focus {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 76px;
      border: 1px solid #d4dfef;
      border-radius: 8px;
      background: #f4f8ff;
      padding: 12px;
      color: #123d72;
      text-decoration: none;
      transition: border-color .18s ease, background .18s ease, transform .18s ease;
    }
    .history-focus strong {
      display: block;
      color: #123d72;
      margin-bottom: 0;
    }
    .history-focus span {
      color: #1d4ed8;
      font-size: 13px;
      font-weight: 900;
      white-space: nowrap;
    }
    .history-focus:hover,
    .history-focus:focus-visible {
      border-color: #7fb7ff;
      background: #eaf3ff;
      transform: translateY(-1px);
      outline: none;
    }
    .history-timeline-card {
      grid-column: 1 / -1;
    }
    .history-timeline {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
      max-height: 560px;
      overflow: auto;
      scrollbar-width: thin;
    }
    .history-timeline li {
      display: grid;
      grid-template-columns: 88px minmax(0, 1fr);
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid #d8e4f3;
      border-radius: 8px;
      background: #fff;
    }
    .history-year {
      color: #1d4ed8;
      font-weight: 900;
      white-space: nowrap;
    }
    .history-table-wrap {
      overflow-x: auto;
      margin-top: 10px;
    }
    .history-table-card {
      grid-column: 1 / -1;
    }
    .history-table .history-theme-cell,
    .history-table .history-person-cell {
      font-weight: 800;
      color: #123d72;
    }
    .history-table .history-theme-cell {
      min-width: 118px;
      background: #f4f8ff;
    }
    .history-table .history-person-cell {
      min-width: 150px;
    }
    .history-table a {
      color: #174f9b;
      font-weight: 800;
    }
    .history-table tr[id] {
      scroll-margin-top: 108px;
    }
    .history-table tr:target {
      outline: 2px solid #2563eb;
      outline-offset: -2px;
      background: #eef6ff;
    }
    .history-table small {
      display: block;
      margin-top: 4px;
      color: #5b6f86;
      line-height: 1.55;
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
    .concept-diagram--source {
      text-align: center;
    }
    .concept-diagram > svg {
      display: block;
      width: 100%;
      height: auto;
    }
    .concept-diagram--source img {
      display: block;
      width: auto;
      max-width: 100%;
      max-height: min(640px, 72vh);
      margin: 0 auto;
      object-fit: contain;
      height: auto;
      border-radius: 6px;
      background: #fff;
    }
    .concept-diagram--source figcaption {
      margin-top: 8px;
      color: #64748b;
      font-size: 13px;
      line-height: 1.6;
    }
    .concept-diagram--source a {
      color: #1d4ed8;
      font-weight: 700;
      text-decoration: none;
    }
    .concept-diagram--source a:hover {
      text-decoration: underline;
    }
    .force-analysis-steps {
      display: grid;
      gap: 14px;
      margin: 14px 0;
    }
    .force-step {
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
      align-items: center;
      justify-items: center;
      padding: 16px;
      border: 1px solid #c7d2e5;
      border-radius: 8px;
      background: #f8fbff;
    }
    .force-step img {
      display: block;
      width: min(100%, 760px);
      max-width: 760px;
      height: auto;
      margin: 0 auto;
      border-radius: 6px;
      background: #fff;
    }
    .force-step > div {
      width: min(100%, 920px);
    }
    .force-step h4 {
      margin: 0 0 8px;
      color: #0f2d52;
      font-size: 22px;
    }
    .force-step p {
      margin: 0;
      line-height: 1.75;
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
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
    .article-keypoints {
      margin: 12px 0;
      padding: 12px;
      border: 1px solid #c7d2e5;
      border-radius: 8px;
      background: #f8fafc;
    }
    .article-keypoints h4 {
      margin: 0 0 8px;
      color: #0f2d52;
      font-size: 15px;
    }
    .article-keypoints p {
      margin: 0;
      line-height: 1.7;
    }
    .article-keypoints ul {
      display: grid;
      gap: 6px;
      margin: 0;
      padding-left: 1.25em;
    }
    .article-keypoints li {
      line-height: 1.65;
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
      header, .toolbar, .main-topic-tabs, .pretest-nav, .pretest-toolbar, .question-list, .links, .resource-list { display: none !important; }
      main { padding: 0; }
      .page-panel { display: block !important; }
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
      .main-topic-tabs { grid-template-columns: 1fr; position: static; }
      .paired-panels { grid-template-columns: 1fr; }
      .paired-panels > section { min-height: auto; }
      .question-workspace { grid-template-columns: 1fr; }
      .question-preview { position: static; min-height: auto; max-height: none; }
      .question-list { max-height: none; position: static; }
      .bar-row { grid-template-columns: 82px 1fr 44px; }
      .pretest-grid, .trend-list, .theme-layout, .history-grid, .history-focus-grid { grid-template-columns: 1fr; }
      .force-step { grid-template-columns: 1fr; }
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
  </header>
  <main>
    <nav class="main-topic-tabs" aria-label="主題分頁">
      <button type="button" class="active" data-main-tab="exams">歷年試題</button>
      <button type="button" data-main-tab="history">物理科學史</button>
      <button type="button" data-main-tab="pretest">素養題目</button>
    </nav>

    <div class="page-panel active" id="panelExams" data-main-panel="exams">
      <div class="toolbar">
        <select id="yearSelect" aria-label="選擇年度"></select>
      </div>
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
    </div>

    <section class="wide history-section page-panel" id="physicsHistory" data-main-panel="history">
      <div class="history-hero">
        <span class="history-kicker">科學史｜人物實驗｜大考觀念</span>
        <h2>高中物理史</h2>
        <p>這一欄整理歷屆題常出現的物理史人物、代表實驗與核心定律。讀法不是死背人名，而是掌握「誰用什麼證據，改變了哪一個物理模型」，再回扣力學、波動、電磁、熱學與近代物理的解題觀念。</p>
      </div>

      <div class="history-grid">
        <div class="history-card">
          <h3>物理史的六條主線</h3>
          <div class="history-focus-grid">
            <a class="history-focus" href="#history-theme-mechanics">
              <strong>力學與天文</strong>
              <span>查看對照</span>
            </a>
            <a class="history-focus" href="#history-theme-thermal">
              <strong>熱學與能量</strong>
              <span>查看對照</span>
            </a>
            <a class="history-focus" href="#history-theme-waves">
              <strong>波動與光學</strong>
              <span>查看對照</span>
            </a>
            <a class="history-focus" href="#history-theme-electromagnetism">
              <strong>電磁學</strong>
              <span>查看對照</span>
            </a>
            <a class="history-focus" href="#history-theme-modern">
              <strong>近代物理與原子</strong>
              <span>查看對照</span>
            </a>
            <a class="history-focus" href="#history-theme-quantum">
              <strong>量子、相對論與宇宙</strong>
              <span>查看對照</span>
            </a>
          </div>
        </div>

        <div class="history-card history-timeline-card">
          <h3>時間線速讀</h3>
          <ul class="history-timeline">
            <li><span class="history-year">1609/1618</span><span>克卜勒發表行星運動定律：橢圓軌道、等面積、\(T^{2}\propto a^{3}\)。</span></li>
            <li><span class="history-year">1687</span><span>牛頓出版《自然哲學的數學原理》，以 \(F=ma\) 與萬有引力統一力學與天體運動。</span></li>
            <li><span class="history-year">1785</span><span>庫倫以扭秤研究帶電球間的靜電力，建立 \(F=kq_1q_2/r^2\) 的平方反比關係。</span></li>
            <li><span class="history-year">1798</span><span>卡文狄西以扭秤實驗測得萬有引力常數 \(G\)，使地球質量可由實驗估算。</span></li>
            <li><span class="history-year">1801</span><span>楊格雙狹縫干涉顯示光會相長與相消，支持光的波動模型。</span></li>
            <li><span class="history-year">1818/1822</span><span>菲涅爾以波前疊加解釋繞射，並發展菲涅爾透鏡，把厚透鏡分割成同心環以減少材料。</span></li>
            <li><span class="history-year">1820</span><span>厄斯特發現電流可使磁針偏轉，打開電與磁互相關聯的研究。</span></li>
            <li><span class="history-year">1831</span><span>法拉第發現磁通量改變可產生感應電流，是發電機、變壓器與感應電動勢的基礎。</span></li>
            <li><span class="history-year">1834</span><span>冷次定律指出感應電流方向會反抗磁通量的改變，是判斷感應電流方向的核心規則。</span></li>
            <li><span class="history-year">1840s</span><span>焦耳建立熱功當量，將作功與熱量連結到能量守恆。</span></li>
            <li><span class="history-year">1845</span><span>克希何夫提出電路定則：接點電流守恆、閉合迴路電位變化總和為零。</span></li>
            <li><span class="history-year">19 世紀中葉</span><span>亥姆霍茲線圈用兩個同軸同半徑線圈產生近似均勻磁場，常用於電子荷質比與磁場量測。</span></li>
            <li><span class="history-year">1851</span><span>傅科擺以擺動平面相對地面旋轉的現象，提供地球自轉的直接實驗證據。</span></li>
            <li><span class="history-year">1859</span><span>克希何夫與本生建立光譜分析：不同元素有特徵光譜，可由光譜辨識物質組成。</span></li>
            <li><span class="history-year">1860s</span><span>馬克士威統合電磁理論，預測光也是電磁波的一種。</span></li>
            <li><span class="history-year">1885/1888</span><span>巴耳末整理氫原子可見光譜線規律；芮得柏將其推廣成氫原子光譜公式。</span></li>
            <li><span class="history-year">1887</span><span>赫茲以實驗產生並接收電磁波，也觀察到後來稱為光電效應的現象。</span></li>
            <li><span class="history-year">1895-1898</span><span>侖琴發現 X 射線；貝克勒發現放射性；居禮夫婦發現釙與鐳。</span></li>
            <li><span class="history-year">1897/1909</span><span>湯木生發現電子並求荷質比；密立坎油滴實驗確認電荷量子化並測得基本電荷。</span></li>
            <li><span class="history-year">1900/1905</span><span>普朗克提出能量量子化解釋黑體輻射；愛因斯坦以光量子解釋光電效應。</span></li>
            <li><span class="history-year">1912/1913</span><span>勞厄觀察 X 射線經晶體產生繞射；布拉格父子建立布拉格定律 \(2d\sin\theta=n\lambda\)。</span></li>
            <li><span class="history-year">1911-1913</span><span>拉塞福金箔散射提出原子核模型；波耳以量子化能階解釋氫原子光譜。</span></li>
            <li><span class="history-year">1923</span><span>康普頓散射顯示 X 射線與電子碰撞後波長改變，支持光子具有動量與粒子性。</span></li>
            <li><span class="history-year">1924-1927</span><span>德布羅意提出物質波；戴維森與革末用電子繞射驗證電子也具有波動性。</span></li>
            <li><span class="history-year">1929/1965</span><span>哈伯由星系光譜紅移建立宇宙膨脹圖像；潘奇亞斯與威爾森偵測到宇宙微波背景。</span></li>
          </ul>
        </div>

        <div class="history-card history-table-card">
          <h3>人物、實驗與考點對照</h3>
          <div class="history-table-wrap">
            <table class="history-table">
              <thead><tr><th>主題分類</th><th>人物或實驗</th><th>高中物理考點</th><th>常見問法</th><th>驗證方法、裝置或連結</th></tr></thead>
              <tbody>
                <tr id="history-theme-mechanics">
                  <td class="history-theme-cell">力學與天文</td>
                  <td class="history-person-cell">克卜勒、牛頓</td>
                  <td>行星運動、萬有引力、圓周運動、角動量守恆。</td>
                  <td>由 \(T^{2}\propto r^{3}\) 比較週期；由 \(F=Gm_1m_2/r^{2}\) 或 \(v=\sqrt{GM/r}\) 推估軌道量。</td>
                  <td>第谷長期行星觀測資料支持克卜勒定律；牛頓以萬有引力統一落體與天體運動。<small><a href="https://ptcc.phys.nthu.edu.tw/articles/67bc32b11efd7411b20cc993" target="_blank" rel="noopener">物理雙月刊：萬有引力與克卜勒定律</a>｜<a href="https://www.britannica.com/science/Keplers-laws-of-planetary-motion" target="_blank" rel="noopener">Britannica：Kepler's laws</a></small></td>
                </tr>
                <tr>
                  <td class="history-theme-cell">力學與天文</td>
                  <td class="history-person-cell">卡文狄西</td>
                  <td>萬有引力常數 \(G\)、微小力矩、靜力平衡。</td>
                  <td>由扭秤平衡與力矩估算 \(G\)，再連到地球質量與重力場。</td>
                  <td>扭秤裝置：兩小鉛球受大鉛球吸引造成懸線扭轉，利用扭轉角與力矩平衡求引力。<small><a href="docs/1-1_history_104.pdf" target="_blank" rel="noopener">附件 PDF：科學史整理</a></small></td>
                </tr>
                <tr>
                  <td class="history-theme-cell">力學與天文</td>
                  <td class="history-person-cell">傅科擺</td>
                  <td>單擺、慣性參考系、地球自轉、角速度與緯度效應。</td>
                  <td>說明擺動平面近似保持固定，而地面隨地球自轉；判斷擺面相對地面轉動方向與週期。</td>
                  <td>傅科擺：長擺在小角度下作近似單擺運動，擺動平面相對遙遠星空近似不變；地面轉動造成觀察到的擺面旋轉。<small><a href="https://www.britannica.com/science/Foucault-pendulum" target="_blank" rel="noopener">Britannica：Foucault pendulum</a></small></td>
                </tr>
                <tr id="history-theme-thermal">
                  <td class="history-theme-cell">熱學與能量</td>
                  <td class="history-person-cell">焦耳</td>
                  <td>熱功當量、能量守恆、熱量與功。</td>
                  <td>判斷摩擦作功、電功率或機械能損失最後轉成熱。</td>
                  <td>焦耳槳輪實驗：重物下降帶動葉片攪拌水，量水溫上升，建立作功與熱量的等價。<small><a href="https://lis.org.tw/posts/143" target="_blank" rel="noopener">LIS：熱功當量</a>｜<a href="https://www.britannica.com/science/mechanical-equivalent-of-heat" target="_blank" rel="noopener">Britannica：mechanical equivalent of heat</a></small></td>
                </tr>
                <tr id="history-theme-waves">
                  <td class="history-theme-cell">波動與光學</td>
                  <td class="history-person-cell">惠更斯、楊格</td>
                  <td>波前、干涉、繞射、波長、相位差。</td>
                  <td>雙狹縫條紋間距 \(\Delta y=\lambda L/d\)，或由相長、相消判斷亮暗紋。</td>
                  <td>雙狹縫裝置：單色光、雙狹縫與屏幕；亮紋來自光程差 \(m\lambda\)，暗紋來自 \((m+1/2)\lambda\)。<small><a href="https://phy.tw/project/all/item/219-item-title" target="_blank" rel="noopener">臺灣物理教育平台：雷射雙狹縫干涉</a>｜<a href="https://www.britannica.com/science/Youngs-experiment" target="_blank" rel="noopener">Britannica：Young's experiment</a></small></td>
                </tr>
                <tr>
                  <td class="history-theme-cell">波動與光學</td>
                  <td class="history-person-cell">菲涅爾</td>
                  <td>繞射、波前疊加、半波帶、薄透鏡成像與菲涅爾透鏡。</td>
                  <td>說明光遇障礙或孔徑邊緣會繞射；判斷孔徑越小或波長越長，繞射越明顯。菲涅爾透鏡則把厚透鏡分割成同心環，保留折射聚光功能並減少厚度。</td>
                  <td>繞射可用單狹縫、圓孔或直邊遮擋單色光觀察亮暗分布；菲涅爾透鏡常見於燈塔、投影、太陽能集光與薄型放大鏡。<small><a href="https://www.britannica.com/biography/Augustin-Jean-Fresnel" target="_blank" rel="noopener">Britannica：Fresnel</a>｜<a href="https://www.britannica.com/technology/Fresnel-lens" target="_blank" rel="noopener">Britannica：Fresnel lens</a></small></td>
                </tr>
                <tr>
                  <td class="history-theme-cell">波動與光學</td>
                  <td class="history-person-cell">夫朗和斐、克希何夫與本生、巴耳末、芮得柏</td>
                  <td>連續光譜、吸收暗線、發射明線、氫原子線系與光子能量。</td>
                  <td>判斷明線或暗線來源；用 \(E=hf=\dfrac{hc}{\lambda}\) 與 \(\dfrac{1}{\lambda}=R_H\left(\dfrac{1}{n_f^2}-\dfrac{1}{n_i^2}\right)\) 求波長或能階差。巴耳末系為 \(n_i\to2\)，最大能量差 \(E_{\infty}-E_2=3.4\,\mathrm{eV}\)，最小可見系列能量差 \(E_3-E_2=1.9\,\mathrm{eV}\)。</td>
                  <td>1814 年夫朗和斐觀察太陽光譜暗線；1859 年克希何夫與本生建立元素特徵光譜分析；1885 年巴耳末整理氫可見光譜，1888 年芮得柏推廣公式。分光鏡或繞射光柵可把光分成不同波長；氫放電管可觀察巴耳末系明線，太陽光譜暗線可用吸收光譜解釋。<small><a href="https://www.britannica.com/science/spectral-line-series" target="_blank" rel="noopener">Britannica：spectral line series</a>｜<a href="https://www.britannica.com/science/spectroscopy/Basic-properties-of-atoms" target="_blank" rel="noopener">Britannica：spectroscopy history</a></small></td>
                </tr>
                <tr id="history-theme-electromagnetism">
                  <td class="history-theme-cell">電磁學</td>
                  <td class="history-person-cell">庫倫扭秤實驗</td>
                  <td>庫倫定律、靜電力、平方反比、力矩平衡。</td>
                  <td>由 \(F=kq_1q_2/r^2\) 判斷距離改變時靜電力倍率；用扭轉角與力矩平衡推估帶電球間作用力，進一步求庫倫定律常數 \(k\)。</td>
                  <td>庫倫扭秤：帶電小球間的吸引或排斥造成細絲扭轉；改變距離 \(r\) 可驗證靜電力與 \(1/r^2\) 成正比，量得作用力後可由 \(k=Fr^2/(q_1q_2)\) 估測庫倫常數。在 SI 制中 \(k=1/(4\pi\varepsilon_0)\)。<small><a href="https://www.britannica.com/science/Coulombs-law" target="_blank" rel="noopener">Britannica：Coulomb's law</a>｜<a href="https://www.britannica.com/technology/torsion-balance" target="_blank" rel="noopener">Britannica：torsion balance</a></small></td>
                </tr>
                <tr>
                  <td class="history-theme-cell">電磁學</td>
                  <td class="history-person-cell">厄斯特、安培</td>
                  <td>電流磁效應、磁場方向、磁力、右手定則。</td>
                  <td>用右手定則判斷導線周圍磁場與載流導線受力方向。</td>
                  <td>厄斯特實驗：通電導線靠近磁針，磁針偏轉，顯示電流會產生磁場。安培力可用兩平行載流導線相吸或相斥驗證。<small><a href="https://lis.org.tw/posts/127" target="_blank" rel="noopener">LIS：厄斯特與電流磁效應</a></small></td>
                </tr>
                <tr>
                  <td class="history-theme-cell">電磁學</td>
                  <td class="history-person-cell">法拉第、冷次（Lenz）</td>
                  <td>磁通量、感應電流、感應電動勢、冷次定律。</td>
                  <td>用 \(\varepsilon=-N\Delta\Phi/\Delta t\) 判斷感應電動勢方向與大小。</td>
                  <td>線圈、磁鐵與檢流計：磁鐵進出線圈時檢流計偏轉；冷次定律指出感應電流產生的磁場會反抗磁通量改變。<small><a href="https://ptcc.phys.nthu.edu.tw/articles/67bc37341efd7411b20ce123" target="_blank" rel="noopener">物理雙月刊：冷次定律與磁煞現象</a>｜<a href="https://www.britannica.com/science/Lenzs-law" target="_blank" rel="noopener">Britannica：Lenz's law</a></small></td>
                </tr>
                <tr>
                  <td class="history-theme-cell">電磁學</td>
                  <td class="history-person-cell">克希何夫</td>
                  <td>接點定則、迴路定則、電荷守恆與能量守恆。</td>
                  <td>接點：\(\sum I_{\mathrm{in}}=\sum I_{\mathrm{out}}\)；閉合迴路：\(\sum \Delta V=0\)，用於多電池、多電阻電路。</td>
                  <td>多迴路電路板、電池、電阻與安培計可驗證接點電流分流；沿任一閉合迴路量測電位升降，總和為零。<small><a href="https://www.britannica.com/science/Kirchhoffs-rules" target="_blank" rel="noopener">Britannica：Kirchhoff's rules</a>｜<a href="https://www.britannica.com/science/electricity/Kirchhoffs-laws-of-electric-circuits" target="_blank" rel="noopener">Britannica：Kirchhoff's laws of electric circuits</a></small></td>
                </tr>
                <tr>
                  <td class="history-theme-cell">電磁學</td>
                  <td class="history-person-cell">亥姆霍茲線圈</td>
                  <td>近似均勻磁場、右手定則、磁力提供向心力。</td>
                  <td>線圈電流 \(I\) 越大，中心磁場 \(B\) 越大；帶電粒子在垂直磁場中滿足 \(qvB=mv^2/r\)，可用半徑反推荷質比或速度。</td>
                  <td>兩個同軸同半徑線圈相距約一個半徑並通同向電流，可在中心區域產生近似均勻磁場；常配合電子束管或霍爾探針量測。<small><a href="https://web.mit.edu/8.02t/www/materials/modules/guide10.pdf" target="_blank" rel="noopener">MIT：Magnetic fields and Helmholtz coils</a>｜<a href="https://www.britannica.com/science/magnetic-field" target="_blank" rel="noopener">Britannica：magnetic field</a></small></td>
                </tr>
                <tr>
                  <td class="history-theme-cell">電磁學</td>
                  <td class="history-person-cell">馬克士威、赫茲</td>
                  <td>電磁波、光速、電場與磁場互相垂直。</td>
                  <td>判斷電磁波傳播方向、頻率波長關係 \(c=f\lambda\)，或說明光屬於電磁波。</td>
                  <td>赫茲以火花隙振盪器產生電磁波，接收環出現火花作為偵測；實驗支持馬克士威電磁波預測。<small><a href="https://ptcc.phys.nthu.edu.tw/articles/67bc29611efd7411b20c97e5" target="_blank" rel="noopener">物理雙月刊：電磁英雄傳之十：赫茲</a>｜<a href="https://pansci.asia/archives/135387" target="_blank" rel="noopener">泛科學：電磁波與非破壞檢測</a></small></td>
                </tr>
                <tr id="history-theme-modern">
                  <td class="history-theme-cell">近代物理與原子</td>
                  <td class="history-person-cell">湯木生、密立坎</td>
                  <td>電子、荷質比、基本電荷、電場力平衡。</td>
                  <td>陰極射線與電子；油滴平衡 \(qE=mg\)；帶電粒子在電場或磁場中運動。</td>
                  <td>陰極射線管可證明帶負電粒子存在；油滴實驗用平行板電場平衡重力，統計油滴電荷皆為基本電荷整數倍。<small><a href="https://www.nobelprize.org/prizes/physics/1923/millikan/facts/" target="_blank" rel="noopener">Nobel Prize：Millikan oil drop experiment</a></small></td>
                </tr>
                <tr>
                  <td class="history-theme-cell">近代物理與原子</td>
                  <td class="history-person-cell">拉塞福、波耳</td>
                  <td>原子核、散射、能階、氫原子光譜。</td>
                  <td>金箔散射說明原子大多為空、正電集中在原子核；能階躍遷對應明線光譜。</td>
                  <td>金箔散射用 \(\alpha\) 粒子轟擊薄金箔並觀察偏折角；波耳模型以氫原子放電管與分光儀得到的不連續譜線作為證據。<small><a href="https://lis.org.tw/posts/118" target="_blank" rel="noopener">LIS：拉塞福金箔散射</a>｜<a href="https://www.britannica.com/science/Bohr-model" target="_blank" rel="noopener">Britannica：Bohr model</a></small></td>
                </tr>
                <tr>
                  <td class="history-theme-cell">近代物理與原子</td>
                  <td class="history-person-cell">侖琴、貝克勒、居禮、查兌克</td>
                  <td>X 射線、放射性、原子核組成與中子。</td>
                  <td>辨認不同輻射穿透力、原子核反應、質量數與原子序守恆。</td>
                  <td>陰極射線管與螢光屏可觀察 X 射線；鈾鹽使照相底片感光顯示放射性；查兌克以 \(\alpha\) 粒子撞擊鈹產生中性輻射來推論中子。<small><a href="docs/1-1_history_104.pdf" target="_blank" rel="noopener">附件 PDF：科學史整理</a></small></td>
                </tr>
                <tr>
                  <td class="history-theme-cell">近代物理與原子</td>
                  <td class="history-person-cell">勞厄、布拉格父子</td>
                  <td>X 射線繞射、晶格間距、建設性干涉、布拉格定律。</td>
                  <td>晶面間距 \(d\)、入射角 \(\theta\) 與波長 \(\lambda\) 滿足 \(2d\sin\theta=n\lambda\) 時出現繞射強峰；可由角度反推晶格間距或 X 射線波長。</td>
                  <td>勞厄實驗讓 X 射線通過晶體得到斑點繞射圖樣，證明晶體可作為三維繞射光柵；布拉格定律把晶面反射的光程差寫成 \(2d\sin\theta\)。<small><a href="https://www.nobelprize.org/prizes/physics/1914/laue/facts/" target="_blank" rel="noopener">Nobel Prize：Laue</a>｜<a href="https://www.nobelprize.org/prizes/physics/1915/summary/" target="_blank" rel="noopener">Nobel Prize：Bragg</a>｜<a href="https://www.britannica.com/science/Bragg-law" target="_blank" rel="noopener">Britannica：Bragg law</a></small></td>
                </tr>
                <tr>
                  <td class="history-theme-cell">近代物理與原子</td>
                  <td class="history-person-cell">康普頓散射</td>
                  <td>X 射線光子、動量守恆、波長改變、光的粒子性。</td>
                  <td>光子與近自由電子碰撞後散射，散射光波長變長；用 \(p=h/\lambda\) 說明光子帶有動量，並以能量與動量守恆判斷現象。</td>
                  <td>以 X 射線照射石墨等材料，量測不同散射角的波長位移；康普頓效應是光子粒子性的關鍵證據。<small><a href="https://www.nobelprize.org/prizes/physics/1927/compton/facts/" target="_blank" rel="noopener">Nobel Prize：Compton</a>｜<a href="https://www.britannica.com/science/Compton-effect" target="_blank" rel="noopener">Britannica：Compton effect</a></small></td>
                </tr>
                <tr id="history-theme-quantum">
                  <td class="history-theme-cell">量子、相對論與宇宙</td>
                  <td class="history-person-cell">普朗克、愛因斯坦</td>
                  <td>黑體輻射、光子能量、光電效應、波粒二象性。</td>
                  <td>用 \(E=hf=hc/\lambda\) 判斷光子能量；用 \(K_{\max}=hf-\phi\) 判斷截止頻率與逸出功。</td>
                  <td>黑體輻射曲線無法由古典模型完整解釋，需能量量子化；光電效應用金屬板、單色光與收集電極量測截止電壓。<small><a href="https://www.scimonth.com.tw/archives/6071" target="_blank" rel="noopener">科學月刊：太陽能與光電效應</a>｜<a href="https://ptcc.phys.nthu.edu.tw/articles/67bc32871efd7411b20cc851" target="_blank" rel="noopener">物理雙月刊：愛因斯坦光量子假說</a></small></td>
                </tr>
                <tr>
                  <td class="history-theme-cell">量子、相對論與宇宙</td>
                  <td class="history-person-cell">德布羅意、戴維森與革末</td>
                  <td>物質波、電子繞射、波粒二象性。</td>
                  <td>用 \(\lambda=h/p\) 連接粒子動量與波長，說明電子也能產生繞射。</td>
                  <td>電子束射向鎳晶體會出現繞射強度極大，證明電子具有波動性；晶格間距相當於電子波的繞射光柵。<small><a href="https://www.nobelprize.org/prizes/physics/1929/broglie/facts/" target="_blank" rel="noopener">Nobel Prize：de Broglie matter wave</a>｜<a href="https://www.britannica.com/science/electron-diffraction" target="_blank" rel="noopener">Britannica：electron diffraction</a></small></td>
                </tr>
                <tr>
                  <td class="history-theme-cell">量子、相對論與宇宙</td>
                  <td class="history-person-cell">哈伯、潘奇亞斯、威爾森</td>
                  <td>光譜紅移、宇宙膨脹、宇宙微波背景。</td>
                  <td>用紅移判斷天體遠離；理解微波背景是宇宙早期高溫狀態的證據。</td>
                  <td>星系分光觀測可得到譜線紅移；微波喇叭天線偵測到近乎各向同性的微波背景輻射。<small><a href="docs/1-1_history_104.pdf" target="_blank" rel="noopener">附件 PDF：科學史整理</a></small></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <section class="wide pretest-section page-panel" id="pretestTop" data-main-panel="pretest">
      <div class="pretest-hero">
        <span class="pretest-kicker">高三考前複習｜科技情境｜素養題</span>
        <h2>2026 分科測驗物理科技情境與素養題預試題</h2>
        <p>半導體製程｜半導體與太陽能｜無人機｜光電感測｜AI資料中心散熱</p>
        <p>內容以高中物理可掌握的模型、公式、圖表判讀與實驗探究為主，協助把科技新聞與真實工程情境轉換成可解題的物理語言。</p>
      </div>
      <div class="pretest-body">
        <nav class="pretest-nav" aria-label="預試題快速導覽">
          <a href="#trendOverview">命題趨勢</a>
          <a href="#themeSemiconductor">半導體製程</a>
          <a href="#themeSemiSolar">半導體與太陽能</a>
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
                <p>半導體製程可用「材料導電性可被控制」和「光把圖形轉到晶圓」兩條主線理解。矽晶圓先塗上光阻，光刻 Photolithography 透過光罩把圖形曝光在光阻上；顯影後留下的光阻可當作保護層，未被保護處再經蝕刻或離子佈植，形成電路結構。這裡的重點不是「光直接蝕刻晶圓」，而是光先改變光阻，蝕刻步驟再把圖形轉移到下方材料。</p>
                <p>當元件越做越小時，微影也必須配合元件尺寸，製作線寬很細、分布又很密的電路圖案。一般微影製程常使用波長約 \(193\,\mathrm{nm}\) 的紫外光；若要製造小於 \(32\,\mathrm{nm}\) 的線寬，光穿過光罩窄縫後會明顯繞射，使照射範圍向外擴展。因為線條彼此距離很近，擴散後的曝光區域容易互相重疊，使線條黏在一起，圖案就像解析度不足的照片一樣變得模糊不清。</p>
                <figure class="concept-diagram concept-diagram--source">
                  <img src="https://scitechvista.nat.gov.tw/FileDownload/Article/20201207102349000000164.jpg" alt="簡易的微影製程示意圖，將電路圖案透過光罩、光阻、顯影與蝕刻轉印到晶圓上" loading="lazy">
                  <figcaption>圖片來源：科技大觀園〈<a href="https://scitechvista.nat.gov.tw/Article/c000003/detail?ID=ba7d1350-814b-409a-8fde-3e1b20d9cd6d" target="_blank" rel="noopener">微影製程再進化！複雜電路的祕密</a>〉，圖／簡克志、孔瀞慧繪；依原圖引用，未改作。</figcaption>
                </figure>
                <div class="article-keypoints">
                  <h4>科技大觀園文章重點</h4>
                  <ul>
                    <li>微影是把光罩上的電路圖案轉印到晶圓的關鍵製程；光先改變光阻的可溶解性，顯影後再用蝕刻把圖形轉移到下方材料。</li>
                    <li>實際晶片會堆疊多層材料，因此微影、蝕刻與沉積會反覆進行，每一層常需要不同光罩。</li>
                    <li>線寬縮小時，光穿過光罩開口會發生繞射，使曝光區域變模糊；可用高三波動觀念理解為波長越長，繞射擴散越明顯。</li>
                    <li>多圖案微影把同一圖案拆到兩個以上光罩，讓相鄰結構距離變大，但代價是曝光次數增加，且光罩對準誤差更需要控制。</li>
                    <li>EUV 使用約 \(13.5\,\mathrm{nm}\) 的極紫外光，可降低繞射限制；未來製程可能再搭配雙圖案微影或定向自組裝等技術。</li>
                  </ul>
                </div>
                <figure class="concept-diagram concept-diagram--source">
                  <img src="https://scitechvista.nat.gov.tw/FileDownload/Article/20201207102349000000296.jpg" alt="微影線寬太小時，不同波長與繞射使曝光區域互相覆蓋，造成圖案模糊的示意圖" loading="lazy">
                  <figcaption>圖片來源：科技大觀園〈<a href="https://scitechvista.nat.gov.tw/Article/c000003/detail?ID=ba7d1350-814b-409a-8fde-3e1b20d9cd6d" target="_blank" rel="noopener">微影製程再進化！複雜電路的祕密</a>〉，圖／方劭云提供、簡克志改作；依原圖引用，未改作。</figcaption>
                </figure>
                <div class="article-keypoints">
                  <h4>不同波長與繞射限制</h4>
                  <p>從高三波動觀點看，光通過光罩狹縫時會繞射。當線寬遠大於光的波長時，光大致沿直線前進，光阻上可得到清楚邊界；當線寬縮小到接近波長尺度時，繞射角變大，曝光強度會向旁邊擴散，原本應分開的亮區可能重疊，顯影後就會形成模糊或黏連的圖案。因此微影要做更細線寬，常改用較短波長光源，例如 \(193\,\mathrm{nm}\) 深紫外光或 \(13.5\,\mathrm{nm}\) EUV，降低繞射造成的圖形擴散。</p>
                </div>
                <p>EUV 使用約 \(13.5\,\mathrm{nm}\) 的極紫外光。從高三波動觀點看，曝光圖形的最小可分辨尺度受繞射限制影響，波長越短，繞射造成的模糊越小，因此更有利於做出細線寬。若同一層圖案太密，也可用多圖案微影把線條拆成多次曝光；這會改善單次曝光的間距問題，但也提高光罩疊對與曝光劑量控制的要求。</p>
                <ul>
                  <li>矽晶圓、光刻、光阻、顯影與蝕刻</li>
                  <li>DUV、EUV、繞射限制與解析度</li>
                  <li>多圖案微影、疊對誤差與線寬控制</li>
                </ul>
              </div>
              <div>
                <div class="definition-box"><strong>名詞定義：</strong>EUV 是 Extreme Ultraviolet，指波長約 \(13.5\,\mathrm{nm}\) 的極紫外光；光阻是受光後溶解度或化學性質改變的材料；光罩是帶有電路圖案的遮罩，用來決定哪些區域曝光。</div>
                <div class="formula-box">高三必懂公式：\(E=hf\)、\(c=f\lambda\)。繞射限制下，最小可分辨尺度可用 \(d\propto \lambda\) 判斷；解析能力約與 \(d\) 成反比，因此波長越短，解析度越高。</div>
                <div class="ask-box">可能分科測驗問法：短波長為何提升解析度？線寬接近波長時為何模糊？多圖案微影如何改善密集線條？</div>
                <div class="reference-box">
                  <h4>參考網站／影片</h4>
                  <ul>
                    <li><a href="https://scitechvista.nat.gov.tw/Article/c000003/detail?ID=ba7d1350-814b-409a-8fde-3e1b20d9cd6d" target="_blank" rel="noopener">科技大觀園：微影製程再進化！複雜電路的祕密</a></li>
                    <li><a href="https://www.asml.com/zh-tw/technology?icmp=tw-learn-more-about-asml-technology" target="_blank" rel="noopener">ASML：全方位微影技術介紹</a></li>
                    <li><a href="https://www.youtube.com/results?search_query=EUV+%E6%A5%B5%E7%B4%AB%E5%A4%96%E5%85%89+%E5%BE%AE%E5%BD%B1+%E5%8E%9F%E7%90%86" target="_blank" rel="noopener">YouTube：EUV 極紫外光微影原理</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </article>

          <article class="theme-card" id="themeSemiSolar">
            <h3>主題二：半導體與太陽能電池</h3>
            <div class="theme-layout">
              <div>
                <p>半導體的導電性介於導體與絕緣體之間，而且可用摻雜、光照與外加電壓控制。矽原子有四個價電子；若摻入五價原子，較容易提供自由電子，形成 N 型半導體；若摻入三價原子，較容易形成電洞，形成 P 型半導體。電子帶負電，電洞可視為帶正電，因此在電場中受力方向相反。</p>
                <p>P 型與 N 型半導體接在一起會形成 PN 接面。接面附近電子與電洞先互相擴散並復合，留下帶電離子，形成耗盡區與內建電場。太陽能電池就是利用這個接面：光子能量若足夠，可在半導體中產生電子與電洞；內建電場把兩種載子分離，外接電路便可得到光電流與電功率。LED 則可視為反向的能量轉換，電能使電子與電洞復合並放出光。</p>
                <figure class="concept-diagram concept-diagram--source">
                  <img src="assets/topic-images/pansci-solar-pn-junction-grid.jpg" alt="泛科學文章中的 PN 接面二極體示意圖，已整理為左上 a、右上 b、左下 c、右下 d，說明 P 型與 N 型半導體接合後形成空乏層與內建電場" loading="lazy">
                  <figcaption>圖片來源：泛科學〈<a href="https://pansci.asia/archives/358894" target="_blank" rel="noopener">將陽光轉變成電能的太陽能電池</a>〉，圖／台灣東販；依原圖引用，未改作。</figcaption>
                </figure>
                <div class="article-keypoints">
                  <h4>泛科學文章重點</h4>
                  <ul>
                    <li>太陽能電池不是用來儲存電能的乾電池，而是把入射光能直接轉成電能的半導體光電元件。</li>
                    <li>單純照光還不夠，必須有 PN 接面。接面附近電子與電洞擴散後會復合，形成幾乎沒有自由載子的空乏層；留下的固定離子造成內建電場與位能障壁。</li>
                    <li>陽光進入空乏層時，若光子能量足以跨越能隙，就可產生電子-電洞對。內建電場使電子往 N 型側、電洞往 P 型側分離，外接電路因此出現電動勢與光電流。</li>
                    <li>可用高三近代物理公式 \(E=\frac{hc}{\lambda}\)，或 \(E[\mathrm{eV}]\approx\frac{1240}{\lambda[\mathrm{nm}]}\) 判斷光子能量。矽能隙約 \(1.12\,\mathrm{eV}\)，約對應 \(1100\,\mathrm{nm}\)，因此矽太陽能電池主要吸收波長比此更短的光。</li>
                    <li>太陽能電池做成薄片，是因為輸出電流大致與 PN 接面受光面積有關；材料的吸收係數也會影響效率，所以 GaAs 等材料雖成本高，仍常被討論於高效率應用。</li>
                  </ul>
                </div>
                <figure class="concept-diagram concept-diagram--source">
                  <img src="assets/topic-images/pansci-solar-photovoltaic-grid.jpg" alt="泛科學文章中的用光發電機制示意圖，已整理為左 a、右 b，說明光照空乏層後電子與電洞被內建電場分離並在外部電路形成電流" loading="lazy">
                  <figcaption>圖片來源：泛科學〈<a href="https://pansci.asia/archives/358894" target="_blank" rel="noopener">將陽光轉變成電能的太陽能電池</a>〉，圖／台灣東販；依原圖引用，未改作。</figcaption>
                </figure>
                <ul>
                  <li>摻雜、N 型／P 型半導體與多數載子</li>
                  <li>PN 接面、耗盡區、內建電場與順逆偏壓</li>
                  <li>太陽能電池、LED、光電二極體與 CMOS 感測</li>
                </ul>
              </div>
              <div>
                <div class="definition-box"><strong>名詞定義：</strong>N 型半導體以電子為多數載子；P 型半導體以電洞為多數載子；PN 接面是 P 型與 N 型半導體接觸後形成的電荷分離區；太陽能電池利用光生伏特效應把光能轉換成電能。</div>
                <div class="formula-box">高三必懂公式：\(E=hf=\frac{hc}{\lambda}\)、\(P=IV\)、\(\eta=\frac{P_{\mathrm{out}}}{P_{\mathrm{in}}}\)。若光子能量大於能隙，才較可能產生可分離的電子-電洞對。</div>
                <div class="ask-box">可能分科測驗問法：摻入三價或五價原子後多數載子為何？PN 接面內建電場如何分離光生載子？太陽能板的輸出功率與效率如何估算？</div>
                <div class="reference-box">
                  <h4>參考網站／影片</h4>
                  <ul>
                    <li><a href="https://pansci.asia/archives/358894" target="_blank" rel="noopener">泛科學：將陽光轉變成電能的太陽能電池</a></li>
                    <li><a href="https://zh.wikipedia.org/wiki/Pn%E7%BB%93" target="_blank" rel="noopener">PN 接面基本概念</a></li>
                    <li><a href="https://zh.wikipedia.org/zh-tw/%E5%8D%8A%E5%B0%8E%E9%AB%94" target="_blank" rel="noopener">半導體基本概念</a></li>
                    <li><a href="https://www.youtube.com/results?search_query=%E5%A4%AA%E9%99%BD%E8%83%BD%E9%9B%BB%E6%B1%A0+PN+%E6%8E%A5%E9%9D%A2+%E9%AB%98%E4%B8%AD%E7%89%A9%E7%90%86" target="_blank" rel="noopener">YouTube：太陽能電池與 PN 接面</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </article>

          <article class="theme-card" id="themeDrone">
            <h3>主題三：無人機飛行操控原理</h3>
            <div class="theme-layout">
              <div>
                <p>四旋翼無人機的核心是「總力控制平動、總力矩控制轉動」。懸停時，四個螺旋槳的總升力等於重力，鉛直方向合力為零。若要前進，機身會先產生俯仰 pitch，使總推力不再完全鉛直；推力的水平分量提供向前加速度，鉛直分量則仍需接近重力以維持高度。</p>
                <p>每個螺旋槳旋轉時都會給機身一個反作用力矩。四軸通常讓相鄰螺旋槳反向旋轉，使角動量與反作用力矩大致抵消。若要偏航 yaw，可讓順時針與逆時針兩組螺旋槳的轉速不再平衡，產生繞鉛直軸的淨力矩；若要滾轉 roll 或俯仰 pitch，則改變左右或前後螺旋槳升力，讓機身先傾斜，再利用推力分量改變行進方向。</p>
                <figure class="concept-diagram concept-diagram--source">
                  <img src="assets/topic-images/quadcopter-motion-principles.png" alt="四軸飛行器 X 形配置與前後左右、順逆時針偏航運動的旋翼調整示意圖" loading="lazy">
                  <figcaption>圖片來源：GitBook〈<a href="https://hom-wang.gitbooks.io/quadcopter/content/02_Principles.html" target="_blank" rel="noopener">從零開始做四軸飛行器：運動原理</a>〉；依原圖引用，未改作。</figcaption>
                </figure>
                <div class="article-keypoints">
                  <h4>四軸飛行原理重點</h4>
                  <ul>
                    <li>四軸常採 X 形配置。相鄰旋翼反向旋轉、對角旋翼同向旋轉，可讓兩組反作用力矩大致互相抵銷。</li>
                    <li>同時增加或減少四個旋翼推力，可控制上升或下降；懸停時總升力需等於重力。</li>
                    <li>前後左右移動不是靠「水平螺旋槳」推動，而是先讓機身傾斜，使總推力分解出水平分量。</li>
                    <li>偏航 yaw 來自兩組旋轉方向不同的旋翼反作用力矩不平衡；俯仰 pitch 與滾轉 roll 則來自前後或左右升力差。</li>
                    <li>複雜飛行可視為上升下降、平移、偏航三類基本運動的組合，適合用 \(\sum F=ma\) 與 \(\sum\tau=I\alpha\) 建模。</li>
                  </ul>
                </div>
                <div class="force-analysis-steps">
                  <article class="force-step">
                    <img src="assets/topic-images/quadcopter-force-hover-large.png" alt="四旋翼無人機懸停時，前後旋翼升力向上、重力向下，總升力等於重力">
                    <div>
                      <h4>懸停：先看合力，再看合力矩</h4>
                      <p>高度不變表示鉛直合力為零，因此總升力需滿足 \(T_{\mathrm{total}}=mg\)。同時還要檢查力矩：前後升力若不平衡會俯仰，左右升力若不平衡會滾轉，所以穩定懸停必須同時滿足「合力為零」與「合力矩為零」。</p>
                    </div>
                  </article>
                  <article class="force-step">
                    <img src="assets/topic-images/quadcopter-force-forward-large.png" alt="四旋翼無人機前進時，機身前傾，總推力分解為鉛直分量與水平分量">
                    <div>
                      <h4>前進：不是水平推，是先讓機身傾斜</h4>
                      <p>無人機沒有水平螺旋槳。它先讓機身前傾，使旋翼總推力 \(T\) 不再鉛直。此時 \(T\cos\theta\) 抵抗重力，若高度近似不變可取 \(T\cos\theta\approx mg\)；\(T\sin\theta\) 則是水平合力，造成前進加速度。</p>
                    </div>
                  </article>
                  <article class="force-step">
                    <img src="assets/topic-images/quadcopter-force-roll-large.png" alt="四旋翼無人機滾轉時，左右旋翼升力不同，升力差乘上力臂形成滾轉力矩">
                    <div>
                      <h4>滾轉與俯仰：升力差乘上力臂</h4>
                      <p>從後視圖看，左右旋翼相對質心有力臂 \(r\)。若左側升力比右側大，升力差 \(\Delta T\) 會產生繞機身前後軸的滾轉力矩，量級可寫成 \(\tau\approx r\Delta T\)。若改成前後升力不同，則力矩軸改變，造成俯仰。</p>
                    </div>
                  </article>
                  <article class="force-step">
                    <img src="assets/topic-images/quadcopter-force-yaw-large.png" alt="四旋翼無人機偏航時，順時針與逆時針旋翼的反作用力矩不平衡，使機身繞鉛直軸旋轉">
                    <div>
                      <h4>偏航：比較兩組旋翼的反作用力矩</h4>
                      <p>每個旋翼被馬達帶動旋轉時，機身會受到反方向的反作用力矩。四軸用 CW 與 CCW 兩組旋翼互相抵銷；若提高其中一組轉速、降低另一組轉速，並讓總升力近似不變，就會得到 \(\sum\tau_z\neq0\)，機身繞鉛直軸偏航 yaw。</p>
                    </div>
                  </article>
                </div>
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
                    <li><a href="https://hom-wang.gitbooks.io/quadcopter/content/02_Principles.html" target="_blank" rel="noopener">GitBook：從零開始做四軸飛行器－運動原理</a></li>
                    <li><a href="https://learn.parallax.com/courses/understanding-the-physics-of-multirotor-flight/lessons/rotation-torque-and-angular-momentum/" target="_blank" rel="noopener">Parallax：Rotation, Torque and Angular Momentum</a></li>
                    <li><a href="https://www.youtube.com/watch?v=rNo2Gb_9ag4" target="_blank" rel="noopener">YouTube：四軸無人機原理影片</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </article>

          <article class="theme-card" id="themeOptic">
            <h3>主題四：雙狹縫／薄膜干涉 × 光電元件 × 半導體感測器</h3>
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
                <div class="formula-box">高三必懂公式：\(\Delta y=\lambda L/d\)、薄膜光程差約為 \(2nt\)，相消或相長需再判斷反射相位；常見抗反射膜厚可用 \(t=\lambda/(4n)\) 估算，光電效應用 \(K_{\max}=hf-\phi\)。</div>
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
            <h3>主題五：AI資料中心散熱 × 熱學 × 能量效率</h3>
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
    const state = { year: DATA.exams[0]?.year, activeMain: "exams" };
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
        .replace(/\n{2,}/g, "<br><br>")
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

    function renderSolutionText(value) {
      const text = String(value || "").trim();
      if (!text) return '<p class="small">尚未補入詳解。</p>';
      const explicitParagraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
      const paragraphs = explicitParagraphs.length > 1
        ? explicitParagraphs
        : text
          .split(/(?<=。)/)
          .map((part) => part.trim())
          .filter(Boolean)
          .reduce((chunks, sentence, index) => {
            const chunkIndex = Math.floor(index / 2);
            chunks[chunkIndex] = (chunks[chunkIndex] || "") + sentence;
            return chunks;
          }, []);
      return paragraphs.map((paragraph) => '<p>' + renderScientificText(paragraph) + '</p>').join("");
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
        semisolar: "半導體與太陽能",
        drone: "無人機操控",
        optic: "干涉與感測",
        cooling: "資料中心散熱"
      }[id] || id;
    }

    function pretestTopicIcon(id) {
      const icons = {
        semi: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="13" y="13" width="22" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M8 16h5M8 24h5M8 32h5M35 16h5M35 24h5M35 32h5M16 8v5M24 8v5M32 8v5M16 35v5M24 35v5M32 35v5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M19 24h10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
        semisolar: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M21 26h20l-4 16H17l4-16Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M24 26l-3 16M32 26l-1 16M39 33H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M29 10h10v7h-7v6" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>',
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

    function renderMainPanels() {
      document.querySelectorAll("[data-main-tab]").forEach((button) => {
        button.classList.toggle("active", button.dataset.mainTab === state.activeMain);
      });
      document.querySelectorAll("[data-main-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.mainPanel === state.activeMain);
      });
      if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
        const activePanel = document.querySelector('[data-main-panel="' + state.activeMain + '"]');
        if (activePanel) window.MathJax.typesetPromise([activePanel]).catch(() => {});
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
        '<div class="solution-text">' + renderSolutionText(q.solution) + '</div>' +
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
    document.querySelector(".main-topic-tabs").addEventListener("click", (event) => {
      const button = event.target.closest("[data-main-tab]");
      if (!button) return;
      state.activeMain = button.dataset.mainTab;
      renderMainPanels();
      window.scrollTo({ top: 0, behavior: "smooth" });
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
    renderMainPanels();
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(root, "index.html"), "\ufeff" + site, "utf8");

const publishDir = path.join(root, "publish");
fs.mkdirSync(publishDir, { recursive: true });
fs.writeFileSync(path.join(publishDir, "index.html"), "\ufeff" + site, "utf8");

function copyDirectorySync(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectorySync(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

for (const dirName of ["assets", "docs"]) {
  const sourceDir = path.join(root, dirName);
  const targetDir = path.join(publishDir, dirName);
  if (fs.existsSync(sourceDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    copyDirectorySync(sourceDir, targetDir);
  }
}

console.log(`Generated ${exams.length} exams`);

