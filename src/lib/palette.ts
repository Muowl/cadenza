import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";

export interface PaletteFile {
  meta: {
    name: string;
    slug: string;
    variant: "dark" | "light";
    author: string;
    description: string;
  };
  anchors: Record<string, string>;
  palette: Record<string, string>;
  roles: {
    syntax: Record<string, string>;
    ui: Record<string, string>;
    terminal: Record<string, string>;
    /**
     * Exceptions to the "bright = lightened base" rule. Only exists because one
     * slot had to break it; see the comment in the YAML.
     */
    "terminal-bright"?: Record<string, string>;
  };
}

export type RoleGroup = "syntax" | "ui" | "terminal";

const GROUPS: readonly RoleGroup[] = ["syntax", "ui", "terminal"];

/**
 * How much an ANSI "bright" slot rises in lightness over its base, in OKLCH L,
 * with hue and chroma preserved. Every "bright" accent climbs the SAME
 * perceptual step instead of each one lightening its own way (mixing with
 * white washes out chroma and makes yellow rise far more than blue).
 * Lives here so the generator and the contrast validator never diverge.
 */
export const ANSI_BRIGHT_L = 0.1;

/**
 * Bracket pair colorization colours, levels 1 to 6 (VS Code registers up to
 * foreground6; without the 6th, deeply nested brackets turn transparent).
 *
 * Brackets have no second channel of distinction — colour only, no italics,
 * no context — so this set is the theme's most colour-blindness-sensitive.
 * Lives here so the generator paints and the CVD check measures EXACTLY the
 * same set (rule 4: shared constants are never duplicated).
 */
//
// Cadenza cycles THREE colours, not six: restraint is the point. Level 1 is
// punctuation itself (fg1) — the outermost pair gets no colour — and levels 2
// and 3 use lilac and jade. Gold and orchid are left out on purpose: they are
// strings and numbers, and a gold parenthesis touching a gold string reads as
// one thing.
export const BRACKETS = ["fg1", "lilac", "jade", "fg1", "lilac", "jade"] as const;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Semi-transparent tints VS Code draws BEHIND text: find highlights, merge
 * blocks, stack frame line, peek view match.
 *
 * The eye reads the COMPOSITE colour, not the token — measuring contrast
 * against `bg0` here yields a number nobody sees. Find match used to sit at
 * alpha 0.35, which dropped comments to 2.34:1 on the tint while the gate
 * reported ✔, because the gate only looked at opaque colours.
 *
 * Lives here, not in the generator, because the validator needs exactly the
 * same alphas (rule 4: shared constants are never duplicated).
 */
export interface Tint {
  /** Palette token that colours the tint. */
  token: string;
  /** Opacity of the tint over its background. */
  alpha: number;
  /** Background token it is composited over. */
  over: string;
}

// The alphas stop one step BELOW the ceiling that would still give 3:1.
// Sitting right at the floor leaves no margin: any future palette tweak would
// break the gate.
export const TINTS: Record<string, Tint> = {
  "find match": { token: "gold", alpha: 0.21, over: "bg0" },
  "find match (others)": { token: "gold", alpha: 0.16, over: "bg0" },
  "stack frame": { token: "gold", alpha: 0.18, over: "bg0" },
  "focused stack frame": { token: "success", alpha: 0.2, over: "bg0" },
  "merge: current header": { token: "scarlet", alpha: 0.26, over: "bg0" },
  "merge: current content": { token: "scarlet", alpha: 0.14, over: "bg0" },
  "merge: incoming header": { token: "info", alpha: 0.26, over: "bg0" },
  "merge: incoming content": { token: "info", alpha: 0.14, over: "bg0" },
  "mergeEditor: word": { token: "gold", alpha: 0.21, over: "bg0" },
  "peek: match": { token: "gold", alpha: 0.17, over: "bg1" },
  "diff: inserted line": { token: "success", alpha: 0.08, over: "bg0" },
  "diff: removed line": { token: "error", alpha: 0.08, over: "bg0" },
};

