#!/usr/bin/env python3
"""
Extracts the dominant colours of reference images (references/).

Usage:
  python scripts/extract_colors.py references/artwork.jpg
  python scripts/extract_colors.py references/*.png --colors 12 --json

Requires: pip install Pillow
"""
import argparse
import json
import sys
from collections import Counter
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is not installed. Run: pip install Pillow")


def luminance(r: int, g: int, b: int) -> float:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def extract(path: Path, n_colors: int, skip_extremes: bool) -> list[dict]:
    img = Image.open(path).convert("RGB")
    img.thumbnail((300, 300))  # faster without skewing the distribution

    quantized = img.quantize(colors=n_colors * 2, method=Image.Quantize.MEDIANCUT)
    palette = quantized.getpalette()
    # get_flattened_data replaces getdata in newer Pillow versions
    get_pixels = getattr(quantized, "get_flattened_data", quantized.getdata)
    counts = Counter(get_pixels())
    total = sum(counts.values())

    results = []
    for idx, count in counts.most_common():
        r, g, b = palette[idx * 3 : idx * 3 + 3]
        lum = luminance(r, g, b)
        # Skip near-black and near-white: they rarely make a useful token
        if skip_extremes and (lum < 18 or lum > 240):
            continue
        results.append({
            "hex": f"#{r:02x}{g:02x}{b:02x}",
            "pct": round(count / total * 100, 1),
        })
        if len(results) >= n_colors:
            break
    return results


def main() -> None:
    ap = argparse.ArgumentParser(description="Extract dominant colours from images")
    ap.add_argument("images", nargs="+", type=Path)
    ap.add_argument("--colors", type=int, default=8, help="colours per image (default: 8)")
    ap.add_argument("--json", action="store_true", help="JSON output")
    ap.add_argument("--keep-extremes", action="store_true",
                    help="don't filter out near-black/near-white")
    args = ap.parse_args()

    output = {}
    for img_path in args.images:
        if not img_path.exists():
            print(f"⚠ not found: {img_path}", file=sys.stderr)
            continue
        output[str(img_path)] = extract(img_path, args.colors, not args.keep_extremes)

    if args.json:
        print(json.dumps(output, indent=2))
    else:
        for name, colors in output.items():
            print(f"\n{name}")
            for c in colors:
                print(f"  {c['hex']}  {c['pct']:>5}%")


if __name__ == "__main__":
    main()
