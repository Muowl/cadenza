// ============================================================
// Validates the theme's WCAG contrast ratios. Fails (exit 1) if
// anything falls below target — wired into `npm run build`.
//
// Runs for the BASE and for every variant (overlays in palette/):
// a new variant is covered without touching this file.
//
// Covers four fronts per palette:
//   1. roles.syntax against the editor background (bg0)
//   2. roles.terminal against the terminal background (roles.ui.terminal-bg)
//   3. UI pairs the generator puts together by hand (text on a fill)
//   3b. text on composited semi-transparent tints
//   3c. every syntax colour on the text selection
// ...and, for the base only, the hand-copied hex values (README, package.json).
//
// Default target 4.5:1. Deliberate exceptions live in SPECIAL_TARGETS.
// ============================================================

import { join } from "node:path";
import { readFileSync } from "node:fs";
import {
  PaletteFile, loadAllPalettes, ansiBright, TINTS, compositeTint,
} from "../src/lib/palette";
import { generateVscodeTheme } from "../src/generators/vscode";

const DEFAULT_TARGET = 4.5;
const SPECIAL_TARGETS: Record<string, number> = {
  comment: 3.0, // lowered on purpose — see CLAUDE.md
  quote: 3.0,   // markdown quotes are secondary, same logic as comments
  black: 1.0,   // ANSI black is a background fill, not text
  // bright-black needs its OWN target. It isn't a fill: it's the grey CLIs
  // use for dimmed text. The target used to be computed once per slot and
  // reused on the bright row, so bright-black inherited black's exemption and
  // passed at 2.76:1 while reporting ✔.
  "bright-black": 3.0,
};

/** WCAG relative luminance (linearized sRGB). */
function luminance(hex: string): number {
  const ch = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** WCAG contrast ratio between two colours. */
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

let failures = 0;

/** Prints an aligned table and counts failures. */
function table(title: string, rows: string[][]): void {
  const head = ["item", "colour", "background", "contrast", "target", "status"];
  const widths = head.map((h, i) =>
    Math.max(h.length, ...rows.map((l) => l[i].length))
  );
  const fmt = (l: string[]) =>
    l.map((cell, i) => cell.padEnd(widths[i])).join("  ");
  console.log(`\n${title}\n`);
  console.log(fmt(head));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const l of rows) console.log(fmt(l));
}

/** Builds the row for a colour/background pair and flags a failure if below target. */
function row(name: string, hex: string, bg: string, target: number): string[] {
  const ratio = contrast(hex, bg);
  const ok = ratio >= target;
  if (!ok) failures++;
  return [
    name, hex, bg,
    `${ratio.toFixed(2)}:1`,
    `${target.toFixed(1)}:1`,
    ok ? "✔" : "✘ BELOW",
  ];
}

