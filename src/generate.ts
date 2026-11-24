import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { loadAllPalettes } from "./lib/palette";
import { generateVscodeTheme } from "./generators/vscode";
import { generateLogoSvg } from "./generators/logo";
import { generateBase24Scheme } from "./generators/base24";
import { generateKittyTheme } from "./generators/kitty";
import { generateHyprland, generateWaybar, generateJson } from "./generators/desktop";

const ROOT = join(import.meta.dirname, "..");
const THEMES_DIR = join(ROOT, "themes");
const EXTRAS_DIR = join(ROOT, "extras");
const ASSETS_DIR = join(ROOT, "assets");

/** Targets outside VS Code: folder under extras/ and file extension. */
const EXTRAS: { dir: string; ext: string; generate: (p: Parameters<typeof generateKittyTheme>[0]) => string }[] = [
  { dir: "base24", ext: "yaml", generate: generateBase24Scheme },
  { dir: "kitty", ext: "conf", generate: generateKittyTheme },
  { dir: "hyprland", ext: "conf", generate: generateHyprland },
  { dir: "waybar", ext: "css", generate: generateWaybar },
  { dir: "json", ext: "json", generate: generateJson },
];

mkdirSync(THEMES_DIR, { recursive: true });
mkdirSync(ASSETS_DIR, { recursive: true });
for (const { dir } of EXTRAS) mkdirSync(join(EXTRAS_DIR, dir), { recursive: true });

// Base + variants: each palette generates every target. A new variant is an
// overlay in palette/ plus an entry in package.json → contributes.themes.
for (const { p, isBase } of loadAllPalettes(join(ROOT, "palette"))) {
  const vscodeOut = join(THEMES_DIR, `${p.meta.slug}-color-theme.json`);
  writeFileSync(vscodeOut, JSON.stringify(generateVscodeTheme(p), null, 2) + "\n");
  console.log(`✔ VS Code: ${vscodeOut}`);

  for (const { dir, ext, generate } of EXTRAS) {
    const out = join(EXTRAS_DIR, dir, `${p.meta.slug}.${ext}`);
    writeFileSync(out, generate(p));
    console.log(`✔ ${dir}: ${out}`);
  }

  // Extension icon — only the base defines the visual identity
  if (isBase) {
    const logoSvg = generateLogoSvg(p);
    writeFileSync(join(ASSETS_DIR, "logo.svg"), logoSvg);
    const logoPng = new Resvg(logoSvg, { fitTo: { mode: "width", value: 512 } }).render().asPng();
    writeFileSync(join(ASSETS_DIR, "logo.png"), logoPng);
    console.log(`✔ Logo: ${join(ASSETS_DIR, "logo.png")}`);
  }
}
