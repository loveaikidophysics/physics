from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "topic-images"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    names = ["msjhbd.ttc", "msjh.ttc"] if bold else ["msjh.ttc", "msjhbd.ttc"]
    for name in names:
        path = Path("C:/Windows/Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


F_TITLE = font(42, True)
F_LABEL = font(32, True)
F_TEXT = font(29)

BLUE = "#2563eb"
RED = "#dc2626"
GREEN = "#059669"
DARK = "#111827"
SLATE = "#334155"
GRAY = "#64748b"
PAPER = "#ffffff"
BG = "#f8fbff"
BORDER = "#bfdbfe"
BODY = "#e0f2fe"
ROTOR = "#dbeafe"
HOT = "#fee2e2"


def arrow(draw: ImageDraw.ImageDraw, a: tuple[float, float], b: tuple[float, float], color: str, width: int = 7) -> None:
    draw.line([a, b], fill=color, width=width)
    angle = math.atan2(b[1] - a[1], b[0] - a[0])
    size = width * 2.8
    p1 = b
    p2 = (b[0] - size * math.cos(angle - math.pi / 6), b[1] - size * math.sin(angle - math.pi / 6))
    p3 = (b[0] - size * math.cos(angle + math.pi / 6), b[1] - size * math.sin(angle + math.pi / 6))
    draw.polygon([p1, p2, p3], fill=color)


def arc_arrow(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], start: int, end: int, color: str, width: int = 8) -> None:
    draw.arc(box, start=start, end=end, fill=color, width=width)
    cx = (box[0] + box[2]) / 2
    cy = (box[1] + box[3]) / 2
    rx = (box[2] - box[0]) / 2
    ry = (box[3] - box[1]) / 2
    t = math.radians(end)
    ex = cx + rx * math.cos(t)
    ey = cy + ry * math.sin(t)
    tangent = t + math.pi / 2
    size = width * 2.5
    p1 = (ex, ey)
    p2 = (ex - size * math.cos(tangent - math.pi / 6), ey - size * math.sin(tangent - math.pi / 6))
    p3 = (ex - size * math.cos(tangent + math.pi / 6), ey - size * math.sin(tangent + math.pi / 6))
    draw.polygon([p1, p2, p3], fill=color)


def spin_arrow(
    draw: ImageDraw.ImageDraw,
    center: tuple[int, int],
    radius: int,
    direction: str,
    color: str,
    width: int = 8,
) -> None:
    if direction == "ccw":
        start, end = -55, 245
    else:
        start, end = 55, -245
    steps = 34
    points = []
    for i in range(steps + 1):
        t = math.radians(start + (end - start) * i / steps)
        points.append((center[0] + radius * math.cos(t), center[1] - radius * math.sin(t)))
    draw.line(points, fill=color, width=width, joint="curve")
    arrow(draw, points[-2], points[-1], color, width)


def label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, color: str = SLATE, bold: bool = False) -> None:
    draw.text(xy, text, fill=color, font=F_LABEL if bold else F_TEXT)


def center_label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, color: str = DARK) -> None:
    box = draw.textbbox((0, 0), text, font=F_TEXT)
    draw.text((xy[0] - (box[2] - box[0]) / 2, xy[1] - (box[3] - box[1]) / 2), text, fill=color, font=F_TEXT)


def base(title: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (980, 560), BG)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([18, 18, 962, 542], radius=24, fill=PAPER, outline=BORDER, width=4)
    draw.text((46, 40), title, fill=DARK, font=F_TITLE)
    return img, draw


def rotor(draw: ImageDraw.ImageDraw, x: int, y: int, hot: bool = False, text: str = "") -> None:
    fill = HOT if hot else ROTOR
    outline = RED if hot else DARK
    draw.ellipse([x - 54, y - 54, x + 54, y + 54], fill=fill, outline=outline, width=8)
    if text:
        center_label(draw, (x, y), text)