function runPalette(p: PaletteFile): void {
  const c = p.palette;
  const termBg = c[p.roles.ui["terminal-bg"]];
  const name = p.meta.name;
  // Measuring the real consumers stops the gate from approving a role that
  // autocomplete no longer uses — which happened with list-highlight vs accent.
  const { colors } = generateVscodeTheme(p) as { colors: Record<string, string> };

  // 1. Syntax against the editor background
  table(
    `[${name}] roles.syntax against bg0 (${c.bg0}):`,
    Object.entries(p.roles.syntax).map(([role, token]) =>
      row(`${role} (${token})`, c[token], c.bg0, SPECIAL_TARGETS[role] ?? DEFAULT_TARGET)
    )
  );

  // 2. Terminal against its own background — includes the derived brights
  const termRows: string[][] = [];
  for (const [slot, token] of Object.entries(p.roles.terminal)) {
    termRows.push(
      row(`${slot} (${token})`, c[token], termBg, SPECIAL_TARGETS[slot] ?? DEFAULT_TARGET)
    );
    // target resolved again for the bright: the two have different requirements
    termRows.push(
      row(
        `bright-${slot}`,
        ansiBright(p, slot),
        termBg,
        SPECIAL_TARGETS[`bright-${slot}`] ?? DEFAULT_TARGET
      )
    );
  }
  table(`[${name}] roles.terminal against ${p.roles.ui["terminal-bg"]} (${termBg}):`, termRows);

  // No pair of ANSI slots may repeat a colour — exactly the blue == cyan bug
  // that prompted this block.
  const ansi = new Map<string, string>();
  for (const [slot, token] of Object.entries(p.roles.terminal)) {
    ansi.set(slot, c[token]);
    ansi.set(`bright-${slot}`, ansiBright(p, slot));
  }
  const seen = new Map<string, string>();
  for (const [slot, hex] of ansi) {
    const previous = seen.get(hex);
    if (previous) {
      console.error(`✘ [${name}] duplicate ANSI: ${previous} and ${slot} are both ${hex}`);
      failures++;
    }
    seen.set(hex, slot);
  }

  // 3. UI pairs put together in the generator (text on a coloured fill).
  // Read from the GENERATED theme wherever possible: the gate measures what
  // VS Code paints, not the intent. Reading text stays at 4.5:1; supporting
  // text (inactive tab, line number, placeholder) at 3:1.
  const pair = (label: string, fore: string, back: string, target = DEFAULT_TARGET) =>
    row(label, colors[fore], colors[back], target);
  table(`[${name}] UI pairs:`, [
    pair("primary button", "button.foreground", "button.background"),
    row("primary button (hover)", colors["button.foreground"], colors["button.hoverBackground"], DEFAULT_TARGET),
    pair("secondary button", "button.secondaryForeground", "button.secondaryBackground"),
    pair("badge", "badge.foreground", "badge.background"),
    pair("activity bar badge", "activityBarBadge.foreground", "activityBarBadge.background"),
    pair("status bar remote", "statusBarItem.remoteForeground", "statusBarItem.remoteBackground"),
    pair("status bar debug", "statusBar.debuggingForeground", "statusBar.debuggingBackground"),
    pair("status bar error", "statusBarItem.errorForeground", "statusBarItem.errorBackground"),
    pair("status bar warning", "statusBarItem.warningForeground", "statusBarItem.warningBackground"),
    pair("status bar text", "statusBar.foreground", "statusBar.background"),
    pair("sidebar text", "sideBar.foreground", "sideBar.background"),
    pair("active tab", "tab.activeForeground", "tab.activeBackground"),
    pair("inactive tab", "tab.inactiveForeground", "tab.inactiveBackground", 3.0),
    pair("line number", "editorLineNumber.foreground", "editor.background", 3.0),
    row("code lens", colors["editorCodeLens.foreground"], colors["editor.background"], 3.0),
    row("inlay hint", colors["editorInlayHint.foreground"], colors["editor.background"], DEFAULT_TARGET),
    row("inlay hint type", colors["editorInlayHint.typeForeground"], colors["editor.background"], DEFAULT_TARGET),
    pair("inactive title bar", "titleBar.inactiveForeground", "titleBar.inactiveBackground", 3.0),
    pair("input placeholder", "input.placeholderForeground", "input.background", 3.0),
    pair("input text", "input.foreground", "input.background"),
    pair("text on selection", "editor.foreground", "editor.selectionBackground"),
    pair("menu", "menu.foreground", "menu.background"),
    pair("widget", "editorWidget.foreground", "editorWidget.background"),
    row("peek view description", c.muted, colors["peekViewTitle.background"], 3.0),
    row("description in focused list", c.muted, colors["list.activeSelectionBackground"], 3.0),
    // Matched characters in quick open/suggest: they must pass on EVERY list
    // background (widget bg1, active row bg2).
    row("list match highlight (bg1)", c[p.roles.ui["list-highlight"]], c.bg1, DEFAULT_TARGET),
    row("list match highlight (bg2)", c[p.roles.ui["list-highlight"]], c.bg2, DEFAULT_TARGET),
    row("link", colors["textLink.foreground"], colors["editor.background"], DEFAULT_TARGET),
  ]);

  table(`[${name}] autocomplete highlight (generated colours):`,
    ["highlightForeground", "focusHighlightForeground"].flatMap((hl) =>
      ["background", "selectedBackground"].map((bg) =>
        row(`${hl} / ${bg}`,
          colors[`editorSuggestWidget.${hl}`],
          colors[`editorSuggestWidget.${bg}`], DEFAULT_TARGET)
      )
    )
  );

  // Same project floor as the transient tints: keep syntax readable during
  // selection, without letting comments or attributes disappear.
  // 3:1 is a design decision; it is not WCAG AA for normal text.
  table(`[${name}] roles.syntax on the selection:`,
    Object.entries(p.roles.syntax).map(([role, token]) =>
      row(`${role} (${token})`, c[token], colors["editor.selectionBackground"], 3.0)
    )
  );

  // 3b. Text on semi-transparent tints.
  // The gate used to measure everything against bg0, but a find highlight or
  // a merge block draws a tint BEHIND the code: what the eye reads is the
  // composite colour. Find match sat at alpha 0.35 and dropped comments to
  // 2.34:1 while this whole table reported ✔, simply by not existing.
  //
  // Floor 3.0, not 4.5: the tint is transient and always comes with another
  // signal (border, gutter, cursor). What is not acceptable is the highlight
  // ERASING the text it's supposed to highlight.
  const TINT_FLOOR = 3.0;
  table(
    `[${name}] text on composited tints:`,
    Object.keys(TINTS).flatMap((tintName) => {
      const composite = compositeTint(p, tintName);
      // muted (comment) and the attribute role are the checkpoints: the
      // comment is the darkest text that ever sits on top of code.
      return [
        row(`${tintName} / comment`, c.muted, composite, TINT_FLOOR),
        row(`${tintName} / attribute`, c[p.roles.syntax.attribute], composite, TINT_FLOOR),
      ];
    })
  );
}

