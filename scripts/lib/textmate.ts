// ============================================================
// Tokenization infrastructure shared by check_tokens.ts (gate) and
// preview.ts (screenshots): the SAME engine as VS Code (vscode-textmate +
// vscode-oniguruma) over the grammars vendored in tests/grammars/.
// ============================================================

import { join } from "node:path";
import { readFileSync } from "node:fs";
import * as vsctm from "vscode-textmate";
import * as oniguruma from "vscode-oniguruma";

export { vsctm };

const root = join(import.meta.dirname, "..", "..");

export const GRAMMARS: Record<string, string> = {
  "source.css": "css.tmLanguage.json",
  "source.css.less": "less.tmLanguage.json",
  "source.css.scss": "scss.tmLanguage.json",
  "text.html.basic": "html.tmLanguage.json",
  "text.html.derivative": "html-derivative.tmLanguage.json",
  "source.tsx": "TypeScriptReact.tmLanguage.json",
  "source.ts": "TypeScript.tmLanguage.json",
  "source.rust": "rust.tmLanguage.json",
  "source.java": "java.tmLanguage.json",
  "source.c": "c.tmLanguage.json",
  "source.cpp": "cpp.tmLanguage.json",
  "source.cpp.embedded.macro": "cpp.embedded.macro.tmLanguage.json",
  "source.cs": "csharp.tmLanguage.json",
  "source.python": "MagicPython.tmLanguage.json",
  "source.regexp.python": "MagicRegExp.tmLanguage.json",
};

export const SCOPE_BY_EXTENSION: Record<string, string> = {
  css: "source.css",
  less: "source.css.less",
  scss: "source.css.scss",
  html: "text.html.derivative",
  tsx: "source.tsx",
  ts: "source.ts",
  rs: "source.rust",
  java: "source.java",
  c: "source.c",
  cpp: "source.cpp",
  cs: "source.cs",
  py: "source.python",
};

// vscode-textmate metadata masks (MetadataConsts). Italic is bit 1 of
// fontStyle.
const FONT_STYLE_MASK = 0b00000000_00000000_01111000_00000000;
const FONT_STYLE_OFFSET = 11;
const FOREGROUND_MASK = 0b00000000_11111111_10000000_00000000;
const FOREGROUND_OFFSET = 15;
const ITALIC = 1;
const UNDERLINE = 4;

// The oniguruma WASM can only be initialized once per process — the
// registry, however, is one per palette (setTheme replaces the whole colorMap).
let wasmLoaded = false;

export async function createRegistry(): Promise<vsctm.Registry> {
  if (!wasmLoaded) {
    const wasm = readFileSync(join(root, "node_modules", "vscode-oniguruma", "release", "onig.wasm"));
    await oniguruma.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
    wasmLoaded = true;
  }
  return new vsctm.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
      createOnigString: (s) => new oniguruma.OnigString(s),
    }),
    loadGrammar: async (scopeName) => {
      const file = GRAMMARS[scopeName];
      if (!file) return null; // embedded languages we don't test (js in <script> etc.)
      const path = join(root, "tests", "grammars", file);
      return vsctm.parseRawGrammar(readFileSync(path, "utf8"), path);
    },
  });
}

export interface PaintedToken {
  start: number;
  end: number;
  color: string;     // lowercase hex resolved by the theme
  italic: boolean;
  scopes: string[];  // for diagnostics when a case fails
}

/** Tokenizes a whole fixture and returns the painted tokens, per line. */
export function tokenizeFile(
  registry: vsctm.Registry,
  grammar: vsctm.IGrammar,
  lines: string[]
): PaintedToken[][] {
  const colorMap = registry.getColorMap();
  const result: PaintedToken[][] = [];
  let stack = vsctm.INITIAL;       // for tokenizeLine2 (metadata: colour/style)
  let scopeStack = vsctm.INITIAL;  // for tokenizeLine (readable scopes)
  for (const line of lines) {
    const bin = grammar.tokenizeLine2(line, stack);
    const readable = grammar.tokenizeLine(line, scopeStack);
    stack = bin.ruleStack;
    scopeStack = readable.ruleStack;

    const tokens: PaintedToken[] = [];
    // binary tokens come in pairs (startIndex, metadata)
    for (let i = 0; i < bin.tokens.length; i += 2) {
      const start = bin.tokens[i];
      const metadata = bin.tokens[i + 1];
      const end = i + 2 < bin.tokens.length ? bin.tokens[i + 2] : line.length;
      const colorId = (metadata & FOREGROUND_MASK) >>> FOREGROUND_OFFSET;
      const fontStyle = (metadata & FONT_STYLE_MASK) >>> FONT_STYLE_OFFSET;
      const match = readable.tokens.find((t) => t.startIndex <= start && start < t.endIndex);
      tokens.push({
        start,
        end,
        color: (colorMap[colorId] ?? "").toLowerCase(),
        italic: (fontStyle & ITALIC) !== 0,
        scopes: match?.scopes ?? [],
      });
    }
    result.push(tokens);
  }
  return result;
}

/**
 * Resolves LOOSE scopes against the theme, without ancestors — the way VS Code
 * treats a semantic token's fallback scope (semanticTokenScopes): builds a
 * throwaway grammar that gives each probe word one scope.
 */
export async function paintScopes(
  registry: vsctm.Registry,
  scopes: string[]
): Promise<{ color: string; italic: boolean; underline: boolean }[]> {
  const probe = scopes.map((_, i) => `PROBE${i}`);
  const grammar = await registry.addGrammar({
    scopeName: `source.probe.${Date.now()}.${Math.random().toString(36).slice(2)}`,
    patterns: scopes.map((name, i) => ({ match: `\\b${probe[i]}\\b`, name })),
  } as unknown as vsctm.IRawGrammar);
  const line = probe.join(" ");
  const r = grammar.tokenizeLine2(line, vsctm.INITIAL);
  const colorMap = registry.getColorMap();
  const result: { color: string; italic: boolean; underline: boolean }[] = [];
  for (let i = 0; i < r.tokens.length; i += 2) {
    const start = r.tokens[i];
    const meta = r.tokens[i + 1];
    const idx = probe.findIndex((s) => line.startsWith(s, start));
    if (idx < 0) continue;
    const style = (meta & FONT_STYLE_MASK) >>> FONT_STYLE_OFFSET;
    result[idx] = {
      color: colorMap[(meta & FOREGROUND_MASK) >>> FOREGROUND_OFFSET].toLowerCase(),
      italic: (style & ITALIC) !== 0,
      underline: (style & UNDERLINE) !== 0,
    };
  }
  return result;
}
