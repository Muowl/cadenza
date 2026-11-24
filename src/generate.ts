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

/** Alvos fora do VS Code: pasta em extras/ e extensão do arquivo. */
const EXTRAS: { pasta: string; ext: string; gera: (p: Parameters<typeof generateKittyTheme>[0]) => string }[] = [
  { pasta: "base24", ext: "yaml", gera: generateBase24Scheme },
  { pasta: "kitty", ext: "conf", gera: generateKittyTheme },
  { pasta: "hyprland", ext: "conf", gera: generateHyprland },
  { pasta: "waybar", ext: "css", gera: generateWaybar },
  { pasta: "json", ext: "json", gera: generateJson },
];

mkdirSync(THEMES_DIR, { recursive: true });
mkdirSync(ASSETS_DIR, { recursive: true });
for (const { pasta } of EXTRAS) mkdirSync(join(EXTRAS_DIR, pasta), { recursive: true });

// Base + variantes: cada paleta gera todos os alvos. Uma variante nova é um
// overlay em palette/ e uma entrada em package.json → contributes.themes.
for (const { p, ehBase } of loadAllPalettes(join(ROOT, "palette"))) {
  const vscodeOut = join(THEMES_DIR, `${p.meta.slug}-color-theme.json`);
  writeFileSync(vscodeOut, JSON.stringify(generateVscodeTheme(p), null, 2) + "\n");
  console.log(`✔ VS Code: ${vscodeOut}`);

  for (const { pasta, ext, gera } of EXTRAS) {
    const out = join(EXTRAS_DIR, pasta, `${p.meta.slug}.${ext}`);
    writeFileSync(out, gera(p));
    console.log(`✔ ${pasta}: ${out}`);
  }

  // Ícone da extensão — só a base define a identidade visual
  if (ehBase) {
    const logoSvg = generateLogoSvg(p);
    writeFileSync(join(ASSETS_DIR, "logo.svg"), logoSvg);
    const logoPng = new Resvg(logoSvg, { fitTo: { mode: "width", value: 512 } }).render().asPng();
    writeFileSync(join(ASSETS_DIR, "logo.png"), logoPng);
    console.log(`✔ Logo: ${join(ASSETS_DIR, "logo.png")}`);
  }
}
