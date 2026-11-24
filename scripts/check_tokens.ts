// ============================================================
// Validates the theme's real TOKENIZATION. Fails (exit 1) if a token
// in a fixture resolves to the wrong colour or fontStyle.
//
// It is "Developer: Inspect Editor Tokens and Scopes", automated:
// uses the SAME engine as VS Code (vscode-textmate + vscode-oniguruma)
// and the published grammars (tests/grammars/, vendored from the
// microsoft/vscode repository), so what passes here is what the editor paints.
//
// What this check protects:
//   - italics limited to comments / parameters / HTML attributes —
//     including the exception rule for CSS/LESS/SCSS selectors, whose
//     leak (every .less selector in italics) has happened once already;
//   - the tag / attribute / component trio in HTML and JSX, where the
//     theme's most contested colour decisions meet.
//
// The theme is generated IN MEMORY from the YAML (themes/*.json is not
// read), so the check doesn't depend on build/check order.
// ============================================================

import { join } from "node:path";
import { readFileSync } from "node:fs";
import { vsctm, createRegistry, tokenizeFile, paintScopes, SCOPE_BY_EXTENSION, PaintedToken } from "./lib/textmate";
import { PaletteFile, loadAllPalettes } from "../src/lib/palette";
import { generateVscodeTheme } from "../src/generators/vscode";

const root = join(import.meta.dirname, "..");

// ------------------------------------------------------------
// Cases: each line says "this snippet of this fixture comes out in this
// colour, with or without italics". The colour is a roles.syntax role (or a
// palette token, for tag punctuation etc.) — never a loose hex.
// The anchor is the FIRST character of the snippet's first occurrence on
// the given line.
// ------------------------------------------------------------
interface Case {
  file: string;
  line: number;       // 1-based
  snippet: string;
  role: string;       // roles.syntax key
  italic: boolean;
}

