from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets" / "topic-images"


def font(size: int) -> ImageFont.FreeTypeFont:
    for path in (
        Path("C:/Windows/Fonts/msjhbd.ttc"),
        Path("C:/Windows/Fonts/msjh.ttc"),
        Path("C:/Windows/Fonts/NotoSansCJK-Regular.ttc"),
    ):
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def fit_panel(panel: Image.Image, size: tuple[int, int]) -> Image.Image:
    canvas = Image.new("RGB", size, "white")
    panel = panel.copy()
    panel.thumbnail((size[0] - 28, size[1] - 22), Image.Resampling.LANCZOS)
    x = (size[0] - panel.width) // 2
    y = (size[1] - panel.height) // 2
    canvas.paste(panel, (x, y))
    return canvas


def draw_title(draw: ImageDraw.ImageDraw, text: str, width: int) -> None:
    title_font = font(34)
    box = draw.textbbox((0, 0), text, font=title_font)
    draw.text(((width - (box[2] - box[0])) // 2, 24), text, fill="#111827", font=title_font)


def compose_grid(
    src_name: str,
    out_name: str,
    title: str,
    crops: list[tuple[int, int, int, int]],
    columns: int,
    panel_size: tuple[int, int],
) -> None:
    source = Image.open(ASSET_DIR / src_name).convert("RGB")
    gap = 28
    margin = 34
    title_h = 88
    rows = (len(crops) + columns - 1) // columns
    width = columns * panel_size[0] + (columns - 1) * gap + margin * 2
    height = title_h + rows * panel_size[1] + (rows - 1) * gap + margin
    canvas = Image.new("RGB", (width, height), "#ffffff")
    draw = ImageDraw.Draw(canvas)
    draw_title(draw, title, width)

    for index, crop in enumerate(crops):
        panel = fit_panel(source.crop(crop), panel_size)
        col = index % columns
        row = index // columns
        x = margin + col * (panel_size[0] + gap)
        y = title_h + row * (panel_size[1] + gap)
        draw.rounded_rectangle(
            (x - 1, y - 1, x + panel_size[0] + 1, y + panel_size[1] + 1),
            radius=14,
            outline="#bae6fd",
            width=3,
            fill="#ffffff",
        )
        canvas.paste(panel, (x, y))

    canvas.save(ASSET_DIR / out_name, quality=95, optimize=True)


def main() -> None:
    compose_grid(
        src_name="pansci-solar-pn-junction.jpg",
        out_name="pansci-solar-pn-junction-grid.jpg",
        title="圖 5-1  pn 接面二極體的載子",
        crops=[
            (118, 92, 900, 440),
            (118, 465, 900, 800),
            (118, 810, 900, 1165),
            (118, 1175, 900, 1538),
        ],
        columns=2,
        panel_size=(700, 350),
    )
    compose_grid(
        src_name="pansci-solar-photovoltaic.jpg",
        out_name="pansci-solar-photovoltaic-grid.jpg",
        title="圖 5-2  用光發電的機制",
        crops=[
            (110, 85, 900, 625),
            (110, 625, 900, 1280),
        ],
        columns=2,
        panel_size=(720, 560),
    )


if __name__ == "__main__":
    main()
