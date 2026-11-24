// ============================================================
// Generates the README screenshots: a VS Code window drawn in SVG with
// the theme's GENERATED colours (not straight from the palette) and the
// code tokenized by the editor's own engine. Rendered with resvg at 2x.
//
//   npm run preview   →  assets/preview-<slug>.png for each palette
//
// It is a faithful approximation of colours, not of pixels: the window
// geometry is simplified, and TypeScript's semantic highlighting (which VS
// Code applies on top of TextMate) is not included.
// ============================================================

import { join } from "node:path";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { PaletteFile, loadAllPalettes, resolve, ansiBright, BRACKETS } from "../src/lib/palette";
import { generateVscodeTheme } from "../src/generators/vscode";
import { vsctm, createRegistry, tokenizeFile, SCOPE_BY_EXTENSION } from "./lib/textmate";

const root = join(import.meta.dirname, "..");
const FONTS = join(root, "node_modules", "geist", "dist", "fonts");
const W = 1280;
const H = 900;
const MONO = "Geist Mono";
const SANS = "Geist";

type Theme = { colors: Record<string, string>; tokenColors: vsctm.IRawThemeSetting[] };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Tokenized code → lines of <tspan> with colour, italics and per-level brackets. */
async function code(p: PaletteFile, theme: Theme, file: string): Promise<string[]> {
  const registry = await createRegistry();
  registry.setTheme({
    name: p.meta.slug,
    settings: [
      { settings: { foreground: theme.colors["editor.foreground"], background: theme.colors["editor.background"] } },
      ...theme.tokenColors,
    ],
  });
  const grammar = await registry.loadGrammar(SCOPE_BY_EXTENSION[file.split(".").pop()!]);
  if (!grammar) throw new Error(`grammar failed to load for ${file}`);
  const lines = readFileSync(join(root, "tests", "fixtures", file), "utf8").split(/\r?\n/);
  const painted = tokenizeFile(registry, grammar, lines);

  // Bracket pair colorization, the way VS Code does it on top of tokens:
  // outside strings and comments, each ( [ { gets its level's colour.
  const bracketColor = (level: number) =>
    theme.colors[`editorBracketHighlight.foreground${(level % BRACKETS.length) + 1}`];
  let level = 0;

  return painted.map((tokens, i) => {
    const line = lines[i];
    return tokens
      .map((t) => {
        const text = line.slice(t.start, t.end);
        const isCode = !t.scopes.some((s) => /^(string|comment)|template-expression/.test(s));
        const style = t.italic ? ' font-style="italic"' : "";
        if (!isCode || !/[()[\]{}]/.test(text)) {
          return `<tspan fill="${t.color}"${style}>${esc(text)}</tspan>`;
        }
        return [...text]
          .map((ch) => {
            if ("([{".includes(ch)) return `<tspan fill="${bracketColor(level++)}">${ch}</tspan>`;
            if (")]}".includes(ch)) return `<tspan fill="${bracketColor(--level)}">${ch}</tspan>`;
            return `<tspan fill="${t.color}"${style}>${esc(ch)}</tspan>`;
          })
          .join("");
      })
      .join("");
  });
}

