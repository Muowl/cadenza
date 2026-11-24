// ============================================================
// Validates the PERCEPTUAL SEPARATION of colours under colour blindness.
// Fails (exit 1) if a pair falls below its floor — wired into `npm run check`.
//
// Runs for the BASE and for every variant (overlays in palette/).
//
// The palette's lightness ladder was designed for red-green deficient
// vision, but nothing was watching it: the contrast check measures WCAG
// ratios (legibility against the background), not the distance BETWEEN
// syntax colours — which is what separates keyword from type for someone
// with protanopia. This check closes that gap.
//
// Method (the same as the studies that calibrated the palette — the ΔE
// values quoted in the CHANGELOG and in the YAML comments reproduce here):
//   1. simulate protanopia and deuteranopia with the Machado et al. 2009
//      matrices, severity 1.0, in linear RGB;
//   2. measure ΔE as Euclidean distance in OKLAB × 100.
// Scale reference: ΔE 2 is nearly indistinguishable; 6 is the minimum the
// palette accepts; 10+ is comfortable.
//
// `npx tsx scripts/check_cvd.ts --matrix` prints every syntax pair in all
// three visions, for inspection while tuning the palette.
// ============================================================

import { join } from "node:path";
import { PaletteFile, loadAllPalettes, BRACKETS } from "../src/lib/palette";

type V3 = [number, number, number];
type Vision = "normal" | "protanopia" | "deuteranopia";

// Global floor: no pair of syntax colours may fall below this in any
// vision. Inherited from Papilio, where type × attribute got down to ΔE 0.6
// under protanopia before this gate existed.
const SYNTAX_FLOOR = 6.0;

// State/diff markup roles. The YAML already declares the exception: "They
// collide with some syntax tokens under colour blindness, and that is
// accepted: they always come with a tinted background, underline or gutter
// marker as reinforcement". A pair falls to this lowered floor when one side
// is used only by these roles — the residual floor exists to prevent
// IDENTICAL colours, which no second channel can rescue.
const STATE_ROLES = new Set(["inserted", "deleted", "changed"]);
const STATE_FLOOR = 2.5;

// Pairs the design names explicitly, with the floor of the documented
// decision. If a future palette tweak drops one of these, the build stops.
// They apply to the base AND the variants: a variant that breaks one of
// these floors isn't a variant, it's a different palette.
const NAMED_PAIRS: { a: string; b: string; vision: Vision; floor: number; reason: string }[] = [
  { a: "scarlet", b: "muted", vision: "protanopia", floor: 6.5,
    reason: "under protanopia scarlet darkens to L ~.56; comments were raised to L .62 to get clear of it (was 5.7)" },
  { a: "orchid", b: "fg1", vision: "deuteranopia", floor: 6.0,
    reason: "number × punctuation: the h352 pink became fg1's grey (ΔE 2.0); orchid h326 keeps a negative b*" },
  { a: "scarlet", b: "fg1", vision: "deuteranopia", floor: 10.0,
    reason: "tags touch punctuation in every <div>" },
  { a: "lilac", b: "jade", vision: "deuteranopia", floor: 6.0,
    reason: "<Component attribute=…>: type and attribute side by side (the attribute's italics are the second channel)" },
  { a: "jade", b: "gold", vision: "protanopia", floor: 8.0,
    reason: "function × string, the two lightest syntax tokens" },
  { a: "scarlet", b: "orchid", vision: "protanopia", floor: 10.0,
    reason: "keyword × constant (return true, const X = 1)" },
];

// ------------------------------------------------------------
// Simulation and metric
// ------------------------------------------------------------

// Machado, Oliveira & Fernandes 2009, severity 1.0, applied in linear RGB.
const MACHADO: Record<Exclude<Vision, "normal">, number[][]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
};

function hexToLinear(hex: string): V3 {
  return [1, 3, 5].map((i) => {
    const ch = parseInt(hex.slice(i, i + 2), 16) / 255;
    return ch <= 0.04045 ? ch / 12.92 : Math.pow((ch + 0.055) / 1.055, 2.4);
  }) as V3;
}

function simulate(rgb: V3, vision: Vision): V3 {
  if (vision === "normal") return rgb;
  const m = MACHADO[vision];
  return m.map((l) =>
    Math.min(1, Math.max(0, l[0] * rgb[0] + l[1] * rgb[1] + l[2] * rgb[2]))
  ) as V3;
}

function oklab(rgb: V3): V3 {
  const [r, g, b] = rgb;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** ΔE between two hex values under one vision: OKLAB distance × 100. */
function deltaE(hexA: string, hexB: string, vision: Vision): number {
  const a = oklab(simulate(hexToLinear(hexA), vision));
  const b = oklab(simulate(hexToLinear(hexB), vision));
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 100;
}

// ------------------------------------------------------------
// Run
// ------------------------------------------------------------
const VISIONS: Vision[] = ["normal", "protanopia", "deuteranopia"];
let failures = 0;

function table(title: string, head: string[], rows: string[][]): void {
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((l) => l[i].length)));
  const fmt = (l: string[]) => l.map((cell, i) => cell.padEnd(widths[i])).join("  ");
  console.log(`\n${title}\n`);
  console.log(fmt(head));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const l of rows) console.log(fmt(l));
}