const cases: Case[] = [
  // CSS — selectors do NOT inherit the HTML attribute italics
  { file: "sample.css", line: 1, snippet: "comment", role: "comment", italic: true },
  { file: "sample.css", line: 2, snippet: "card", role: "type", italic: false },
  { file: "sample.css", line: 2, snippet: "hover", role: "type", italic: false },
  { file: "sample.css", line: 2, snippet: "after", role: "type", italic: false },
  { file: "sample.css", line: 2, snippet: "color", role: "variable", italic: false },
  { file: "sample.css", line: 3, snippet: "main", role: "type", italic: false },

  // LESS — the fixed leak: .less scopes weren't covered
  { file: "sample.less", line: 1, snippet: "comment", role: "comment", italic: true },
  { file: "sample.less", line: 2, snippet: "button", role: "type", italic: false },
  { file: "sample.less", line: 3, snippet: "top", role: "type", italic: false },
  { file: "sample.less", line: 3, snippet: "hover", role: "type", italic: false },
  { file: "sample.less", line: 5, snippet: "__title", role: "type", italic: false },
  { file: "sample.less", line: 6, snippet: "extend", role: "type", italic: false },

  // SCSS — %placeholder and BEM's &__elem suffix
  { file: "sample.scss", line: 1, snippet: "comment", role: "comment", italic: true },
  { file: "sample.scss", line: 2, snippet: "base", role: "type", italic: false },
  { file: "sample.scss", line: 3, snippet: "card", role: "type", italic: false },
  // The SCSS grammar marks the whole `&__elem` suffix identifier as
  // punctuation.definition.entity.css (inside the parent-selector-suffix
  // scope), so the final colour is punctuation — unlike LESS, which gives the
  // type colour. What this case locks is the ITALICS: before the fix the
  // suffix inherited the HTML attribute italics even while coming out in fg1.
  { file: "sample.scss", line: 4, snippet: "__title", role: "punctuation", italic: false },
  { file: "sample.scss", line: 5, snippet: "hover", role: "type", italic: false },

  // HTML — here attribute italics ARE wanted
  { file: "sample.html", line: 1, snippet: "comment", role: "comment", italic: true },
  { file: "sample.html", line: 2, snippet: "div", role: "tag", italic: false },
  { file: "sample.html", line: 2, snippet: "<", role: "punctuation", italic: false },
  { file: "sample.html", line: 2, snippet: "class", role: "attribute", italic: true },
  { file: "sample.html", line: 2, snippet: "card", role: "string", italic: false },
  { file: "sample.html", line: 3, snippet: "a href", role: "tag", italic: false },
  { file: "sample.html", line: 3, snippet: "href", role: "attribute", italic: true },

  // TSX — JSX's tag × attribute × component trio
  { file: "sample.tsx", line: 1, snippet: "comment", role: "comment", italic: true },
  { file: "sample.tsx", line: 2, snippet: "import", role: "storage", italic: false },
  { file: "sample.tsx", line: 4, snippet: "export", role: "storage", italic: false },
  { file: "sample.tsx", line: 4, snippet: "function", role: "storage", italic: false },
  { file: "sample.tsx", line: 4, snippet: "Card", role: "function", italic: false },
  { file: "sample.tsx", line: 5, snippet: "const", role: "storage", italic: false },
  // const declares an ordinary variable, not a constant: stays fg0
  { file: "sample.tsx", line: 5, snippet: "label", role: "variable", italic: false },
  { file: "sample.tsx", line: 4, snippet: "props", role: "parameter", italic: true },
  { file: "sample.tsx", line: 4, snippet: "CardProps", role: "type", italic: false },
  { file: "sample.tsx", line: 5, snippet: "Item:", role: "string", italic: false },
  { file: "sample.tsx", line: 5, snippet: "${", role: "interpolation", italic: false },
  { file: "sample.tsx", line: 6, snippet: "return", role: "keyword", italic: false },
  { file: "sample.tsx", line: 7, snippet: "<", role: "punctuation", italic: false },
  { file: "sample.tsx", line: 7, snippet: "section", role: "tag", italic: false },
  { file: "sample.tsx", line: 7, snippet: "className", role: "attribute", italic: true },
  { file: "sample.tsx", line: 8, snippet: "Button", role: "type", italic: false },
  { file: "sample.tsx", line: 8, snippet: "onClick", role: "attribute", italic: true },

  // ----------------------------------------------------------
  // Programming languages. The principle these cases guard:
  // scarlet = control flow; the rest of the reserved words
  // (declaration, modifier, module) = storage grey; self/this =
  // grey italic; metaprogramming (decorator, annotation, attribute,
  // C macro) = orchid.
  // ----------------------------------------------------------

  // Rust
  { file: "sample.rs", line: 2, snippet: "use", role: "storage", italic: false },
  { file: "sample.rs", line: 6, snippet: "#", role: "decorator", italic: false },
  { file: "sample.rs", line: 6, snippet: "derive", role: "decorator", italic: false },
  { file: "sample.rs", line: 6, snippet: "Debug", role: "type", italic: false },
  { file: "sample.rs", line: 7, snippet: "'a", role: "type", italic: true },
  { file: "sample.rs", line: 9, snippet: "u32", role: "type", italic: false },
  { file: "sample.rs", line: 14, snippet: "MAX_TRACKS", role: "constant", italic: false },
  { file: "sample.rs", line: 17, snippet: "fn", role: "storage", italic: false },
  { file: "sample.rs", line: 17, snippet: "self", role: "builtin", italic: true },
  { file: "sample.rs", line: 18, snippet: "{}", role: "interpolation", italic: false },
  { file: "sample.rs", line: 22, snippet: "pub", role: "storage", italic: false },
  { file: "sample.rs", line: 24, snippet: "for", role: "keyword", italic: false },
  { file: "sample.rs", line: 25, snippet: "break", role: "keyword", italic: false },
  { file: "sample.rs", line: 29, snippet: "match", role: "keyword", italic: false },
  { file: "sample.rs", line: 35, snippet: "async", role: "storage", italic: false },
  { file: "sample.rs", line: 37, snippet: "{label}", role: "interpolation", italic: false },
  // the dot in 3.5 is part of the number, not punctuation
  { file: "sample.rs", line: 37, snippet: ".5", role: "number", italic: false },

  // Java
  { file: "Sample.java", line: 1, snippet: "package", role: "storage", italic: false },
  { file: "Sample.java", line: 3, snippet: "import", role: "storage", italic: false },
  { file: "Sample.java", line: 8, snippet: "@param", role: "doctag", italic: true },
  { file: "Sample.java", line: 8, snippet: "<T>", role: "doctag", italic: true },
  { file: "Sample.java", line: 10, snippet: "@FunctionalInterface", role: "decorator", italic: false },
  { file: "Sample.java", line: 13, snippet: "public", role: "storage", italic: false },
  { file: "Sample.java", line: 13, snippet: "Encore", role: "type", italic: false },
  { file: "Sample.java", line: 14, snippet: "int", role: "type", italic: false },
  { file: "Sample.java", line: 19, snippet: "this", role: "builtin", italic: true },
  { file: "Sample.java", line: 22, snippet: "@Override", role: "decorator", italic: false },
  { file: "Sample.java", line: 25, snippet: "throw", role: "keyword", italic: false },
  { file: "Sample.java", line: 25, snippet: "new", role: "storage", italic: false },
  { file: "Sample.java", line: 32, snippet: "?", role: "operator", italic: false },

  // C
  { file: "sample.c", line: 1, snippet: "include", role: "storage", italic: false },
  { file: "sample.c", line: 4, snippet: "MAX_TRACKS", role: "constant", italic: false },
  { file: "sample.c", line: 7, snippet: "typedef", role: "storage", italic: false },
  { file: "sample.c", line: 8, snippet: "char", role: "type", italic: false },
  { file: "sample.c", line: 16, snippet: "for", role: "keyword", italic: false },
  // conditional compilation is control flow; #include/#define are not
  { file: "sample.c", line: 20, snippet: "ifdef", role: "keyword", italic: false },

  // C++
  { file: "sample.cpp", line: 4, snippet: "namespace", role: "storage", italic: false },
  { file: "sample.cpp", line: 7, snippet: "concept", role: "storage", italic: false },
  { file: "sample.cpp", line: 7, snippet: "requires", role: "storage", italic: false },
  { file: "sample.cpp", line: 11, snippet: "std", role: "namespace", italic: false },
  { file: "sample.cpp", line: 12, snippet: "default", role: "storage", italic: false },
  { file: "sample.cpp", line: 14, snippet: "nodiscard", role: "decorator", italic: false },
  { file: "sample.cpp", line: 14, snippet: "auto", role: "type", italic: false },
  { file: "sample.cpp", line: 15, snippet: "return", role: "keyword", italic: false },

  // C# — TextMate follows what Roslyn does once it loads: everything that
  // isn't a control keyword (including int, null) is keyword.cs → grey
  { file: "Sample.cs", line: 1, snippet: "using", role: "storage", italic: false },
  { file: "Sample.cs", line: 6, snippet: "summary", role: "doctag", italic: true },
  { file: "Sample.cs", line: 10, snippet: "int", role: "storage", italic: false },
  { file: "Sample.cs", line: 19, snippet: "{Round", role: "interpolation", italic: false },
  { file: "Sample.cs", line: 21, snippet: "foreach", role: "keyword", italic: false },
  { file: "Sample.cs", line: 21, snippet: "in _setlist", role: "keyword", italic: false },
  { file: "Sample.cs", line: 23, snippet: "null", role: "storage", italic: false },
  { file: "Sample.cs", line: 24, snippet: "await", role: "keyword", italic: false },

  // Python
  { file: "sample.py", line: 2, snippet: "from", role: "storage", italic: false },
  { file: "sample.py", line: 8, snippet: "MAX_ENCORES", role: "constant", italic: false },
  { file: "sample.py", line: 9, snippet: "?P<title>", role: "variable", italic: false },
  { file: "sample.py", line: 12, snippet: "@dataclass", role: "decorator", italic: false },
  // MagicPython marks the called name as meta.function-call.generic
  { file: "sample.py", line: 16, snippet: "field", role: "function", italic: false },
  { file: "sample.py", line: 18, snippet: "def", role: "storage", italic: false },
  { file: "sample.py", line: 18, snippet: "self", role: "builtin", italic: true },
  { file: "sample.py", line: 19, snippet: "f\"", role: "string", italic: false },
  { file: "sample.py", line: 19, snippet: ":.0f", role: "interpolation", italic: false },
  { file: "sample.py", line: 24, snippet: "self", role: "builtin", italic: true },
  { file: "sample.py", line: 27, snippet: "@property", role: "decorator", italic: false },
  { file: "sample.py", line: 38, snippet: "await", role: "keyword", italic: false },

  // TypeScript
  { file: "sample.ts", line: 1, snippet: "import", role: "storage", italic: false },
  { file: "sample.ts", line: 1, snippet: "from", role: "storage", italic: false },
  { file: "sample.ts", line: 4, snippet: "MAX_ENCORES", role: "variable", italic: false },
  { file: "sample.ts", line: 4, snippet: "as", role: "storage", italic: false },
  { file: "sample.ts", line: 10, snippet: "@", role: "decorator", italic: false },
  { file: "sample.ts", line: 10, snippet: "sealed", role: "decorator", italic: false },
  { file: "sample.ts", line: 20, snippet: "this", role: "builtin", italic: true },
  { file: "sample.ts", line: 25, snippet: "hint", role: "doctag", italic: true },
  { file: "sample.ts", line: 29, snippet: "await", role: "keyword", italic: false },
  { file: "sample.ts", line: 30, snippet: "^", role: "regexp", italic: false },
  { file: "sample.ts", line: 30, snippet: "u;", role: "regexp", italic: false },
  { file: "sample.ts", line: 35, snippet: "*", role: "storage", italic: false },
];