async function editorWindow(p: PaletteFile): Promise<string> {
  const theme = generateVscodeTheme(p) as Theme;
  const k = theme.colors;
  const ansi = (slot: string) => resolve(p, "terminal", slot);
  const parts: string[] = [];
  const add = (s: string) => parts.push(s);
  const rect = (x: number, y: number, w: number, h: number, fill: string, extra = "") =>
    add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`);
  const hLine = (x1: number, x2: number, y: number, color: string) =>
    add(`<line x1="${x1}" y1="${y + 0.5}" x2="${x2}" y2="${y + 0.5}" stroke="${color}" stroke-width="1"/>`);
  const vLine = (x: number, y1: number, y2: number, color: string) =>
    add(`<line x1="${x + 0.5}" y1="${y1}" x2="${x + 0.5}" y2="${y2}" stroke="${color}" stroke-width="1"/>`);
  const text = (x: number, y: number, s: string, color: string, size = 12, font = SANS, extra = "") =>
    add(`<text x="${x}" y="${y}" fill="${color}" font-family="${font}" font-size="${size}" ${extra}>${s}</text>`);

  const TITLE = 32, ACT = 48, SIDE = 248, TABS = 36, CRUMBS = 24, STATUS = 24, PANEL = 214;
  const xEd = ACT + SIDE;
  const yEd = TITLE + TABS + CRUMBS;
  const yPanel = H - STATUS - PANEL;

  // Background and title bar
  rect(0, 0, W, H, k["editor.background"]);
  rect(0, 0, W, TITLE, k["titleBar.activeBackground"]);
  text(W / 2, 20, "Encore.tsx — cadenza", k["titleBar.activeForeground"], 12, SANS, 'text-anchor="middle"');
  hLine(0, W, TITLE, k["titleBar.border"]);

  // Activity bar: icons as simple shapes, the active one with the white bar
  rect(0, TITLE + 1, ACT, H - TITLE - STATUS - 1, k["activityBar.background"]);
  vLine(ACT - 1, TITLE, H - STATUS, k["activityBar.border"]);
  [0, 1, 2, 3].forEach((i) => {
    const y = TITLE + 14 + i * 48;
    const active = i === 0;
    const color = active ? k["activityBar.foreground"] : k["activityBar.inactiveForeground"];
    add(`<rect x="14" y="${y}" width="20" height="20" rx="5" fill="none" stroke="${color}" stroke-width="1.8"/>`);
    if (active) rect(0, y - 8, 2, 36, k["activityBar.activeBorder"]);
    if (i === 2) {
      add(`<circle cx="34" cy="${y + 19}" r="7.5" fill="${k["activityBarBadge.background"]}"/>`);
      text(34, y + 22.5, "3", k["activityBarBadge.foreground"], 10, SANS, 'text-anchor="middle" font-weight="600"');
    }
  });

  // Sidebar (explorer) with git decorations
  rect(ACT, TITLE + 1, SIDE, H - TITLE - STATUS - 1, k["sideBar.background"]);
  vLine(xEd - 1, TITLE, H - STATUS, k["sideBar.border"]);
  text(ACT + 18, TITLE + 26, "EXPLORER", k["sideBarTitle.foreground"], 11, SANS, 'letter-spacing="0.6"');
  // Drawn chevrons: Geist has no ⌄, and a missing glyph drops the whole
  // line to a fallback font.
  const chevron = (x: number, y: number, open: boolean, color: string) =>
    add(open
      ? `<path d="M ${x} ${y - 6} l 3.5 3.5 l 3.5 -3.5" stroke="${color}" stroke-width="1.3" fill="none"/>`
      : `<path d="M ${x + 1.5} ${y - 8} l 3.5 3.5 l -3.5 3.5" stroke="${color}" stroke-width="1.3" fill="none"/>`);
  chevron(ACT + 10, TITLE + 54, true, k["sideBarSectionHeader.foreground"]);
  text(ACT + 22, TITLE + 54, "CADENZA", k["sideBarSectionHeader.foreground"], 11, SANS, 'font-weight="600"');
  // [indent, name, colour, git mark, folder: "open" | "closed"]
  const tree: [number, string, string, string?, string?][] = [
    [0, "palette", k["sideBar.foreground"], undefined, "open"],
    [1, "cadenza.yaml", k["gitDecoration.modifiedResourceForeground"], "M"],
    [0, "src", k["sideBar.foreground"], undefined, "open"],
    [1, "generators", k["sideBar.foreground"], undefined, "closed"],
    [1, "Encore.tsx", k["list.activeSelectionForeground"]],
    [1, "kitty.ts", k["gitDecoration.untrackedResourceForeground"], "U"],
    [1, "palette.ts", k["sideBar.foreground"]],
    [0, "extras", k["gitDecoration.addedResourceForeground"], "A", "closed"],
    [0, "node_modules", k["gitDecoration.ignoredResourceForeground"], undefined, "closed"],
    [0, "package.json", k["sideBar.foreground"]],
    [0, "README.md", k["gitDecoration.modifiedResourceForeground"], "M"],
  ];
  tree.forEach(([indent, name, color, mark, folder], i) => {
    const y = TITLE + 66 + i * 24;
    const x = ACT + 26 + indent * 14;
    if (name === "Encore.tsx") rect(ACT, y, SIDE - 1, 24, k["list.activeSelectionBackground"]);
    if (folder) chevron(x - 13, y + 16, folder === "open", k["icon.foreground"]);
    text(x, y + 16, esc(name), color, 12.5);
    if (mark) text(xEd - 18, y + 16, mark, color, 11, SANS, 'text-anchor="end"');
  });

  // Tabs: no dividers, the active one underlined with the accent
  rect(xEd, TITLE + 1, W - xEd, TABS - 1, k["editorGroupHeader.tabsBackground"]);
  hLine(xEd, W, TITLE + TABS - 1, k["editorGroupHeader.tabsBorder"]);
  const tabs: [string, boolean, boolean][] = [
    ["Encore.tsx", true, false],
    ["cadenza.yaml", false, true],
    ["kitty.conf", false, false],
  ];
  let xTab = xEd;
  for (const [name, active, modified] of tabs) {
    const w = 30 + name.length * 7.4;
    rect(xTab, TITLE + 1, w, TABS - 2, active ? k["tab.activeBackground"] : k["tab.inactiveBackground"]);
    text(xTab + 16, TITLE + 23, name, active ? k["tab.activeForeground"] : k["tab.inactiveForeground"], 12.5);
    if (active) rect(xTab, TITLE + TABS - 2, w, 2, k["tab.activeBorder"]);
    if (modified) add(`<circle cx="${xTab + w - 8}" cy="${TITLE + 18}" r="3.5" fill="${k["tab.activeModifiedBorder"]}"/>`);
    xTab += w;
  }
  text(xEd + 16, TITLE + TABS + 16, "src  ›  components  ›  Encore.tsx  ›  Encore", k["breadcrumb.foreground"], 11.5);

  // Editor
  const lines = await code(p, theme, "preview.tsx");
  const LH = 19.4, SIZE = 13, CW = SIZE * 0.6;
  const xNum = xEd + 44, xCode = xEd + 64;
  const current = 14; // cursor line (1-based)
  const yLine = (n: number) => yEd + 14 + (n - 1) * LH;
  const visible = Math.floor((yPanel - yEd - 14) / LH);
  rect(xEd, yLine(current) - LH + 5, W - xEd, LH, k["editor.lineHighlightBackground"]);
  const source = readFileSync(join(root, "tests", "fixtures", "preview.tsx"), "utf8").split(/\r?\n/);
  // Selection on "className=\"stage\"" (line 22): measured by column
  const col = source[21].indexOf("className");
  rect(xCode + col * CW, yLine(22) - LH + 5, 'className="stage"'.length * CW, LH, k["editor.selectionBackground"]);
  // Indent guides
  for (const [from, to, ind] of [[13, 27, 1], [17, 18, 2], [22, 26, 2], [23, 25, 3]] as const) {
    if (from > visible) continue;
    const color = ind === 1 ? k["editorIndentGuide.activeBackground1"] : k["editorIndentGuide.background1"];
    vLine(xCode + ind * 2 * CW - 2 * CW + 2, yLine(from) - LH + 6, yLine(Math.min(to, visible)) + 5, color);
  }
  lines.slice(0, visible).forEach((spans, i) => {
    const n = i + 1;
    const numColor = n === current ? k["editorLineNumber.activeForeground"] : k["editorLineNumber.foreground"];
    text(xNum, yLine(n), String(n), numColor, 12, MONO, 'text-anchor="end"');
    add(`<text x="${xCode}" y="${yLine(n)}" font-family="${MONO}" font-size="${SIZE}" xml:space="preserve">${spans}</text>`);
  });
  // Cursor after "const next" on line 14
  rect(xCode + (source[13].indexOf("next") + 4) * CW, yLine(current) - LH + 7, 2, LH - 4, k["editorCursor.foreground"]);
  // Warning squiggle under "Track" on line 3
  const x0 = xCode + source[2].indexOf("Track") * CW, yS = yLine(3) + 4;
  const wave = Array.from({ length: 10 }, (_, i) => `${x0 + i * 4} ${yS + (i % 2 ? 2 : 0)}`).join(" L ");
  add(`<path d="M ${wave}" stroke="${k["editorWarning.foreground"]}" stroke-width="1.2" fill="none"/>`);

  // Panel (terminal)
  rect(xEd, yPanel, W - xEd, PANEL, k["panel.background"]);
  hLine(xEd, W, yPanel, k["panel.border"]);
  const titles = ["PROBLEMS", "OUTPUT", "TERMINAL"];
  let xt = xEd + 18;
  titles.forEach((t) => {
    const active = t === "TERMINAL";
    text(xt, yPanel + 22, t, active ? k["panelTitle.activeForeground"] : k["panelTitle.inactiveForeground"], 11, SANS, 'letter-spacing="0.5"');
    if (active) rect(xt, yPanel + 30, t.length * 7.6, 1.5, k["panelTitle.activeBorder"]);
    xt += t.length * 7.6 + 24;
  });
  const T = (segments: [string, string, string?][]) =>
    segments.map(([s, color, weight]) => `<tspan fill="${color}"${weight ? ` font-weight="${weight}"` : ""}>${esc(s)}</tspan>`).join("");
  const prompt: [string, string, string?][] = [
    ["~/dev/cadenza", ansi("blue"), "600"], [" main", ansi("magenta")], ["*", ansi("yellow")], [" › ", ansi("green")],
  ];
  const term: [string, string, string?][][] = [
    [...prompt, ["git status -s", k["terminal.foreground"]]],
    [["M ", ansi("green")], [" palette/cadenza.yaml", k["terminal.foreground"]]],
    [[" M", ansi("red")], [" README.md", k["terminal.foreground"]]],
    [["??", ansi("red")], [" src/generators/kitty.ts", k["terminal.foreground"]]],
    [...prompt, ["npm run check", k["terminal.foreground"]]],
    [["✔ ", ansi("green")], ["Contrast and ANSI uniqueness within targets", k["terminal.foreground"]], [" (2 palettes)", ansiBright(p, "black")]],
    [["! ", ansi("yellow")], ["selection: comments at 4.09:1", k["terminal.foreground"]], [" · info: ", ansiBright(p, "black")], ["docs/README", ansi("cyan")]],
  ];
  const yT0 = yPanel + 54;
  term.forEach((l, i) =>
    add(`<text x="${xEd + 18}" y="${yT0 + i * 18}" font-family="${MONO}" font-size="12.5" xml:space="preserve">${T(l)}</text>`)
  );
  // Row of the 16 ANSI colours
  const ORDER = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];
  const yA = yT0 + term.length * 18 - 8;
  ORDER.forEach((s, i) => {
    rect(xEd + 18 + i * 30, yA, 26, 10, ansi(s), 'rx="2"');
    rect(xEd + 18 + i * 30, yA + 12, 26, 10, ansiBright(p, s), 'rx="2"');
  });
  rect(xEd + 18, yA + 30, 7.5, 15, k["terminalCursor.foreground"]);

  // Status bar
  const yS0 = H - STATUS;
  rect(0, yS0, W, STATUS, k["statusBar.background"]);
  hLine(0, W, yS0, k["statusBar.border"]);
  rect(0, yS0 + 1, 34, STATUS - 1, k["statusBarItem.remoteBackground"]);
  add(`<path d="M 12 ${yS0 + 8} l -4 4.5 l 4 4.5 M 22 ${yS0 + 8} l 4 4.5 l -4 4.5" stroke="${k["statusBarItem.remoteForeground"]}" stroke-width="1.6" fill="none"/>`);
  text(46, yS0 + 16, "main*     × 0    ! 1", k["statusBar.foreground"], 11.5);
  text(W - 14, yS0 + 16, "Ln 14, Col 15    Spaces: 2    UTF-8    LF    TypeScript JSX", k["statusBar.foreground"], 11.5, SANS, 'text-anchor="end"');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${parts.join("\n")}
</svg>
`;
}