def save(img: Image.Image, name: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img.save(OUT_DIR / name, quality=96, optimize=True)


def draw_hover() -> None:
    img, draw = base("懸停：鉛直方向受力平衡")
    y = 280
    left = (285, y)
    right = (695, y)
    center = (490, y)
    draw.line([left, right], fill=DARK, width=12)
    draw.rounded_rectangle([center[0] - 58, center[1] - 34, center[0] + 58, center[1] + 34], radius=12, fill=BODY, outline=DARK, width=6)
    rotor(draw, *left, text="前")
    rotor(draw, *right, text="後")
    arrow(draw, (left[0], y + 8), (left[0], 132), BLUE)
    arrow(draw, (right[0], y + 8), (right[0], 132), BLUE)
    arrow(draw, center, (center[0], 448), RED)
    label(draw, (215, 105), "前方升力")
    label(draw, (625, 105), "後方升力")
    label(draw, (510, 418), "重力 mg", RED)
    save(img, "quadcopter-force-hover-large.png")


def draw_forward() -> None:
    img, draw = base("前進：側視圖，總推力分解")
    center = (490, 298)
    theta = math.radians(18)
    half = 225
    rear = (center[0] - half * math.cos(theta), center[1] - half * math.sin(theta))
    front = (center[0] + half * math.cos(theta), center[1] + half * math.sin(theta))
    draw.line([rear, front], fill=DARK, width=12)
    draw.rounded_rectangle([center[0] - 58, center[1] - 34, center[0] + 58, center[1] + 34], radius=12, fill=BODY, outline=DARK, width=6)
    rotor(draw, int(rear[0]), int(rear[1]), text="後")
    rotor(draw, int(front[0]), int(front[1]), text="前")
    # Total thrust is approximately perpendicular to the rotor plane, tilted forward.
    arrow(draw, center, (635, 110), BLUE, 8)
    arrow(draw, center, (center[0], 120), BLUE, 6)
    arrow(draw, center, (685, center[1]), GREEN, 6)
    arrow(draw, center, (center[0], 468), RED, 7)
    label(draw, (642, 102), "總推力 T", BLUE)
    label(draw, (505, 130), "T cosθ", BLUE)
    label(draw, (670, 266), "T sinθ", GREEN)
    label(draw, (505, 438), "mg", RED)
    arrow(draw, (770, 418), (900, 418), GREEN, 6)
    label(draw, (765, 382), "前進方向", GREEN, True)
    save(img, "quadcopter-force-forward-large.png")


def draw_roll() -> None:
    img, draw = base("滾轉：後視圖，左右升力差造成力矩")
    y = 295
    left = (285, y)
    right = (695, y)
    center = (490, y)
    draw.line([left, right], fill=DARK, width=12)
    draw.rounded_rectangle([center[0] - 58, center[1] - 34, center[0] + 58, center[1] + 34], radius=12, fill=BODY, outline=DARK, width=6)
    rotor(draw, *left, hot=True, text="左")
    rotor(draw, *right, text="右")
    arrow(draw, (left[0], y + 10), (left[0], 112), BLUE, 9)
    arrow(draw, (right[0], y + 10), (right[0], 170), BLUE, 6)
    arrow(draw, center, (center[0], 448), RED, 7)
    draw.line([(left[0], 410), (right[0], 410)], fill=GRAY, width=4)
    arrow(draw, (center[0], 410), (left[0], 410), GRAY, 4)
    arrow(draw, (center[0], 410), (right[0], 410), GRAY, 4)
    arc_arrow(draw, (610, 180, 820, 390), 280, 52, DARK, 9)
    label(draw, (205, 96), "較大升力")
    label(draw, (627, 150), "較小升力")
    label(draw, (394, 420), "力臂 r", GRAY)
    label(draw, (735, 228), "力矩", DARK)
    save(img, "quadcopter-force-roll-large.png")


def draw_yaw() -> None:
    img = Image.new("RGB", (980, 720), BG)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([18, 18, 962, 702], radius=24, fill=PAPER, outline=BORDER, width=4)
    draw.text((46, 42), "偏航：上視圖，旋翼反作用力矩不平衡", fill=DARK, font=F_TITLE)
    center = (490, 335)
    pts = {
        "FL": (310, 220),
        "FR": (670, 220),
        "RL": (310, 450),
        "RR": (670, 450),
    }
    draw.line([pts["FL"], pts["RR"]], fill=DARK, width=11)
    draw.line([pts["FR"], pts["RL"]], fill=DARK, width=11)
    draw.ellipse([center[0] - 32, center[1] - 32, center[0] + 32, center[1] + 32], fill=DARK)
    rotor(draw, *pts["FL"], hot=True)
    rotor(draw, *pts["FR"])
    rotor(draw, *pts["RL"])
    rotor(draw, *pts["RR"], hot=True)
    spin_arrow(draw, pts["FL"], 74, "ccw", RED, 8)
    spin_arrow(draw, pts["RR"], 74, "ccw", RED, 8)
    spin_arrow(draw, pts["FR"], 74, "cw", DARK, 8)
    spin_arrow(draw, pts["RL"], 74, "cw", DARK, 8)
    spin_arrow(draw, center, 124, "cw", RED, 10)
    draw.rounded_rectangle([62, 550, 918, 688], radius=16, fill="#f8fafc", outline=BORDER, width=3)
    draw.text((86, 564), "紅色組：逆時針 CCW，轉速較大", fill=RED, font=F_LABEL)
    draw.text((86, 610), "黑色組：順時針 CW，轉速較小", fill=DARK, font=F_TEXT)
    draw.text((86, 646), "兩組反作用力矩不平衡，機身產生順時針 yaw。", fill=DARK, font=F_TEXT)
    save(img, "quadcopter-force-yaw-large.png")


def main() -> None:
    draw_hover()
    draw_forward()
    draw_roll()
    draw_yaw()


if __name__ == "__main__":
    main()