const root = join(import.meta.dirname, "..");
const palettes = loadAllPalettes(join(root, "palette"));
for (const { p } of palettes) runPalette(p);

// 4. Hand-copied hex values outside the YAML — only the BASE appears in the
// README and package.json. The generator is clean, but these two repeat
// colours by hand and nothing kept them from going stale — which is exactly
// what happened when the palette changed. These checks are cheap and close
// that door.
const base = palettes.find((x) => x.isBase)!.p;
const cBase = base.palette;

const readme = readFileSync(join(root, "README.md"), "utf8");
const block = readme.match(/<!-- palette:start[\s\S]*?<!-- palette:end -->/);
if (!block) {
  console.error("\n✘ README.md: palette:start/palette:end block not found");
  failures++;
} else {
  const readmeRows = [...block[0].matchAll(/^\|\s*`(\w[\w-]*)`\s*\|\s*`(#[0-9a-fA-F]{6})`/gm)];
  const mismatched = readmeRows
    .filter(([, token, hex]) => cBase[token] && cBase[token].toLowerCase() !== hex.toLowerCase())
    .map(([, token, hex]) => `${token}: README says ${hex}, palette says ${cBase[token]}`);
  const missing = readmeRows
    .filter(([, token]) => !cBase[token])
    .map(([, token]) => `${token}: listed in the README but not in the palette`);
  for (const msg of [...mismatched, ...missing]) {
    console.error(`✘ README.md — ${msg}`);
    failures++;
  }
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const banner = pkg.galleryBanner?.color?.toLowerCase();
if (banner && banner !== cBase.bg0.toLowerCase()) {
  console.error(`✘ package.json — galleryBanner.color ${banner} ≠ bg0 ${cBase.bg0}`);
  failures++;
}

// Every palette must be registered as a theme in package.json — a new
// variant with no contributes.themes entry simply doesn't show up in VS
// Code's theme picker.
const themePaths = new Set(
  (pkg.contributes?.themes ?? []).map((t: { path: string }) => t.path)
);
for (const { p } of palettes) {
  const expected = `./themes/${p.meta.slug}-color-theme.json`;
  if (!themePaths.has(expected)) {
    console.error(`✘ package.json — contributes.themes doesn't list ${expected} (${p.meta.name})`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\n✘ ${failures} problem(s). Adjust palette/*.yaml.`);
  process.exit(1);
}
console.log(`\n✔ Contrast and ANSI uniqueness within targets (${palettes.length} palette(s)).`);
