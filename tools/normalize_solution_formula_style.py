import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "official-links.json"

SUP = str.maketrans({
    "+": "⁺",
    "-": "⁻",
    "−": "⁻",
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "(": "⁽",
    ")": "⁾",
})

SUB = str.maketrans({
    "+": "₊",
    "-": "₋",
    "−": "₋",
    "0": "₀",
    "1": "₁",
    "2": "₂",
    "3": "₃",
    "4": "₄",
    "5": "₅",
    "6": "₆",
    "7": "₇",
    "8": "₈",
    "9": "₉",
    "a": "ₐ",
    "e": "ₑ",
    "h": "ₕ",
    "i": "ᵢ",
    "j": "ⱼ",
    "k": "ₖ",
    "l": "ₗ",
    "m": "ₘ",
    "n": "ₙ",
    "o": "ₒ",
    "p": "ₚ",
    "r": "ᵣ",
    "s": "ₛ",
    "t": "ₜ",
    "u": "ᵤ",
    "v": "ᵥ",
    "x": "ₓ",
})


def normalize(text):
    if not isinstance(text, str):
        return text
    text = re.sub(r"\bPi\b|\bpi\b", "π", text)
    text = re.sub(r"\balpha\b", "α", text)
    text = re.sub(r"\bbeta\b", "β", text)
    text = re.sub(r"\bgamma\b", "γ", text)
    text = re.sub(r"\btheta\b", "θ", text)
    text = re.sub(r"\blambda\b", "λ", text)
    text = re.sub(r"\bomega\b", "ω", text)
    text = re.sub(r"\bDelta\b", "Δ", text)
    text = re.sub(r"\^\(([^)]+)\)", lambda m: m.group(1).translate(SUP), text)
    text = re.sub(r"\^([+\-−]?\d+)", lambda m: m.group(1).translate(SUP), text)
    text = re.sub(r"_([A-Za-z]+|[0-9]+)(?![A-Za-z0-9])", lambda m: m.group(1).translate(SUB), text)
    return text


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8-sig"))
    for analysis in data.get("analysis", []):
        for question in analysis.get("questions", []):
            for key in ("solution", "commonMistake", "keyConcept"):
                question[key] = normalize(question.get(key, ""))
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