// ------------------------------------------------------------
// SEMANTIC tokens. With a language server running, VS Code paints over
// TextMate following this chain (colorThemeData.getTokenStyle):
//   1. the theme's semanticTokenColors rules — selector score:
//      +100 for the type, +100 per modifier, +10 for the language; ties
//      go to the rule defined LAST;
//   2. any property the theme didn't set (colour, italic, underline) comes
//      from the extension's semanticTokenScopes: a loose TextMate scope,
//      resolved against the theme's tokenColors WITHOUT ancestors.
// The fallback scopes below were copied from each extension's package.json
// (rust-analyzer, vscode-csharp, vscode-java, vscode-cpptools) or from VS
// Code's default registry; Pylance doesn't publish its own, so its cases
// depend on theme rules only.
// ------------------------------------------------------------
interface SemanticCase {
  source: string;          // server + code example
  token: string;           // type[.modifier]* as the server emits it
  language: string;
  fallback: string[];      // semanticTokenScopes scopes, in score order
  role: string;
  italic: boolean;
  underline?: boolean;
}

const semanticCases: SemanticCase[] = [
  // rust-analyzer
  { source: "rust-analyzer: fn, let, pub, use, impl", token: "keyword", language: "rust",
    fallback: ["keyword.other.rust"], role: "storage", italic: false },
  { source: "rust-analyzer: if, for, in, match, return", token: "keyword.controlFlow", language: "rust",
    fallback: ["keyword.control.rust", "keyword.other.rust"], role: "keyword", italic: false },
  { source: "rust-analyzer: self", token: "selfKeyword", language: "rust",
    fallback: [], role: "builtin", italic: true },
  { source: "rust-analyzer: 'a", token: "lifetime", language: "rust",
    fallback: ["storage.modifier.lifetime.rust"], role: "type", italic: true },
  { source: "rust-analyzer: #[derive]", token: "builtinAttribute", language: "rust",
    fallback: ["meta.attribute.rust"], role: "decorator", italic: false },
  { source: "rust-analyzer: println", token: "macro", language: "rust",
    fallback: ["entity.name.function.preprocessor"], role: "function", italic: false },
  { source: "rust-analyzer: {} in format!", token: "formatSpecifier", language: "rust",
    fallback: ["punctuation.section.embedded.rust"], role: "interpolation", italic: false },
  { source: "rust-analyzer: const MAX", token: "const", language: "rust",
    fallback: [], role: "constant", italic: false },
  { source: "rust-analyzer: let mut x", token: "variable.mutable", language: "rust",
    fallback: ["variable.other.rust", "markup.underline"], role: "variable", italic: false, underline: true },
  { source: "rust-analyzer: Some, None", token: "enumMember", language: "rust",
    fallback: [], role: "constant", italic: false },

  // C# (Roslyn)
  { source: "Roslyn: public, int, var, true, null, this", token: "keyword", language: "csharp",
    fallback: ["keyword.cs"], role: "storage", italic: false },
  { source: "Roslyn: if, foreach, in, return, await", token: "controlKeyword", language: "csharp",
    fallback: ["keyword.control.cs"], role: "keyword", italic: false },
  { source: "Roslyn: const MaxEncores", token: "constant", language: "csharp",
    fallback: ["variable.other.constant"], role: "constant", italic: false },
  { source: "Roslyn: <summary>", token: "xmlDocCommentName", language: "csharp",
    fallback: ["comment.documentation.name.cs"], role: "doctag", italic: true },
  { source: "Roslyn: code in a disabled #if", token: "excludedCode", language: "csharp",
    fallback: ["support.other.excluded.cs"], role: "comment", italic: false },
  { source: "Roslyn: ^ in a Regex", token: "regexAnchor", language: "csharp",
    fallback: ["keyword.control.anchor.regexp.cs"], role: "regexp", italic: false },

  // Java (jdt.ls)
  { source: "jdt.ls: @Override", token: "annotation", language: "java",
    fallback: ["storage.type.annotation.java"], role: "decorator", italic: false },
  { source: "jdt.ls: public, static, final", token: "modifier", language: "java",
    fallback: ["storage.modifier.java"], role: "storage", italic: false },
  { source: "jdt.ls: static final MAX", token: "property.static.readonly", language: "java",
    fallback: ["variable.other.constant.property"], role: "constant", italic: false },
  { source: "jdt.ls: final local var", token: "variable.readonly", language: "java",
    fallback: ["variable.other.constant"], role: "variable", italic: false },
  { source: "jdt.ls: @param in Javadoc", token: "keyword.documentation", language: "java",
    fallback: ["keyword.other.documentation.javadoc.java"], role: "doctag", italic: true },

  // C/C++ (cpptools and clangd)
  { source: "cpptools/clangd: #define MAX", token: "macro", language: "cpp",
    fallback: ["entity.name.function.preprocessor.cpp"], role: "constant", italic: false },
  { source: "cpptools: struct track", token: "struct", language: "c",
    fallback: ["storage.type.struct.c"], role: "type", italic: false },
  { source: "clangd: const auto x (local)", token: "variable.readonly", language: "cpp",
    fallback: ["variable.other.constant"], role: "variable", italic: false },
  { source: "cpptools: global const", token: "variable.readonly.global", language: "cpp",
    fallback: ["variable.other.constant.cpp"], role: "constant", italic: false },
  { source: "clangd: static constexpr member", token: "property.static.readonly", language: "cpp",
    fallback: ["variable.other.constant.property"], role: "constant", italic: false },
  { source: "cpptools: std::vector<T>", token: "templateType", language: "cpp",
    fallback: ["entity.name.type.class.templated.cpp"], role: "type", italic: false },

  // Python (Pylance)
  { source: "Pylance: self", token: "selfParameter", language: "python",
    fallback: [], role: "builtin", italic: true },
  { source: "Pylance: cls", token: "clsParameter", language: "python",
    fallback: [], role: "builtin", italic: true },
  { source: "Pylance: import re", token: "module", language: "python",
    fallback: [], role: "namespace", italic: false },
  { source: "Pylance: @dataclass", token: "function.decorator", language: "python",
    fallback: ["entity.name.function"], role: "decorator", italic: false },
  { source: "Pylance: @property", token: "class.decorator", language: "python",
    fallback: ["entity.name.type.class"], role: "decorator", italic: false },
  { source: "Pylance: MAX: Final = 3", token: "variable.readonly", language: "python",
    fallback: ["variable.other.constant"], role: "constant", italic: false },

  // TypeScript (built-in server)
  { source: "TS: const x = …", token: "variable.readonly", language: "typescript",
    fallback: ["variable.other.constant"], role: "variable", italic: false },
  { source: "TS: static readonly X", token: "property.readonly.static", language: "typescript",
    fallback: ["variable.other.constant.property"], role: "constant", italic: false },
  { source: "TS: console", token: "variable.defaultLibrary", language: "typescript",
    fallback: ["support.variable"], role: "builtin", italic: true },
  { source: "TS: Cue.Start", token: "enumMember", language: "typescript",
    fallback: ["variable.other.enummember"], role: "constant", italic: false },
];

