import type { PaletteFile } from "../lib/palette";
import { resolve } from "../lib/palette";

/**
 * Theme icon: a fermata (𝄐) — the arc over a dot.
 *
 * In a classical concerto, the fermata marks the point where the orchestra
 * stops and the soloist takes the cadenza. The theme's name and icon tell the
 * same story.
 *
 * Original, geometric drawing, with nothing taken from the character: arc in
 * fg0 and dot in the accent (the jacket's red), on the editor's near-black.
 * Thick shapes without fine detail so it stays legible at 16 px (Hyprland
 * bar, marketplace tab).
 */
export function generateLogoSvg(p: PaletteFile): string {
  const bg = p.palette.bg0;
  const border = p.palette.bg3;
  const arc = p.palette.fg0;
  const dot = resolve(p, "ui", "accent");

  // Crescent arc, like the printed fermata: thick at the top (54 px),
  // tapering towards the tips, which end rounded so they don't turn into
  // needles when resized. Wider than tall — too tall, it read as a horseshoe.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <title>Cadenza — fermata</title>
  <rect x="4" y="4" width="504" height="504" rx="112" fill="${bg}" stroke="${border}" stroke-width="8"/>
  <path d="M 84 330
           C 92 214 166 146 256 146
           C 346 146 420 214 428 330
           C 429 340 420 344 414 336
           C 384 246 326 200 256 200
           C 186 200 128 246 98 336
           C 92 344 83 340 84 330 Z"
        fill="${arc}"/>
  <circle cx="256" cy="304" r="38" fill="${dot}"/>
</svg>
`;
}
