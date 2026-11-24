// ============================================================
// Tuning tool (not a gate): shows, token by token, which theme colour each
// snippet of a fixture gets — by the palette token's NAME.
//
//   npm run inspect -- sample.rs Sample.java
//   SCOPES=1 npm run inspect -- sample.py     # includes the TextMate scope
//
// Same engine as check_tokens; handy for finding the exact scope before
// writing a new rule or case.
// ============================================================
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { loadAllPalettes } from "../src/lib/palette";
import { generateVscodeTheme } from "../src/generators/vscode";
import { createRegistry, tokenizeFile, SCOPE_BY_EXTENSION } from "./lib/textmate";
(async () => {
  const root = join(import.meta.dirname, "..");
  const { p } = loadAllPalettes(join(root, "palette"))[0];
  const theme: any = generateVscodeTheme(p);
  const names = new Map<string, string>();
  for (const [k, v] of Object.entries(p.palette)) if (!names.has(v.toLowerCase())) names.set(v.toLowerCase(), k);
  const reg = await createRegistry();
  reg.setTheme({ name: "x", settings: [{ settings: { foreground: theme.colors["editor.foreground"], background: theme.colors["editor.background"] } }, ...theme.tokenColors] });
  const files = process.argv.slice(2);
  for (const file of files) {
    const g = await reg.loadGrammar(SCOPE_BY_EXTENSION[file.split(".").pop()!]);
    const lines = readFileSync(join(root, "tests", "fixtures", file), "utf8").split("\n");
    const painted = tokenizeFile(reg, g!, lines);
    console.log(`\n===== ${file}`);
    painted.forEach((toks, i) => {
      const parts = toks.map((t) => {
        const txt = lines[i].slice(t.start, t.end);
        if (!txt.trim()) return null;
        const name = names.get(t.color) ?? t.color;
        const scope = process.env.SCOPES ? `{${t.scopes.slice(-1)[0]}}` : "";
        return `${txt.trim()}[${name}${t.italic ? "/i" : ""}]${scope}`;
      }).filter(Boolean);
      if (parts.length) console.log(`${String(i + 1).padStart(2)}: ${parts.join(" ")}`);
    });
  }
})();