function runPalette(p: PaletteFile): void {
  const c = p.palette;
  const name = p.meta.name;

  // Distinct tokens used in roles.syntax, with the roles that use them.
  // Deduped by token: quote=muted and keyword=tag=scarlet are deliberate
  // shares — what is measured is the distance between DIFFERENT colours.
  const usesByToken = new Map<string, string[]>();
  for (const [role, token] of Object.entries(p.roles.syntax)) {
    usesByToken.set(token, [...(usesByToken.get(token) ?? []), role]);
  }
  const tokens = [...usesByToken.keys()].sort();
  const stateOnly = (token: string) =>
    usesByToken.get(token)!.every((role) => STATE_ROLES.has(role));

  // 1. Global floor over every syntax pair, in all three visions.
  // The table prints only what sits below the attention level (12) — the
  // rest is headroom; the full matrix comes out with --matrix.
  const ATTENTION = 12;
  const syntaxRows: string[][] = [];
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      const [a, b] = [tokens[i], tokens[j]];
      const state = stateOnly(a) || stateOnly(b);
      const floor = state ? STATE_FLOOR : SYNTAX_FLOOR;
      for (const vision of VISIONS) {
        const dE = deltaE(c[a], c[b], vision);
        const ok = dE >= floor;
        if (!ok) failures++;
        if (dE < ATTENTION || !ok) {
          syntaxRows.push([
            `${a}×${b}`,
            vision,
            dE.toFixed(1),
            floor.toFixed(1) + (state ? " (state)" : ""),
            ok ? "✔" : "✘ BELOW",
          ]);
        }
      }
    }
  }
  syntaxRows.sort((x, y) => parseFloat(x[2]) - parseFloat(y[2]));
  table(
    `[${name}] syntax pairs below the attention level (ΔE < ${ATTENTION}; floor ${SYNTAX_FLOOR}):`,
    ["pair", "vision", "ΔE", "floor", "status"],
    syntaxRows
  );

  // 2. Named pairs: design decisions become assertions.
  table(
    `[${name}] named design pairs:`,
    ["pair", "vision", "ΔE", "floor", "status"],
    NAMED_PAIRS.map(({ a, b, vision, floor }) => {
      const dE = deltaE(c[a], c[b], vision);
      const ok = dE >= floor;
      if (!ok) failures++;
      return [`${a}×${b}`, vision, dE.toFixed(1), floor.toFixed(1), ok ? "✔" : "✘ BELOW"];
    })
  );

  // 3. Brackets: the set with no second channel. Measures the DISTINCT level
  // colours against each other (Cadenza cycles three) and each one against
  // the error bracket.
  const BRACKET_FLOOR = 6.0;
  const bracketSet = [...new Set<string>(BRACKETS), "error"];
  const bracketRows: string[][] = [];
  for (let i = 0; i < bracketSet.length; i++) {
    for (let j = i + 1; j < bracketSet.length; j++) {
      const [a, b] = [bracketSet[i], bracketSet[j]];
      for (const vision of VISIONS) {
        const dE = deltaE(c[a], c[b], vision);
        const ok = dE >= BRACKET_FLOOR;
        if (!ok) failures++;
        if (dE < ATTENTION || !ok) {
          bracketRows.push([`${a}×${b}`, vision, dE.toFixed(1), BRACKET_FLOOR.toFixed(1), ok ? "✔" : "✘ BELOW"]);
        }
      }
    }
  }
  bracketRows.sort((x, y) => parseFloat(x[2]) - parseFloat(y[2]));
  table(
    `[${name}] brackets (levels 1-6 + unclosed bracket) below the attention level:`,
    ["pair", "vision", "ΔE", "floor", "status"],
    bracketRows
  );

  // Inspection mode: the full matrix, for when the palette is being tuned.
  if (process.argv.includes("--matrix")) {
    const rows: string[][] = [];
    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        const [a, b] = [tokens[i], tokens[j]];
        rows.push([
          `${a}×${b}`,
          `(${usesByToken.get(a)!.join(",")} × ${usesByToken.get(b)!.join(",")})`,
          ...VISIONS.map((v) => deltaE(c[a], c[b], v).toFixed(1)),
        ]);
      }
    }
    rows.sort((x, y) => parseFloat(x[2]) - parseFloat(y[2]));
    table(`[${name}] full matrix (sorted by normal ΔE):`, ["pair", "roles", "normal", "protan", "deutan"], rows);
  }
}

const palettes = loadAllPalettes(join(import.meta.dirname, "..", "palette"));
for (const { p } of palettes) runPalette(p);

if (failures > 0) {
  console.error(`\n✘ ${failures} pair(s) below the separation floor. Adjust palette/*.yaml.`);
  process.exit(1);
}
console.log(`\n✔ Perceptual separation within floors (${palettes.length} palette(s), 3 visions).`);
