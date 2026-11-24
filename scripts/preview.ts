// ============================================================
// Gera os screenshots do README: uma janela do VS Code desenhada em SVG
// com as cores GERADAS do tema (não com a palette direto) e o código
// tokenizado pelo mesmo motor do editor. Renderiza com resvg em 2x.
//
//   npm run preview   →  assets/preview-<slug>.png para cada paleta
//
// É uma aproximação fiel de cores, não de pixels: a geometria da janela é
// simplificada, e o realce semântico do TypeScript (que o VS Code aplica
// por cima do TextMate) não entra.
// ============================================================

import { join } from "node:path";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { PaletteFile, loadAllPalettes, resolve, ansiBright, BRACKETS } from "../src/lib/palette";
import { generateVscodeTheme } from "../src/generators/vscode";
import { vsctm, criaRegistry, tokenizaArquivo, ESCOPO_POR_EXTENSAO } from "./lib/textmate";

const raiz = join(import.meta.dirname, "..");
const FONTES = join(raiz, "node_modules", "geist", "dist", "fonts");
const W = 1280;
const H = 900;
const MONO = "Geist Mono";
const SANS = "Geist";

type Tema = { colors: Record<string, string>; tokenColors: vsctm.IRawThemeSetting[] };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Código tokenizado → linhas de <tspan> com cor, itálico e brackets por nível. */
async function codigo(p: PaletteFile, tema: Tema, arquivo: string): Promise<string[]> {
  const registry = await criaRegistry();
  registry.setTheme({
    name: p.meta.slug,
    settings: [
      { settings: { foreground: tema.colors["editor.foreground"], background: tema.colors["editor.background"] } },
      ...tema.tokenColors,
    ],
  });
  const grammar = await registry.loadGrammar(ESCOPO_POR_EXTENSAO[arquivo.split(".").pop()!]);
  if (!grammar) throw new Error(`gramática não carregou para ${arquivo}`);
  const linhas = readFileSync(join(raiz, "tests", "fixtures", arquivo), "utf8").split(/\r?\n/);
  const pintadas = tokenizaArquivo(registry, grammar, linhas);

  // Colorização de pares de brackets, como o VS Code faz por cima dos tokens:
  // fora de string e comentário, cada ( [ { ganha a cor do nível.
  const corBracket = (nivel: number) =>
    tema.colors[`editorBracketHighlight.foreground${(nivel % BRACKETS.length) + 1}`];
  let nivel = 0;

  return pintadas.map((tokens, i) => {
    const linha = linhas[i];
    return tokens
      .map((t) => {
        const texto = linha.slice(t.inicio, t.fim);
        const ehCodigo = !t.escopos.some((s) => /^(string|comment)|template-expression/.test(s));
        const estilo = t.italico ? ' font-style="italic"' : "";
        if (!ehCodigo || !/[()[\]{}]/.test(texto)) {
          return `<tspan fill="${t.cor}"${estilo}>${esc(texto)}</tspan>`;
        }
        return [...texto]
          .map((ch) => {
            if ("([{".includes(ch)) return `<tspan fill="${corBracket(nivel++)}">${ch}</tspan>`;
            if (")]}".includes(ch)) return `<tspan fill="${corBracket(--nivel)}">${ch}</tspan>`;
            return `<tspan fill="${t.cor}"${estilo}>${esc(ch)}</tspan>`;
          })
          .join("");
      })
      .join("");
  });
}

