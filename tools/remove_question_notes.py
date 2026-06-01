import json
import re
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"
NOTE_KEYS = ["commonMistake", "commonMistakes", "keyConcept"]

SYMBOL_FONT_MAP = {
    "\uf028": "(",
    "\uf029": ")",
    "\uf02b": "+",
    "\uf02d": "-",
    "\uf03d": "=",
    "\uf044": "Δ",
    "\uf057": "Ω",
    "\uf05c": "∴",
    "\uf061": "α",
    "\uf062": "β",
    "\uf067": "γ",
    "\uf06c": "λ",
    "\uf06d": "μ",
    "\uf06f": "°",
    "\uf070": "π",
    "\uf071": "θ",
    "\uf072": "ρ",
    "\uf074": "τ",
    "\uf076": "ν",
    "\uf077": "ω",
    "\uf086": "→",
    "\uf0a2": "′",
    "\uf0a3": "≤",
    "\uf0b0": "°",
    "\uf0b3": "≥",
    "\uf0b4": "×",
    "\uf0bb": "≈",
    "\uf0d7": "×",
    "\uf0de": "⇒",
    "\uf0e5": "Σ",
    "\uf0e6": "(",
    "\uf0e7": "|",
    "\uf0e8": "(",
    "\uf0f6": ")",
    "\uf0f7": "|",
    "\uf0f8": ")",
}

NOTE_PATTERNS = [
    re.compile(r"本題素養型態為[^。]*常見錯誤[^。]*。"),
    re.compile(r"常見錯誤[^。]*。"),
    re.compile(r"關鍵觀念[^。]*。"),
]


def normalize_text(text):
    for source, target in SYMBOL_FONT_MAP.items():
        text = text.replace(source, target)
    # Only normalize CJK compatibility ideographs from old PDFs; full NFKC would
    # flatten superscripts/subscripts such as v² and v₀, which are needed here.
    text = "".join(
        unicodedata.normalize("NFKC", char) if 0xF900 <= ord(char) <= 0xFAFF else char
        for char in text
    )
    for pattern in NOTE_PATTERNS:
        text = pattern.sub("", text)
    text = re.sub(r"\s+([,.;:!?，。；：、）\)])", r"\1", text)
    text = re.sub(r"([（\(])\s+", r"\1", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def sanitize(value):
    if isinstance(value, str):
        return normalize_text(value)
    if isinstance(value, list):
        return [sanitize(item) for item in value]
    if isinstance(value, dict):
        for key in NOTE_KEYS:
            value.pop(key, None)
        return {key: sanitize(item) for key, item in value.items()}
    return value


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    data = sanitize(data)
    DATA_PATH.write_text("\ufeff" + json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