/** Splits a #rrggbb into 0-255 channels. */
function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** The tint as VS Code consumes it: #rrggbbaa. */
export function tint(p: PaletteFile, name: string): string {
  const t = TINTS[name];
  if (!t) throw new Error(`unknown tint: ${name}`);
  return alpha(p.palette[t.token], t.alpha);
}

/**
 * The OPAQUE colour the tint produces over its background — what the eye
 * sees, and what the contrast of the text on top must be measured against.
 */
export function compositeTint(p: PaletteFile, name: string): string {
  const t = TINTS[name];
  if (!t) throw new Error(`unknown tint: ${name}`);
  const fore = channels(p.palette[t.token]);
  const back = channels(p.palette[t.over]);
  const mix = fore.map((f, i) => Math.round(f * t.alpha + back[i] * (1 - t.alpha)));
  return "#" + mix.map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** Loads and validates the source of truth. */
export function loadPalette(path: string): PaletteFile {
  const data = load(readFileSync(path, "utf8")) as PaletteFile;
  validate(data);
  return data;
}

/**
 * Loads a VARIANT: an overlay that declares a full `meta:` and only the
 * `palette:` tokens that change — everything else (tokens not listed and all
 * of `roles:`) comes from the base. This keeps a variant from turning into a
 * diverging copy: semantic decisions stay in one place.
 */
export function loadPaletteVariant(basePath: string, overlayPath: string): PaletteFile {
  const base = loadPalette(basePath);
  const overlay = load(readFileSync(overlayPath, "utf8")) as Partial<PaletteFile>;
  if (!overlay.meta?.name || !overlay.meta?.slug) {
    throw new Error(`${overlayPath}: a variant needs its own meta.name and meta.slug`);
  }
  const data: PaletteFile = {
    meta: overlay.meta,
    anchors: base.anchors,
    palette: { ...base.palette, ...(overlay.palette ?? {}) },
    roles: overlay.roles
      ? {
          syntax: { ...base.roles.syntax, ...(overlay.roles.syntax ?? {}) },
          ui: { ...base.roles.ui, ...(overlay.roles.ui ?? {}) },
          terminal: { ...base.roles.terminal, ...(overlay.roles.terminal ?? {}) },
          "terminal-bright": overlay.roles["terminal-bright"] ?? base.roles["terminal-bright"],
        }
      : base.roles,
  };
  validate(data);
  return data;
}

/**
 * Every palette in the project: the base (cadenza.yaml) and each variant
 * overlay in the same directory. Generators and validators iterate over this —
 * a new variant is covered by all three gates automatically.
 */
export function loadAllPalettes(
  dir: string
): { p: PaletteFile; isBase: boolean }[] {
  const base = join(dir, "cadenza.yaml");
  const overlays = readdirSync(dir)
    .filter((f) => f.endsWith(".yaml") && f !== "cadenza.yaml")
    .sort();
  return [
    { p: loadPalette(base), isBase: true },
    ...overlays.map((f) => ({ p: loadPaletteVariant(base, join(dir, f)), isBase: false })),
  ];
}

function validate(data: PaletteFile): void {
  for (const [name, hex] of Object.entries(data.palette)) {
    if (!HEX_RE.test(hex)) {
      throw new Error(`palette.${name}: "${hex}" is not a valid hex (#rrggbb)`);
    }
  }

  for (const group of GROUPS) {
    if (!data.roles[group]) {
      throw new Error(`roles.${group} is missing from the palette`);
    }
    for (const [role, token] of Object.entries(data.roles[group])) {
      if (!(token in data.palette)) {
        throw new Error(
          `roles.${group}.${role} references "${token}", which is not in the palette`
        );
      }
    }
  }

  for (const [slot, token] of Object.entries(data.roles["terminal-bright"] ?? {})) {
    if (!(slot in data.roles.terminal)) {
      throw new Error(`roles.terminal-bright.${slot} is not an ANSI slot`);
    }
    if (!(token in data.palette)) {
      throw new Error(
        `roles.terminal-bright.${slot} references "${token}", which is not in the palette`
      );
    }
  }
}

/**
 * The final colour of an ANSI "bright" slot: normally the lightened base, but
 * the YAML can point straight at a token for cases where the rule doesn't fit.
 * Generator and validator both call this — it keeps the two from diverging.
 */
export function ansiBright(p: PaletteFile, slot: string): string {
  const override = p.roles["terminal-bright"]?.[slot];
  if (override) return p.palette[override];
  return raiseL(resolve(p, "terminal", slot), ANSI_BRIGHT_L);
}

/** Resolves a role (e.g. "syntax.keyword") to its final hex. */
export function resolve(p: PaletteFile, group: RoleGroup, role: string): string {
  const token = p.roles[group][role];
  if (!token) throw new Error(`unknown role: ${group}.${role}`);
  return p.palette[token];
}

/** Hex + alpha (0-1) -> #rrggbbaa. Handy for workbench overlays. */
export function alpha(hex: string, a: number): string {
  if (!HEX_RE.test(hex)) throw new Error(`alpha(): "${hex}" is not #rrggbb`);
  const byte = Math.round(clamp01(a) * 255).toString(16).padStart(2, "0");
  return hex + byte;
}

/** Clamps a number to [0,1]. Without it, alpha and lighten emit invalid hex. */
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Lightens a hex by pulling each channel towards white.
 * Deriving like this does NOT break the hardcoded-hex rule: the source colour
 * still comes from the palette — this is just a transformation of it.
 * Used for terminal "bright" colours and UI micro-adjustments.
 */
export function lighten(hex: string, amount: number): string {
  if (!HEX_RE.test(hex)) throw new Error(`lighten(): "${hex}" is not #rrggbb`);
  const a = clamp01(amount);
  const out = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(c + (255 - c) * a);
  });
  return "#" + out.map((c) => c.toString(16).padStart(2, "0")).join("");
}