async function janela(p: PaletteFile): Promise<string> {
  const tema = generateVscodeTheme(p) as Tema;
  const k = tema.colors;
  const c = p.palette;
  const ansi = (slot: string) => resolve(p, "terminal", slot);
  const partes: string[] = [];
  const add = (s: string) => partes.push(s);
  const rect = (x: number, y: number, w: number, h: number, fill: string, extra = "") =>
    add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`);
  const linhaH = (x1: number, x2: number, y: number, cor: string) =>
    add(`<line x1="${x1}" y1="${y + 0.5}" x2="${x2}" y2="${y + 0.5}" stroke="${cor}" stroke-width="1"/>`);
  const linhaV = (x: number, y1: number, y2: number, cor: string) =>
    add(`<line x1="${x + 0.5}" y1="${y1}" x2="${x + 0.5}" y2="${y2}" stroke="${cor}" stroke-width="1"/>`);
  const texto = (x: number, y: number, s: string, cor: string, tam = 12, fonte = SANS, extra = "") =>
    add(`<text x="${x}" y="${y}" fill="${cor}" font-family="${fonte}" font-size="${tam}" ${extra}>${s}</text>`);

  const TITULO = 32, ACT = 48, SIDE = 248, ABAS = 36, MIGALHA = 24, STATUS = 24, PAINEL = 214;
  const xEd = ACT + SIDE;
  const yEd = TITULO + ABAS + MIGALHA;
  const yPainel = H - STATUS - PAINEL;

  // Fundo e title bar
  rect(0, 0, W, H, k["editor.background"]);
  rect(0, 0, W, TITULO, k["titleBar.activeBackground"]);
  texto(W / 2, 20, "Encore.tsx — cadenza", k["titleBar.activeForeground"], 12, SANS, 'text-anchor="middle"');
  linhaH(0, W, TITULO, k["titleBar.border"]);

  // Activity bar: ícones como formas simples, o ativo com a barra branca
  rect(0, TITULO + 1, ACT, H - TITULO - STATUS - 1, k["activityBar.background"]);
  linhaV(ACT - 1, TITULO, H - STATUS, k["activityBar.border"]);
  [0, 1, 2, 3].forEach((i) => {
    const y = TITULO + 14 + i * 48;
    const ativo = i === 0;
    const cor = ativo ? k["activityBar.foreground"] : k["activityBar.inactiveForeground"];
    add(`<rect x="14" y="${y}" width="20" height="20" rx="5" fill="none" stroke="${cor}" stroke-width="1.8"/>`);
    if (ativo) rect(0, y - 8, 2, 36, k["activityBar.activeBorder"]);
    if (i === 2) {
      add(`<circle cx="34" cy="${y + 19}" r="7.5" fill="${k["activityBarBadge.background"]}"/>`);
      texto(34, y + 22.5, "3", k["activityBarBadge.foreground"], 10, SANS, 'text-anchor="middle" font-weight="600"');
    }
  });

  // Sidebar (explorer) com decorações do git
  rect(ACT, TITULO + 1, SIDE, H - TITULO - STATUS - 1, k["sideBar.background"]);
  linhaV(xEd - 1, TITULO, H - STATUS, k["sideBar.border"]);
  texto(ACT + 18, TITULO + 26, "EXPLORER", k["sideBarTitle.foreground"], 11, SANS, 'letter-spacing="0.6"');
  // Chevrons desenhados: a Geist não tem ⌄, e um glifo ausente derruba a
  // linha inteira para uma fonte de fallback.
  const chevron = (x: number, y: number, aberto: boolean, cor: string) =>
    add(aberto
      ? `<path d="M ${x} ${y - 6} l 3.5 3.5 l 3.5 -3.5" stroke="${cor}" stroke-width="1.3" fill="none"/>`
      : `<path d="M ${x + 1.5} ${y - 8} l 3.5 3.5 l -3.5 3.5" stroke="${cor}" stroke-width="1.3" fill="none"/>`);
  chevron(ACT + 10, TITULO + 54, true, k["sideBarSectionHeader.foreground"]);
  texto(ACT + 22, TITULO + 54, "CADENZA", k["sideBarSectionHeader.foreground"], 11, SANS, 'font-weight="600"');
  // [indentação, nome, cor, marca do git, pasta: "aberta" | "fechada"]
  const arvore: [number, string, string, string?, string?][] = [
    [0, "palette", k["sideBar.foreground"], undefined, "aberta"],
    [1, "cadenza.yaml", k["gitDecoration.modifiedResourceForeground"], "M"],
    [0, "src", k["sideBar.foreground"], undefined, "aberta"],
    [1, "generators", k["sideBar.foreground"], undefined, "fechada"],
    [1, "Encore.tsx", k["list.activeSelectionForeground"]],
    [1, "kitty.ts", k["gitDecoration.untrackedResourceForeground"], "U"],
    [1, "palette.ts", k["sideBar.foreground"]],
    [0, "extras", k["gitDecoration.addedResourceForeground"], "A", "fechada"],
    [0, "node_modules", k["gitDecoration.ignoredResourceForeground"], undefined, "fechada"],
    [0, "package.json", k["sideBar.foreground"]],
    [0, "README.md", k["gitDecoration.modifiedResourceForeground"], "M"],
  ];
  arvore.forEach(([indent, nome, cor, marca, pasta], i) => {
    const y = TITULO + 66 + i * 24;
    const x = ACT + 26 + indent * 14;
    if (nome === "Encore.tsx") rect(ACT, y, SIDE - 1, 24, k["list.activeSelectionBackground"]);
    if (pasta) chevron(x - 13, y + 16, pasta === "aberta", k["icon.foreground"]);
    texto(x, y + 16, esc(nome), cor, 12.5);
    if (marca) texto(xEd - 18, y + 16, marca, cor, 11, SANS, 'text-anchor="end"');
  });

  // Abas: sem divisórias, a ativa sublinhada com o accent
  rect(xEd, TITULO + 1, W - xEd, ABAS - 1, k["editorGroupHeader.tabsBackground"]);
  linhaH(xEd, W, TITULO + ABAS - 1, k["editorGroupHeader.tabsBorder"]);
  const abas: [string, boolean, boolean][] = [
    ["Encore.tsx", true, false],
    ["cadenza.yaml", false, true],
    ["kitty.conf", false, false],
  ];
  let xAba = xEd;
  for (const [nome, ativa, modificada] of abas) {
    const w = 30 + nome.length * 7.4;
    rect(xAba, TITULO + 1, w, ABAS - 2, ativa ? k["tab.activeBackground"] : k["tab.inactiveBackground"]);
    texto(xAba + 16, TITULO + 23, nome, ativa ? k["tab.activeForeground"] : k["tab.inactiveForeground"], 12.5);
    if (ativa) rect(xAba, TITULO + ABAS - 2, w, 2, k["tab.activeBorder"]);
    if (modificada) add(`<circle cx="${xAba + w - 8}" cy="${TITULO + 18}" r="3.5" fill="${k["tab.activeModifiedBorder"]}"/>`);
    xAba += w;
  }
  texto(xEd + 16, TITULO + ABAS + 16, "src  ›  components  ›  Encore.tsx  ›  Encore", k["breadcrumb.foreground"], 11.5);

  // Editor
  const linhas = await codigo(p, tema, "preview.tsx");
  const LH = 19.4, TAM = 13, CW = TAM * 0.6;
  const xNum = xEd + 44, xCod = xEd + 64;
  const atual = 14; // linha do cursor (1-based)
  const yLinha = (n: number) => yEd + 14 + (n - 1) * LH;
  const visiveis = Math.floor((yPainel - yEd - 14) / LH);
  rect(xEd, yLinha(atual) - LH + 5, W - xEd, LH, k["editor.lineHighlightBackground"]);
  // Seleção em "className=\"stage\"" (linha 22): mede pela coluna
  const l22 = readFileSync(join(raiz, "tests", "fixtures", "preview.tsx"), "utf8").split(/\r?\n/)[21];
  const col = l22.indexOf("className");
  rect(xCod + col * CW, yLinha(22) - LH + 5, 'className="stage"'.length * CW, LH, k["editor.selectionBackground"]);
  // Guias de indentação
  for (const [ini, fim, ind] of [[13, 27, 1], [17, 18, 2], [22, 26, 2], [23, 25, 3]] as const) {
    if (ini > visiveis) continue;
    const cor = ind === 1 ? k["editorIndentGuide.activeBackground1"] : k["editorIndentGuide.background1"];
    linhaV(xCod + ind * 2 * CW - 2 * CW + 2, yLinha(ini) - LH + 6, yLinha(Math.min(fim, visiveis)) + 5, cor);
  }
  linhas.slice(0, visiveis).forEach((spans, i) => {
    const n = i + 1;
    const corNum = n === atual ? k["editorLineNumber.activeForeground"] : k["editorLineNumber.foreground"];
    texto(xNum, yLinha(n), String(n), corNum, 12, MONO, 'text-anchor="end"');
    add(`<text x="${xCod}" y="${yLinha(n)}" font-family="${MONO}" font-size="${TAM}" xml:space="preserve">${spans}</text>`);
  });
  // Cursor depois de "const next" na linha 14
  const l14 = readFileSync(join(raiz, "tests", "fixtures", "preview.tsx"), "utf8").split(/\r?\n/)[13];
  rect(xCod + (l14.indexOf("next") + 4) * CW, yLinha(atual) - LH + 7, 2, LH - 4, k["editorCursor.foreground"]);
  // Squiggle de aviso sob "Track" na linha 3
  const l3 = readFileSync(join(raiz, "tests", "fixtures", "preview.tsx"), "utf8").split(/\r?\n/)[2];
  const x0 = xCod + l3.indexOf("Track") * CW, yS = yLinha(3) + 4;
  const onda = Array.from({ length: 10 }, (_, i) => `${x0 + i * 4} ${yS + (i % 2 ? 2 : 0)}`).join(" L ");
  add(`<path d="M ${onda}" stroke="${k["editorWarning.foreground"]}" stroke-width="1.2" fill="none"/>`);

  // Painel (terminal)
  rect(xEd, yPainel, W - xEd, PAINEL, k["panel.background"]);
  linhaH(xEd, W, yPainel, k["panel.border"]);
  const titulos = ["PROBLEMS", "OUTPUT", "TERMINAL"];
  let xt = xEd + 18;
  titulos.forEach((t) => {
    const ativo = t === "TERMINAL";
    texto(xt, yPainel + 22, t, ativo ? k["panelTitle.activeForeground"] : k["panelTitle.inactiveForeground"], 11, SANS, 'letter-spacing="0.5"');
    if (ativo) rect(xt, yPainel + 30, t.length * 7.6, 1.5, k["panelTitle.activeBorder"]);
    xt += t.length * 7.6 + 24;
  });
  const T = (partes: [string, string, string?][]) =>
    partes.map(([s, cor, peso]) => `<tspan fill="${cor}"${peso ? ` font-weight="${peso}"` : ""}>${esc(s)}</tspan>`).join("");
  const prompt: [string, string, string?][] = [
    ["~/dev/cadenza", ansi("blue"), "600"], [" main", ansi("magenta")], ["*", ansi("yellow")], [" › ", ansi("green")],
  ];
  const term: [string, string, string?][][] = [
    [...prompt, ["git status -s", k["terminal.foreground"]]],
    [["M ", ansi("green")], [" palette/cadenza.yaml", k["terminal.foreground"]]],
    [[" M", ansi("red")], [" README.md", k["terminal.foreground"]]],
    [["??", ansi("red")], [" src/generators/kitty.ts", k["terminal.foreground"]]],
    [...prompt, ["npm run check", k["terminal.foreground"]]],
    [["✔ ", ansi("green")], ["Contraste e unicidade ANSI dentro dos alvos", k["terminal.foreground"]], [" (2 paletas)", ansiBright(p, "black")]],
    [["! ", ansi("yellow")], ["seleção: comentário a 4.09:1", k["terminal.foreground"]], [" · info: ", ansiBright(p, "black")], ["docs/README", ansi("cyan")]],
  ];
  const yT0 = yPainel + 54;
  term.forEach((l, i) =>
    add(`<text x="${xEd + 18}" y="${yT0 + i * 18}" font-family="${MONO}" font-size="12.5" xml:space="preserve">${T(l)}</text>`)
  );
  // Linha dos 16 ANSI
  const ORDEM = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];
  const yA = yT0 + term.length * 18 - 8;
  ORDEM.forEach((s, i) => {
    rect(xEd + 18 + i * 30, yA, 26, 10, ansi(s), 'rx="2"');
    rect(xEd + 18 + i * 30, yA + 12, 26, 10, ansiBright(p, s), 'rx="2"');
  });
  rect(xEd + 18, yA + 30, 7.5, 15, k["terminalCursor.foreground"]);

  // Status bar
  const yS0 = H - STATUS;
  rect(0, yS0, W, STATUS, k["statusBar.background"]);
  linhaH(0, W, yS0, k["statusBar.border"]);
  rect(0, yS0 + 1, 34, STATUS - 1, k["statusBarItem.remoteBackground"]);
  add(`<path d="M 12 ${yS0 + 8} l -4 4.5 l 4 4.5 M 22 ${yS0 + 8} l 4 4.5 l -4 4.5" stroke="${k["statusBarItem.remoteForeground"]}" stroke-width="1.6" fill="none"/>`);
  texto(46, yS0 + 16, "main*     × 0    ! 1", k["statusBar.foreground"], 11.5);
  texto(W - 14, yS0 + 16, "Ln 14, Col 15    Spaces: 2    UTF-8    LF    TypeScript JSX", k["statusBar.foreground"], 11.5, SANS, 'text-anchor="end"');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${partes.join("\n")}
</svg>
`;
}

async function main(): Promise<void> {
  const fontFiles = [
    ...["Regular", "Italic", "Medium", "SemiBold"].map((v) => join(FONTES, "geist-mono", `GeistMono-${v}.ttf`)),
    ...["Regular", "Medium", "SemiBold", "Bold"].map((v) => join(FONTES, "geist-sans", `Geist-${v}.ttf`)),
  ];
  mkdirSync(join(raiz, "assets"), { recursive: true });
  for (const { p } of loadAllPalettes(join(raiz, "palette"))) {
    const svg = await janela(p);
    const png = new Resvg(svg, {
      fitTo: { mode: "width", value: W * 2 },
      font: { fontFiles, loadSystemFonts: true, defaultFontFamily: SANS },
    })
      .render()
      .asPng();
    const out = join(raiz, "assets", `preview-${p.meta.slug}.png`);
    writeFileSync(out, png);
    console.log(`✔ Preview: ${out}`);
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