type SemanticStyle = { foreground?: string; italic?: boolean; underline?: boolean };

/** Score of a semanticTokenColors selector, as VS Code computes it. */
function score(selector: string, type: string, mods: string[], language: string): number {
  const [body, lang] = selector.split(":");
  const [selType, ...selMods] = body.split(".");
  let s = 0;
  if (lang !== undefined) {
    if (lang !== language) return -1;
    s += 10;
  }
  if (selType !== "*") {
    if (selType !== type) return -1;
    s += 100;
  }
  if (selMods.some((m) => !mods.includes(m))) return -1;
  return s + selMods.length * 100;
}

async function resolveSemantic(
  c: SemanticCase,
  rules: Record<string, string | SemanticStyle>,
  registry: vsctm.Registry
): Promise<{ color: string; italic: boolean; underline: boolean }> {
  const [type, ...mods] = c.token.split(".");
  const best: Record<string, { score: number; value: unknown }> = {};
  for (const [selector, value] of Object.entries(rules)) {
    const sc = score(selector, type, mods, c.language);
    if (sc < 0) continue;
    const style: SemanticStyle = typeof value === "string" ? { foreground: value } : value;
    for (const prop of ["foreground", "italic", "underline"] as const) {
      if (style[prop] === undefined) continue;
      if (!best[prop] || best[prop].score <= sc) best[prop] = { score: sc, value: style[prop] };
    }
  }
  // Properties with no theme rule: they come from the fallback scopes, in order.
  const probes = c.fallback.length ? await paintScopes(registry, c.fallback) : [];
  const color = (best.foreground?.value as string | undefined) ?? probes.find(Boolean)?.color;
  const italic = (best.italic?.value as boolean | undefined) ?? probes.some((s) => s?.italic);
  const underline = (best.underline?.value as boolean | undefined) ?? probes.some((s) => s?.underline);
  return { color: (color ?? "?").toLowerCase(), italic, underline };
}

