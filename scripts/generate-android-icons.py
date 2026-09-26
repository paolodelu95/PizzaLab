from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/branding/pizzalab-icon-v3.png"
RED = (205, 60, 42, 255)
CREAM = (247, 241, 230, 255)


def extract_mark(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    width, height = rgb.size
    red = (205, 60, 42)
    cream = (247, 241, 230)
    axis = tuple(cream[index] - red[index] for index in range(3))
    norm = sum(value * value for value in axis)
    strength = []
    candidate = bytearray(width * height)
    for y in range(height):
        for x in range(width):
            pixel = rgb.getpixel((x, y))
            projection = sum((pixel[index] - red[index]) * axis[index] for index in range(3)) / norm
            value = max(0.0, min(1.0, projection))
            strength.append(value)
            if value > 0.08:
                candidate[y * width + x] = 1

    outside = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))
    while queue:
        x, y = queue.popleft()
        index = y * width + x
        if outside[index] or not candidate[index]:
            continue
        outside[index] = 1
        if x:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))

    mark = Image.new("RGBA", (width, height))
    pixels = mark.load()
    for y in range(height):
        for x in range(width):
            index = y * width + x
            if candidate[index] and not outside[index]:
                pixels[x, y] = (*CREAM[:3], round(strength[index] * 255))
    box = mark.getbbox()
    if not box:
        raise RuntimeError("Logo mark not found")
    return mark.crop(box)


def centered_mark(canvas: Image.Image, mark: Image.Image, fraction: float) -> None:
    target = round(min(canvas.size) * fraction)
    resized = mark.copy()
    resized.thumbnail((target, target), Image.Resampling.LANCZOS)
    x = (canvas.width - resized.width) // 2
    y = (canvas.height - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))


def legacy_icon(size: int, mark: Image.Image) -> Image.Image:
    icon = Image.new("RGBA", (size, size), CREAM)
    margin = round(size * 0.055)
    radius = round(size * 0.22)
    ImageDraw.Draw(icon).rounded_rectangle(
        (margin, margin, size - margin, size - margin),
        radius=radius,
        fill=RED,
    )
    centered_mark(icon, mark, 0.52)
    return icon


def foreground_icon(size: int, mark: Image.Image) -> Image.Image:
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    centered_mark(icon, mark, 0.40)
    return icon


def main() -> None:
    mark = extract_mark(Image.open(SOURCE))
    master = legacy_icon(1024, mark)
    master.save(ROOT / "assets/branding/pizzalab-icon-v4.png")
    densities = {
        "mdpi": (48, 108),
        "hdpi": (72, 162),
        "xhdpi": (96, 216),
        "xxhdpi": (144, 324),
        "xxxhdpi": (192, 432),
    }
    resources = ROOT / "android/app/src/main/res"
    for density, (legacy_size, foreground_size) in densities.items():
        folder = resources / f"mipmap-{density}"
        legacy = legacy_icon(legacy_size, mark)
        legacy.save(folder / "ic_launcher.png")
        legacy.save(folder / "ic_launcher_round.png")
        foreground_icon(foreground_size, mark).save(folder / "ic_launcher_foreground.png")


if __name__ == "__main__":
    main()
