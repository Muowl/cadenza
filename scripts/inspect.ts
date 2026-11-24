// ============================================================
// Ferramenta de ajuste (não é gate): mostra, token a token, que cor do
// tema cada trecho de um fixture recebe — pelo NOME do token da palette.
//
//   npm run inspect -- sample.rs Sample.java
//   SCOPES=1 npm run inspect -- sample.py     # inclui o escopo TextMate
//
// Mesmo motor do check_tokens; útil para descobrir o escopo exato antes
// de escrever uma regra ou um caso novo.
// ============================================================
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { loadAllPalettes } from "../src/lib/palette";
import { generateVscodeTheme } from "../src/generators/vscode";
import { criaRegistry, tokenizaArquivo, ESCOPO_POR_EXTENSAO } from "./lib/textmate";
(async () => {
  const raiz = join(import.meta.dirname, "..");
  const { p } = loadAllPalettes(join(raiz, "palette"))[0];
  const tema: any = generateVscodeTheme(p);
  const nomes = new Map<string, string>();
  for (const [k, v] of Object.entries(p.palette)) if (!nomes.has(v.toLowerCase())) nomes.set(v.toLowerCase(), k);
  const reg = await criaRegistry();
  reg.setTheme({ name: "x", settings: [{ settings: { foreground: tema.colors["editor.foreground"], background: tema.colors["editor.background"] } }, ...tema.tokenColors] });
  const arquivos = process.argv.slice(2);
  for (const arq of arquivos) {
    const g = await reg.loadGrammar(ESCOPO_POR_EXTENSAO[arq.split(".").pop()!]);
    const linhas = readFileSync(join(raiz, "tests", "fixtures", arq), "utf8").split("\n");
    const pint = tokenizaArquivo(reg, g!, linhas);
    console.log(`\n===== ${arq}`);
    pint.forEach((toks, i) => {
      const partes = toks.map((t) => {
        const txt = linhas[i].slice(t.inicio, t.fim);
        if (!txt.trim()) return null;
        const nome = nomes.get(t.cor) ?? t.cor;
        const esc = process.env.SCOPES ? `{${t.escopos.slice(-1)[0]}}` : "";
        return `${txt.trim()}[${nome}${t.italico ? "/i" : ""}]${esc}`;
      }).filter(Boolean);
      if (partes.length) console.log(`${String(i + 1).padStart(2)}: ${partes.join(" ")}`);
    });
  }
})();