// Gallery: one panel per language, with the most representative excerpt of
// each fixture. TextMate only — with a language server running, types,
// constants and macros get even more precise (see the semantic cases in
// check_tokens.ts).
const GALLERY: { file: string; name: string; from: number; to: number }[] = [
  { file: "sample.rs", name: "Rust", from: 5, to: 27 },
  { file: "sample.ts", name: "TypeScript", from: 10, to: 32 },
  { file: "sample.py", name: "Python", from: 12, to: 34 },
  { file: "Sample.java", name: "Java", from: 6, to: 28 },
  { file: "Sample.cs", name: "C#", from: 6, to: 28 },
  { file: "sample.cpp", name: "C++", from: 4, to: 26 },
];

async function gallery(p: PaletteFile): Promise<string> {
  const theme = generateVscodeTheme(p) as Theme;
  const k = theme.colors;
  const COLS = 2, PW = 640, LH = 18.5, SIZE = 12.5, HEAD = 34;
  const linesPerPanel = Math.max(...GALLERY.map((g) => g.to - g.from + 1));
  const PH = HEAD + 14 + linesPerPanel * LH + 12;
  const gridRows = Math.ceil(GALLERY.length / COLS);
  const width = COLS * PW, height = gridRows * PH;
  const parts: string[] = [`<rect width="${width}" height="${height}" fill="${k["editor.background"]}"/>`];
  for (const [i, g] of GALLERY.entries()) {
    const x0 = (i % COLS) * PW, y0 = Math.floor(i / COLS) * PH;
    parts.push(
      `<rect x="${x0}" y="${y0}" width="${PW}" height="${HEAD}" fill="${k["editorGroupHeader.tabsBackground"]}"/>`,
      `<text x="${x0 + 18}" y="${y0 + 22}" fill="${k["tab.activeForeground"]}" font-family="${SANS}" font-size="12.5">${esc(g.file)}</text>`,
      `<rect x="${x0}" y="${y0 + HEAD - 2}" width="${30 + g.file.length * 7.2}" height="2" fill="${k["tab.activeBorder"]}"/>`,
      `<text x="${x0 + PW - 18}" y="${y0 + 22}" fill="${k["tab.inactiveForeground"]}" font-family="${SANS}" font-size="11.5" text-anchor="end">${esc(g.name)}</text>`,
      `<line x1="${x0}" y1="${y0 + HEAD - 0.5}" x2="${x0 + PW}" y2="${y0 + HEAD - 0.5}" stroke="${k["editorGroupHeader.tabsBorder"]}"/>`
    );
    if (i % COLS) parts.push(`<line x1="${x0 + 0.5}" y1="${y0}" x2="${x0 + 0.5}" y2="${y0 + PH}" stroke="${k["editorGroup.border"]}"/>`);
    if (i >= COLS) parts.push(`<line x1="${x0}" y1="${y0 + 0.5}" x2="${x0 + PW}" y2="${y0 + 0.5}" stroke="${k["editorGroup.border"]}"/>`);
    // Clip per panel: a long line doesn't spill into the neighbour
    parts.push(`<clipPath id="panel${i}"><rect x="${x0}" y="${y0 + HEAD}" width="${PW - 12}" height="${PH - HEAD}"/></clipPath>`);
    parts.push(`<g clip-path="url(#panel${i})">`);
    const spans = await code(p, theme, g.file);
    for (let n = g.from; n <= g.to; n++) {
      const y = y0 + HEAD + 14 + (n - g.from + 1) * LH - 5;
      parts.push(
        `<text x="${x0 + 40}" y="${y}" fill="${k["editorLineNumber.foreground"]}" font-family="${MONO}" font-size="11.5" text-anchor="end">${n}</text>`,
        `<text x="${x0 + 54}" y="${y}" font-family="${MONO}" font-size="${SIZE}" xml:space="preserve">${spans[n - 1] ?? ""}</text>`
      );
    }
    parts.push(`</g>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
${parts.join("\n")}
</svg>
`;
}

async function main(): Promise<void> {
  const fontFiles = [
    ...["Regular", "Italic", "Medium", "SemiBold"].map((v) => join(FONTS, "geist-mono", `GeistMono-${v}.ttf`)),
    ...["Regular", "Medium", "SemiBold", "Bold"].map((v) => join(FONTS, "geist-sans", `Geist-${v}.ttf`)),
  ];
  mkdirSync(join(root, "assets"), { recursive: true });
  for (const { p } of loadAllPalettes(join(root, "palette"))) {
    const svg = await editorWindow(p);
    const png = new Resvg(svg, {
      fitTo: { mode: "width", value: W * 2 },
      font: { fontFiles, loadSystemFonts: true, defaultFontFamily: SANS },
    })
      .render()
      .asPng();
    const out = join(root, "assets", `preview-${p.meta.slug}.png`);
    writeFileSync(out, png);
    console.log(`✔ Preview: ${out}`);

    const gallerySvg = await gallery(p);
    const galleryPng = new Resvg(gallerySvg, {
      fitTo: { mode: "width", value: 2560 },
      font: { fontFiles, loadSystemFonts: true, defaultFontFamily: SANS },
    })
      .render()
      .asPng();
    const galleryOut = join(root, "assets", `languages-${p.meta.slug}.png`);
    writeFileSync(galleryOut, galleryPng);
    console.log(`✔ Languages: ${galleryOut}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
