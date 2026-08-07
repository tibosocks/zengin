#!/usr/bin/env python3
"""Marka görsellerini kaynak PNG'lerden üretir.

Kaynaklar (resimler/):
  logo.png     1920x1920, beyaz zemin, alfa yok
  favicon.png  500x500, beyaz zemin, alfa yok

Üretilenler (public/brand/ ve public/):
  logo.svg / logo.png            kırpılmış, saydam, siyah yazı
  logo-white.png                 koyu zemin için beyaz yazı
  favicon.ico + favicon-*.png    tarayıcı sekmesi ikonları
  apple-touch-icon.png           iOS ana ekran ikonu
  og-image.png                   sosyal medya paylaşım görseli (1200x630)

Çalıştırma:  python3 scripts/build-brand-assets.py
"""

from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "resimler"
OUT = ROOT / "public" / "brand"
PUBLIC = ROOT / "public"

# Kaynak görsellerde "beyaz" tam 255 olmayabilir (JPEG artığı, tarama gürültüsü).
# Bu eşiğin üstündeki her piksel zemin sayılır.
WHITE_THRESHOLD = 245


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def make_transparent(img: Image.Image) -> Image.Image:
    """Beyaz zemini saydamlaştırır.

    Yazının kenarlarındaki gri geçiş piksellerini korumak için ikili maske
    yerine parlaklığı alfaya çeviriyoruz: koyu piksel = opak, açık = saydam.
    Böylece kenarlar tırtıklı çıkmaz.
    """
    grayscale = img.convert("L")
    # 0 (siyah) -> 255 alfa, 255 (beyaz) -> 0 alfa
    alpha = grayscale.point(lambda v: 0 if v >= WHITE_THRESHOLD else 255 - v)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.putalpha(alpha)
    return out


def make_white(img_transparent: Image.Image) -> Image.Image:
    """Saydam siyah logodan beyaz sürüm üretir (alfayı koruyarak)."""
    alpha = img_transparent.getchannel("A")
    out = Image.new("RGBA", img_transparent.size, (255, 255, 255, 0))
    out.putalpha(alpha)
    return out


def trim(img: Image.Image, padding: int = 0) -> Image.Image:
    """Saydam kenar boşluklarını kırpar, istenirse eşit boşluk bırakır."""
    bbox = img.getbbox()
    if bbox is None:
        return img
    cropped = img.crop(bbox)
    if padding <= 0:
        return cropped
    padded = Image.new(
        "RGBA", (cropped.width + padding * 2, cropped.height + padding * 2), (0, 0, 0, 0)
    )
    padded.paste(cropped, (padding, padding), cropped)
    return padded


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print(f"  {path.relative_to(ROOT)}  {img.width}x{img.height}")


def build_svg(logo: Image.Image, path: Path) -> None:
    """Logoyu SVG'ye gömer.

    Gerçek vektörel iz (outline trace) için orijinal Illustrator dosyası
    gerekir. Elimizde sadece raster olduğu için SVG, PNG'yi taşıyan bir
    kapsayıcı olarak üretiliyor: boyuttan bağımsız ölçeklenir ve tek dosyada
    durur, ama sonsuz çözünürlük vermez. Orijinal vektör gelirse bu dosya
    doğrudan onunla değiştirilmeli.
    """
    buf = io.BytesIO()
    logo.save(buf, "PNG", optimize=True)
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {logo.width} {logo.height}" '
        f'width="{logo.width}" height="{logo.height}" role="img" '
        f'aria-label="Zengin Socks">'
        f'<image href="data:image/png;base64,{encoded}" '
        f'width="{logo.width}" height="{logo.height}"/>'
        f"</svg>"
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(svg, encoding="utf-8")
    print(f"  {path.relative_to(ROOT)}  {len(svg) // 1024} KB")


def build_og_image(logo: Image.Image, path: Path) -> None:
    """1200x630 paylaşım görseli: beyaz zemin, ortada logo."""
    canvas = Image.new("RGBA", (1200, 630), (255, 255, 255, 255))
    target_width = 620
    scale = target_width / logo.width
    resized = logo.resize(
        (target_width, max(1, round(logo.height * scale))), Image.LANCZOS
    )
    canvas.paste(
        resized,
        ((1200 - resized.width) // 2, (630 - resized.height) // 2),
        resized,
    )
    save_png(canvas.convert("RGB").convert("RGBA"), path)


def main() -> None:
    print("Marka görselleri üretiliyor...\n")

    # --- logo ---------------------------------------------------------
    logo_src = load_rgba(SRC / "logo.png")
    logo_t = trim(make_transparent(logo_src))
    save_png(logo_t, OUT / "logo.png")
    save_png(make_white(logo_t), OUT / "logo-white.png")
    build_svg(logo_t, OUT / "logo.svg")

    # Menüde kullanılacak yükseklikler için hazır boyutlar
    for height in (40, 80):
        scale = height / logo_t.height
        save_png(
            logo_t.resize(
                (max(1, round(logo_t.width * scale)), height), Image.LANCZOS
            ),
            OUT / f"logo-{height}h.png",
        )

    # --- favicon ------------------------------------------------------
    fav_src = load_rgba(SRC / "favicon.png")
    fav_t = trim(make_transparent(fav_src), padding=0)

    # "Z" harfi dar; kare tuvalin ortasına oturtuyoruz ki ikon kırpılmasın
    side = max(fav_t.width, fav_t.height)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(fav_t, ((side - fav_t.width) // 2, (side - fav_t.height) // 2), fav_t)

    ico_sizes = [16, 32, 48, 64, 180, 192, 512]
    for size in ico_sizes:
        save_png(canvas.resize((size, size), Image.LANCZOS), OUT / f"favicon-{size}.png")

    # apple-touch-icon saydam olamaz, beyaz zemin şart
    apple = Image.new("RGBA", (180, 180), (255, 255, 255, 255))
    icon = canvas.resize((150, 150), Image.LANCZOS)
    apple.paste(icon, (15, 15), icon)
    save_png(apple, PUBLIC / "apple-touch-icon.png")

    ico_path = PUBLIC / "favicon.ico"
    canvas.resize((256, 256), Image.LANCZOS).save(
        ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)]
    )
    print(f"  {ico_path.relative_to(ROOT)}  16/32/48")

    # --- paylaşım görseli --------------------------------------------
    build_og_image(logo_t, OUT / "og-image.png")

    print("\nTamamlandı.")


if __name__ == "__main__":
    main()