/**
 * Darkens a hex by pulling each channel towards black — the mirror of
 * lighten(), with the same justification: a transformation of a palette
 * token, not a hardcoded hex. Used for Base24's extra backgrounds.
 */
export function darken(hex: string, amount: number): string {
  if (!HEX_RE.test(hex)) throw new Error(`darken(): "${hex}" is not #rrggbb`);
  const a = clamp01(amount);
  const out = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(c * (1 - a));
  });
  return "#" + out.map((c) => c.toString(16).padStart(2, "0")).join("");
}

// ------------------------------------------------------------
// OKLCH — used by the terminal "bright" colours (raiseL) and by generators
// that need a perceptual step rather than a mix with white/black.
// ------------------------------------------------------------

type V3 = [number, number, number];

function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function toSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function linearToOklab([r, g, b]: V3): V3 {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinear([L, a, b]: V3): V3 {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** #rrggbb -> [L, C, h] in OKLCH (h in degrees). */
export function toOklch(hex: string): V3 {
  if (!HEX_RE.test(hex)) throw new Error(`toOklch(): "${hex}" is not #rrggbb`);
  const [L, a, b] = linearToOklab(channels(hex).map((c) => toLinear(c / 255)) as V3);
  const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return [L, Math.hypot(a, b), h];
}

/**
 * [L, C, h] -> #rrggbb. Outside the sRGB gamut, reduces chroma until it fits —
 * preserving lightness and hue, which are what the palette's ladder protects.
 */
export function fromOklch(L: number, C: number, h: number): string {
  const rad = (h * Math.PI) / 180;
  let chroma = C;
  let lin = oklabToLinear([L, chroma * Math.cos(rad), chroma * Math.sin(rad)]);
  while (chroma > 0 && lin.some((v) => v < -1e-4 || v > 1 + 1e-4)) {
    chroma = Math.max(0, chroma - 0.002);
    lin = oklabToLinear([L, chroma * Math.cos(rad), chroma * Math.sin(rad)]);
  }
  return (
    "#" +
    lin
      .map((v) => Math.round(clamp01(toSrgb(clamp01(v))) * 255).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Raises OKLCH lightness by `dL`, keeping hue and chroma (with gamut mapping). */
export function raiseL(hex: string, dL: number): string {
  const [L, C, h] = toOklch(hex);
  return fromOklch(Math.min(1, L + dL), C, h);
}
