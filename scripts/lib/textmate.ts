// ============================================================
// Infra de tokenização compartilhada por check_tokens.ts (gate) e
// preview.ts (screenshots): o MESMO motor do VS Code (vscode-textmate +
// vscode-oniguruma) sobre as gramáticas vendorizadas em tests/grammars/.
// ============================================================

import { join } from "node:path";
import { readFileSync } from "node:fs";
import * as vsctm from "vscode-textmate";
import * as oniguruma from "vscode-oniguruma";

export { vsctm };

const raiz = join(import.meta.dirname, "..", "..");

export const GRAMATICAS: Record<string, string> = {
  "source.css": "css.tmLanguage.json",
  "source.css.less": "less.tmLanguage.json",
  "source.css.scss": "scss.tmLanguage.json",
  "text.html.basic": "html.tmLanguage.json",
  "text.html.derivative": "html-derivative.tmLanguage.json",
  "source.tsx": "TypeScriptReact.tmLanguage.json",
};

export const ESCOPO_POR_EXTENSAO: Record<string, string> = {
  css: "source.css",
  less: "source.css.less",
  scss: "source.css.scss",
  html: "text.html.derivative",
  tsx: "source.tsx",
};

// Máscaras de metadata do vscode-textmate (MetadataConsts). O itálico é o
// bit 1 do fontStyle.
const FONT_STYLE_MASK = 0b00000000_00000000_01111000_00000000;
const FONT_STYLE_OFFSET = 11;
const FOREGROUND_MASK = 0b00000000_11111111_10000000_00000000;
const FOREGROUND_OFFSET = 15;
const ITALICO = 1;

// O WASM do oniguruma só pode ser inicializado uma vez por processo — o
// registry, porém, é um por paleta (setTheme muda o colorMap inteiro).
let wasmCarregado = false;

export async function criaRegistry(): Promise<vsctm.Registry> {
  if (!wasmCarregado) {
    const wasm = readFileSync(join(raiz, "node_modules", "vscode-oniguruma", "release", "onig.wasm"));
    await oniguruma.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
    wasmCarregado = true;
  }
  return new vsctm.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (padroes) => new oniguruma.OnigScanner(padroes),
      createOnigString: (s) => new oniguruma.OnigString(s),
    }),
    loadGrammar: async (scopeName) => {
      const arquivo = GRAMATICAS[scopeName];
      if (!arquivo) return null; // linguagens embutidas que não testamos (js em <script> etc.)
      const caminho = join(raiz, "tests", "grammars", arquivo);
      return vsctm.parseRawGrammar(readFileSync(caminho, "utf8"), caminho);
    },
  });
}

export interface TokenPintado {
  inicio: number;
  fim: number;
  cor: string;      // hex minúsculo resolvido pelo tema
  italico: boolean;
  escopos: string[]; // para diagnóstico quando o caso falha
}

/** Tokeniza um fixture inteiro e devolve, por linha, os tokens já pintados. */
export function tokenizaArquivo(
  registry: vsctm.Registry,
  grammar: vsctm.IGrammar,
  linhas: string[]
): TokenPintado[][] {
  const mapaCores = registry.getColorMap();
  const resultado: TokenPintado[][] = [];
  let pilha = vsctm.INITIAL;      // para tokenizeLine2 (metadata: cor/estilo)
  let pilhaEscopos = vsctm.INITIAL; // para tokenizeLine (escopos legíveis)
  for (const linha of linhas) {
    const bin = grammar.tokenizeLine2(linha, pilha);
    const leg = grammar.tokenizeLine(linha, pilhaEscopos);
    pilha = bin.ruleStack;
    pilhaEscopos = leg.ruleStack;

    const tokens: TokenPintado[] = [];
    // tokens binários vêm em pares (startIndex, metadata)
    for (let i = 0; i < bin.tokens.length; i += 2) {
      const inicio = bin.tokens[i];
      const metadata = bin.tokens[i + 1];
      const fim = i + 2 < bin.tokens.length ? bin.tokens[i + 2] : linha.length;
      const idCor = (metadata & FOREGROUND_MASK) >>> FOREGROUND_OFFSET;
      const fontStyle = (metadata & FONT_STYLE_MASK) >>> FONT_STYLE_OFFSET;
      const legivel = leg.tokens.find((t) => t.startIndex <= inicio && inicio < t.endIndex);
      tokens.push({
        inicio,
        fim,
        cor: (mapaCores[idCor] ?? "").toLowerCase(),
        italico: (fontStyle & ITALICO) !== 0,
        escopos: legivel?.scopes ?? [],
      });
    }
    resultado.push(tokens);
  }
  return resultado;
}