// ------------------------------------------------------------
// Run
// ------------------------------------------------------------
/** Runs every case for one palette; returns the number of failures. */
async function runPalette(p: PaletteFile): Promise<number> {
  const c = p.palette;
  const registry = await createRegistry();

  // The theme enters the registry the way VS Code hands it over: tokenColors
  // preceded by the default (editor.foreground/background).
  const theme = generateVscodeTheme(p) as {
    colors: Record<string, string>;
    tokenColors: vsctm.IRawThemeSetting[];
  };
  registry.setTheme({
    name: p.meta.slug,
    settings: [
      {
        settings: {
          foreground: theme.colors["editor.foreground"],
          background: theme.colors["editor.background"],
        },
      },
      ...theme.tokenColors,
    ],
  });

  // Tokenize each fixture once
  const byFile = new Map<string, PaintedToken[][]>();
  for (const file of new Set(cases.map((k) => k.file))) {
    const extension = file.split(".").pop()!;
    const grammar = await registry.loadGrammar(SCOPE_BY_EXTENSION[extension]);
    if (!grammar) throw new Error(`grammar failed to load for ${file}`);
    const lines = readFileSync(join(root, "tests", "fixtures", file), "utf8").split(/\r?\n/);
    byFile.set(file, tokenizeFile(registry, grammar, lines));
  }

  let failures = 0;
  const diagnostics: string[] = [];
  const tableRows: string[][] = [];

  for (const k of cases) {
    const token = c[p.roles.syntax[k.role]];
    const expectedColor = token.toLowerCase();
    const label = `${p.roles.syntax[k.role]}/${k.role}`;

    const lines = readFileSync(join(root, "tests", "fixtures", k.file), "utf8").split(/\r?\n/);
    const idx = lines[k.line - 1]?.indexOf(k.snippet) ?? -1;
    let actual = "— snippet not found —";
    let ok = false;
    let scopes: string[] = [];

    if (idx >= 0) {
      const painted = byFile
        .get(k.file)!
        [k.line - 1].find((t) => t.start <= idx && idx < t.end);
      if (painted) {
        actual = `${painted.color}${painted.italic ? " italic" : ""}`;
        ok = painted.color === expectedColor && painted.italic === k.italic;
        scopes = painted.scopes;
      }
    }
    if (!ok) {
      failures++;
      diagnostics.push(
        `✘ ${k.file}:${k.line} "${k.snippet}" — scopes: ${scopes.join(", ") || "?"}`
      );
    }
    tableRows.push([
      `${k.file}:${k.line}`,
      k.snippet,
      `${expectedColor}${k.italic ? " italic" : ""} (${label})`,
      actual,
      ok ? "✔" : "✘ MISMATCH",
    ]);
  }

  // Semantic layer
  const rules = (theme as unknown as { semanticTokenColors: Record<string, string | SemanticStyle> })
    .semanticTokenColors;
  for (const k of semanticCases) {
    const expectedColor = c[p.roles.syntax[k.role]].toLowerCase();
    const r = await resolveSemantic(k, rules, registry);
    const ok =
      r.color === expectedColor && r.italic === k.italic && r.underline === Boolean(k.underline);
    const style = (color: string, it: boolean, und: boolean) =>
      `${color}${it ? " italic" : ""}${und ? " underline" : ""}`;
    if (!ok) {
      failures++;
      diagnostics.push(`✘ semantic ${k.source} (${k.token}:${k.language})`);
    }
    tableRows.push([
      `sem:${k.language}`,
      k.token,
      `${style(expectedColor, k.italic, Boolean(k.underline))} (${p.roles.syntax[k.role]}/${k.role})`,
      style(r.color, r.italic, r.underline),
      ok ? "✔" : "✘ MISMATCH",
    ]);
  }

  // Aligned table, in check_contrast's format
  const head = ["where", "snippet", "expected", "actual", "status"];
  const widths = head.map((h, i) => Math.max(h.length, ...tableRows.map((l) => l[i].length)));
  const fmt = (l: string[]) => l.map((cell, i) => cell.padEnd(widths[i])).join("  ");
  console.log(`\n[${p.meta.name}] real tokenization against VS Code's grammars:\n`);
  console.log(fmt(head));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const l of tableRows) console.log(fmt(l));

  if (failures > 0) {
    console.error(`\n[${p.meta.name}] scopes of the failing cases:`);
    for (const d of diagnostics) console.error(d);
  }
  return failures;
}

async function main(): Promise<void> {
  const palettes = loadAllPalettes(join(root, "palette"));
  let failures = 0;
  for (const { p } of palettes) failures += await runPalette(p);

  if (failures > 0) {
    console.error(`\n✘ ${failures} tokenization case(s) differ from what was expected.`);
    process.exit(1);
  }
  console.log(`\n✔ ${cases.length} TextMate + ${semanticCases.length} semantic cases × ${palettes.length} palette(s) match the theme.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
