// ============================================================
// Valida a TOKENIZAÇÃO real do tema. Falha (exit 1) se um token
// de um fixture resolver para cor ou fontStyle errados.
//
// É o "Developer: Inspect Editor Tokens and Scopes" automatizado:
// usa o MESMO motor do VS Code (vscode-textmate + vscode-oniguruma)
// e as gramáticas publicadas (tests/grammars/, vendidas do repositório
// microsoft/vscode), então o que passa aqui é o que o editor pinta.
//
// O que este check protege:
//   - o itálico restrito a comentário / parâmetro / atributo HTML —
//     inclusive a regra de exceção para seletores CSS/LESS/SCSS, cujo
//     vazamento (todo seletor .less em itálico) já aconteceu uma vez;
//   - o trio tag / attribute / componente em HTML e JSX, que é onde
//     as decisões de cor mais disputadas do tema se encontram.
//
// O tema é gerado EM MEMÓRIA a partir do YAML (não lê themes/*.json),
// então o check não depende da ordem build/check.
// ============================================================

import { join } from "node:path";
import { readFileSync } from "node:fs";
import { vsctm, criaRegistry, tokenizaArquivo, pintaEscopos, ESCOPO_POR_EXTENSAO, TokenPintado } from "./lib/textmate";
import { PaletteFile, loadAllPalettes } from "../src/lib/palette";
import { generateVscodeTheme } from "../src/generators/vscode";

const raiz = join(import.meta.dirname, "..");

// ------------------------------------------------------------
// Casos: cada linha diz "este trecho deste fixture sai nesta cor,
// com ou sem itálico". A cor é um role de roles.syntax (ou um token
// da palette, para punctuation de tag etc.) — nunca hex solto.
// A âncora é o PRIMEIRO caractere da primeira ocorrência do trecho
// na linha indicada.
// ------------------------------------------------------------
interface Caso {
  arquivo: string;
  linha: number;      // 1-based
  trecho: string;
  role: string;       // chave de roles.syntax
  italico: boolean;
}

const casos: Caso[] = [
  // CSS — seletores NÃO herdam o itálico de atributo HTML
  { arquivo: "sample.css", linha: 1, trecho: "comentário", role: "comment", italico: true },
  { arquivo: "sample.css", linha: 2, trecho: "cartao", role: "type", italico: false },
  { arquivo: "sample.css", linha: 2, trecho: "hover", role: "type", italico: false },
  { arquivo: "sample.css", linha: 2, trecho: "after", role: "type", italico: false },
  { arquivo: "sample.css", linha: 2, trecho: "color", role: "variable", italico: false },
  { arquivo: "sample.css", linha: 3, trecho: "principal", role: "type", italico: false },

  // LESS — o vazamento corrigido: escopos .less não eram cobertos
  { arquivo: "sample.less", linha: 1, trecho: "comentário", role: "comment", italico: true },
  { arquivo: "sample.less", linha: 2, trecho: "botao", role: "type", italico: false },
  { arquivo: "sample.less", linha: 3, trecho: "topo", role: "type", italico: false },
  { arquivo: "sample.less", linha: 3, trecho: "hover", role: "type", italico: false },
  { arquivo: "sample.less", linha: 5, trecho: "__titulo", role: "type", italico: false },
  { arquivo: "sample.less", linha: 6, trecho: "extend", role: "type", italico: false },

  // SCSS — %placeholder e o sufixo &__elem do BEM
  { arquivo: "sample.scss", linha: 1, trecho: "comentário", role: "comment", italico: true },
  { arquivo: "sample.scss", linha: 2, trecho: "base", role: "type", italico: false },
  { arquivo: "sample.scss", linha: 3, trecho: "cartao", role: "type", italico: false },
  // A gramática SCSS marca o identificador do sufixo `&__elem` inteiro como
  // punctuation.definition.entity.css (dentro do escopo de parent-selector-
  // suffix), então a cor final é a de pontuação — diferente do LESS, que dá
  // ember. O que este caso trava é o ITÁLICO: antes do fix o sufixo herdava
  // o itálico de atributo HTML mesmo saindo em fg1.
  { arquivo: "sample.scss", linha: 4, trecho: "__titulo", role: "punctuation", italico: false },
  { arquivo: "sample.scss", linha: 5, trecho: "hover", role: "type", italico: false },

  // HTML — aqui o itálico de atributo É desejado
  { arquivo: "sample.html", linha: 1, trecho: "comentário", role: "comment", italico: true },
  { arquivo: "sample.html", linha: 2, trecho: "div", role: "tag", italico: false },
  { arquivo: "sample.html", linha: 2, trecho: "<", role: "punctuation", italico: false },
  { arquivo: "sample.html", linha: 2, trecho: "class", role: "attribute", italico: true },
  { arquivo: "sample.html", linha: 2, trecho: "cartao", role: "string", italico: false },
  { arquivo: "sample.html", linha: 3, trecho: "a href", role: "tag", italico: false },
  { arquivo: "sample.html", linha: 3, trecho: "href", role: "attribute", italico: true },

  // TSX — o trio tag × atributo × componente do JSX
  { arquivo: "sample.tsx", linha: 1, trecho: "comentário", role: "comment", italico: true },
  { arquivo: "sample.tsx", linha: 2, trecho: "import", role: "storage", italico: false },
  { arquivo: "sample.tsx", linha: 4, trecho: "export", role: "storage", italico: false },
  { arquivo: "sample.tsx", linha: 4, trecho: "function", role: "storage", italico: false },
  { arquivo: "sample.tsx", linha: 4, trecho: "Cartao", role: "function", italico: false },
  { arquivo: "sample.tsx", linha: 5, trecho: "const", role: "storage", italico: false },
  // const declara variável comum, não constante: fica em fg0
  { arquivo: "sample.tsx", linha: 5, trecho: "rotulo", role: "variable", italico: false },
  { arquivo: "sample.tsx", linha: 4, trecho: "props", role: "parameter", italico: true },
  { arquivo: "sample.tsx", linha: 4, trecho: "CartaoProps", role: "type", italico: false },
  { arquivo: "sample.tsx", linha: 5, trecho: "Item:", role: "string", italico: false },
  { arquivo: "sample.tsx", linha: 5, trecho: "${", role: "interpolation", italico: false },
  { arquivo: "sample.tsx", linha: 6, trecho: "return", role: "keyword", italico: false },
  { arquivo: "sample.tsx", linha: 7, trecho: "<", role: "punctuation", italico: false },
  { arquivo: "sample.tsx", linha: 7, trecho: "section", role: "tag", italico: false },
  { arquivo: "sample.tsx", linha: 7, trecho: "className", role: "attribute", italico: true },
  { arquivo: "sample.tsx", linha: 8, trecho: "Botao", role: "type", italico: false },
  { arquivo: "sample.tsx", linha: 8, trecho: "onClick", role: "attribute", italico: true },

  // ----------------------------------------------------------
  // Linguagens de programação. O princípio que estes casos guardam:
  // scarlet = fluxo de controle; o resto das palavras reservadas
  // (declaração, modificador, módulo) = cinza de storage; self/this =
  // cinza itálico; metaprogramação (decorator, anotação, atributo,
  // macro de C) = orquídea.
  // ----------------------------------------------------------

  // Rust
  { arquivo: "sample.rs", linha: 2, trecho: "use", role: "storage", italico: false },
  { arquivo: "sample.rs", linha: 6, trecho: "#", role: "decorator", italico: false },
  { arquivo: "sample.rs", linha: 6, trecho: "derive", role: "decorator", italico: false },
  { arquivo: "sample.rs", linha: 6, trecho: "Debug", role: "type", italico: false },
  { arquivo: "sample.rs", linha: 7, trecho: "'a", role: "type", italico: true },
  { arquivo: "sample.rs", linha: 9, trecho: "u32", role: "type", italico: false },
  { arquivo: "sample.rs", linha: 14, trecho: "MAX_TRACKS", role: "constant", italico: false },
  { arquivo: "sample.rs", linha: 17, trecho: "fn", role: "storage", italico: false },
  { arquivo: "sample.rs", linha: 17, trecho: "self", role: "builtin", italico: true },
  { arquivo: "sample.rs", linha: 18, trecho: "{}", role: "interpolation", italico: false },
  { arquivo: "sample.rs", linha: 22, trecho: "pub", role: "storage", italico: false },
  { arquivo: "sample.rs", linha: 24, trecho: "for", role: "keyword", italico: false },
  { arquivo: "sample.rs", linha: 25, trecho: "break", role: "keyword", italico: false },
  { arquivo: "sample.rs", linha: 29, trecho: "match", role: "keyword", italico: false },
  { arquivo: "sample.rs", linha: 35, trecho: "async", role: "storage", italico: false },
  { arquivo: "sample.rs", linha: 37, trecho: "{label}", role: "interpolation", italico: false },
  // o ponto de 3.5 é parte do número, não pontuação
  { arquivo: "sample.rs", linha: 37, trecho: ".5", role: "number", italico: false },

  // Java
  { arquivo: "Sample.java", linha: 1, trecho: "package", role: "storage", italico: false },
  { arquivo: "Sample.java", linha: 3, trecho: "import", role: "storage", italico: false },
  { arquivo: "Sample.java", linha: 8, trecho: "@param", role: "doctag", italico: true },
  { arquivo: "Sample.java", linha: 8, trecho: "<T>", role: "doctag", italico: true },
  { arquivo: "Sample.java", linha: 10, trecho: "@FunctionalInterface", role: "decorator", italico: false },
  { arquivo: "Sample.java", linha: 13, trecho: "public", role: "storage", italico: false },
  { arquivo: "Sample.java", linha: 13, trecho: "Encore", role: "type", italico: false },
  { arquivo: "Sample.java", linha: 14, trecho: "int", role: "type", italico: false },
  { arquivo: "Sample.java", linha: 19, trecho: "this", role: "builtin", italico: true },
  { arquivo: "Sample.java", linha: 22, trecho: "@Override", role: "decorator", italico: false },
  { arquivo: "Sample.java", linha: 25, trecho: "throw", role: "keyword", italico: false },
  { arquivo: "Sample.java", linha: 25, trecho: "new", role: "storage", italico: false },
  { arquivo: "Sample.java", linha: 32, trecho: "?", role: "operator", italico: false },

  // C
  { arquivo: "sample.c", linha: 1, trecho: "include", role: "storage", italico: false },
  { arquivo: "sample.c", linha: 4, trecho: "MAX_TRACKS", role: "constant", italico: false },
  { arquivo: "sample.c", linha: 7, trecho: "typedef", role: "storage", italico: false },
  { arquivo: "sample.c", linha: 8, trecho: "char", role: "type", italico: false },
  { arquivo: "sample.c", linha: 16, trecho: "for", role: "keyword", italico: false },
  // compilação condicional é fluxo de controle; #include/#define não
  { arquivo: "sample.c", linha: 20, trecho: "ifdef", role: "keyword", italico: false },

  // C++
  { arquivo: "sample.cpp", linha: 4, trecho: "namespace", role: "storage", italico: false },
  { arquivo: "sample.cpp", linha: 7, trecho: "concept", role: "storage", italico: false },
  { arquivo: "sample.cpp", linha: 7, trecho: "requires", role: "storage", italico: false },
  { arquivo: "sample.cpp", linha: 11, trecho: "std", role: "namespace", italico: false },
  { arquivo: "sample.cpp", linha: 12, trecho: "default", role: "storage", italico: false },
  { arquivo: "sample.cpp", linha: 14, trecho: "nodiscard", role: "decorator", italico: false },
  { arquivo: "sample.cpp", linha: 14, trecho: "auto", role: "type", italico: false },
  { arquivo: "sample.cpp", linha: 15, trecho: "return", role: "keyword", italico: false },

  // C# — o TextMate segue o que o Roslyn faz quando carrega: tudo que não
  // é palavra de controle (inclusive int, null) é keyword.cs → cinza
  { arquivo: "Sample.cs", linha: 1, trecho: "using", role: "storage", italico: false },
  { arquivo: "Sample.cs", linha: 6, trecho: "summary", role: "doctag", italico: true },
  { arquivo: "Sample.cs", linha: 10, trecho: "int", role: "storage", italico: false },
  { arquivo: "Sample.cs", linha: 19, trecho: "{Round", role: "interpolation", italico: false },
  { arquivo: "Sample.cs", linha: 21, trecho: "foreach", role: "keyword", italico: false },
  { arquivo: "Sample.cs", linha: 21, trecho: "in _setlist", role: "keyword", italico: false },
  { arquivo: "Sample.cs", linha: 23, trecho: "null", role: "storage", italico: false },
  { arquivo: "Sample.cs", linha: 24, trecho: "await", role: "keyword", italico: false },

  // Python
  { arquivo: "sample.py", linha: 2, trecho: "from", role: "storage", italico: false },
  { arquivo: "sample.py", linha: 8, trecho: "MAX_ENCORES", role: "constant", italico: false },
  { arquivo: "sample.py", linha: 9, trecho: "?P<title>", role: "variable", italico: false },
  { arquivo: "sample.py", linha: 12, trecho: "@dataclass", role: "decorator", italico: false },
  // o MagicPython marca o nome chamado como meta.function-call.generic
  { arquivo: "sample.py", linha: 16, trecho: "field", role: "function", italico: false },
  { arquivo: "sample.py", linha: 18, trecho: "def", role: "storage", italico: false },
  { arquivo: "sample.py", linha: 18, trecho: "self", role: "builtin", italico: true },
  { arquivo: "sample.py", linha: 19, trecho: "f\"", role: "string", italico: false },
  { arquivo: "sample.py", linha: 19, trecho: ":.0f", role: "interpolation", italico: false },
  { arquivo: "sample.py", linha: 24, trecho: "self", role: "builtin", italico: true },
  { arquivo: "sample.py", linha: 27, trecho: "@property", role: "decorator", italico: false },
  { arquivo: "sample.py", linha: 38, trecho: "await", role: "keyword", italico: false },

  // TypeScript
  { arquivo: "sample.ts", linha: 1, trecho: "import", role: "storage", italico: false },
  { arquivo: "sample.ts", linha: 1, trecho: "from", role: "storage", italico: false },
  { arquivo: "sample.ts", linha: 4, trecho: "MAX_ENCORES", role: "variable", italico: false },
  { arquivo: "sample.ts", linha: 4, trecho: "as", role: "storage", italico: false },
  { arquivo: "sample.ts", linha: 10, trecho: "@", role: "decorator", italico: false },
  { arquivo: "sample.ts", linha: 10, trecho: "sealed", role: "decorator", italico: false },
  { arquivo: "sample.ts", linha: 20, trecho: "this", role: "builtin", italico: true },
  { arquivo: "sample.ts", linha: 25, trecho: "hint", role: "doctag", italico: true },
  { arquivo: "sample.ts", linha: 29, trecho: "await", role: "keyword", italico: false },
  { arquivo: "sample.ts", linha: 30, trecho: "^", role: "regexp", italico: false },
  { arquivo: "sample.ts", linha: 30, trecho: "u;", role: "regexp", italico: false },
  { arquivo: "sample.ts", linha: 35, trecho: "*", role: "storage", italico: false },
];


// ------------------------------------------------------------
// Tokens SEMÂNTICOS. Com o servidor de linguagem ativo, o VS Code pinta
// por cima do TextMate seguindo esta cadeia (colorThemeData.getTokenStyle):
//   1. regras de semanticTokenColors do tema — pontuação do seletor:
//      +100 pelo tipo, +100 por modificador, +10 pela linguagem; empate
//      vai para a regra definida por ÚLTIMO;
//   2. propriedade que o tema não definiu (cor, itálico, sublinhado) vem
//      do semanticTokenScopes da extensão: um escopo TextMate avulso,
//      resolvido contra as tokenColors do tema SEM ancestrais.
// Os escopos de fallback abaixo foram copiados do package.json de cada
// extensão (rust-analyzer, vscode-csharp, vscode-java, vscode-cpptools)
// ou do registro padrão do VS Code; Pylance não publica o seu, então os
// casos dele dependem só de regras do tema.
// ------------------------------------------------------------
interface CasoSemantico {
  origem: string;          // servidor + exemplo de código
  token: string;           // tipo[.modificador]* como o servidor emite
  linguagem: string;
  fallback: string[];      // escopos de semanticTokenScopes, em ordem de pontuação
  role: string;
  italico: boolean;
  sublinhado?: boolean;
}

const casosSemanticos: CasoSemantico[] = [
  // rust-analyzer
  { origem: "rust-analyzer: fn, let, pub, use, impl", token: "keyword", linguagem: "rust",
    fallback: ["keyword.other.rust"], role: "storage", italico: false },
  { origem: "rust-analyzer: if, for, in, match, return", token: "keyword.controlFlow", linguagem: "rust",
    fallback: ["keyword.control.rust", "keyword.other.rust"], role: "keyword", italico: false },
  { origem: "rust-analyzer: self", token: "selfKeyword", linguagem: "rust",
    fallback: [], role: "builtin", italico: true },
  { origem: "rust-analyzer: 'a", token: "lifetime", linguagem: "rust",
    fallback: ["storage.modifier.lifetime.rust"], role: "type", italico: true },
  { origem: "rust-analyzer: #[derive]", token: "builtinAttribute", linguagem: "rust",
    fallback: ["meta.attribute.rust"], role: "decorator", italico: false },
  { origem: "rust-analyzer: println", token: "macro", linguagem: "rust",
    fallback: ["entity.name.function.preprocessor"], role: "function", italico: false },
  { origem: "rust-analyzer: {} em format!", token: "formatSpecifier", linguagem: "rust",
    fallback: ["punctuation.section.embedded.rust"], role: "interpolation", italico: false },
  { origem: "rust-analyzer: const MAX", token: "const", linguagem: "rust",
    fallback: [], role: "constant", italico: false },
  { origem: "rust-analyzer: let mut x", token: "variable.mutable", linguagem: "rust",
    fallback: ["variable.other.rust", "markup.underline"], role: "variable", italico: false, sublinhado: true },
  { origem: "rust-analyzer: Some, None", token: "enumMember", linguagem: "rust",
    fallback: [], role: "constant", italico: false },

  // C# (Roslyn)
  { origem: "Roslyn: public, int, var, true, null, this", token: "keyword", linguagem: "csharp",
    fallback: ["keyword.cs"], role: "storage", italico: false },
  { origem: "Roslyn: if, foreach, in, return, await", token: "controlKeyword", linguagem: "csharp",
    fallback: ["keyword.control.cs"], role: "keyword", italico: false },
  { origem: "Roslyn: const MaxEncores", token: "constant", linguagem: "csharp",
    fallback: ["variable.other.constant"], role: "constant", italico: false },
  { origem: "Roslyn: <summary>", token: "xmlDocCommentName", linguagem: "csharp",
    fallback: ["comment.documentation.name.cs"], role: "doctag", italico: true },
  { origem: "Roslyn: código em #if desligado", token: "excludedCode", linguagem: "csharp",
    fallback: ["support.other.excluded.cs"], role: "comment", italico: false },
  { origem: "Roslyn: ^ em Regex", token: "regexAnchor", linguagem: "csharp",
    fallback: ["keyword.control.anchor.regexp.cs"], role: "regexp", italico: false },

  // Java (jdt.ls)
  { origem: "jdt.ls: @Override", token: "annotation", linguagem: "java",
    fallback: ["storage.type.annotation.java"], role: "decorator", italico: false },
  { origem: "jdt.ls: public, static, final", token: "modifier", linguagem: "java",
    fallback: ["storage.modifier.java"], role: "storage", italico: false },
  { origem: "jdt.ls: static final MAX", token: "property.static.readonly", linguagem: "java",
    fallback: ["variable.other.constant.property"], role: "constant", italico: false },
  { origem: "jdt.ls: final var local", token: "variable.readonly", linguagem: "java",
    fallback: ["variable.other.constant"], role: "variable", italico: false },
  { origem: "jdt.ls: @param no Javadoc", token: "keyword.documentation", linguagem: "java",
    fallback: ["keyword.other.documentation.javadoc.java"], role: "doctag", italico: true },

  // C/C++ (cpptools e clangd)
  { origem: "cpptools/clangd: #define MAX", token: "macro", linguagem: "cpp",
    fallback: ["entity.name.function.preprocessor.cpp"], role: "constant", italico: false },
  { origem: "cpptools: struct track", token: "struct", linguagem: "c",
    fallback: ["storage.type.struct.c"], role: "type", italico: false },
  { origem: "clangd: const auto x (local)", token: "variable.readonly", linguagem: "cpp",
    fallback: ["variable.other.constant"], role: "variable", italico: false },
  { origem: "cpptools: const global", token: "variable.readonly.global", linguagem: "cpp",
    fallback: ["variable.other.constant.cpp"], role: "constant", italico: false },
  { origem: "clangd: static constexpr membro", token: "property.static.readonly", linguagem: "cpp",
    fallback: ["variable.other.constant.property"], role: "constant", italico: false },
  { origem: "cpptools: std::vector<T>", token: "templateType", linguagem: "cpp",
    fallback: ["entity.name.type.class.templated.cpp"], role: "type", italico: false },

  // Python (Pylance)
  { origem: "Pylance: self", token: "selfParameter", linguagem: "python",
    fallback: [], role: "builtin", italico: true },
  { origem: "Pylance: cls", token: "clsParameter", linguagem: "python",
    fallback: [], role: "builtin", italico: true },
  { origem: "Pylance: import re", token: "module", linguagem: "python",
    fallback: [], role: "namespace", italico: false },
  { origem: "Pylance: @dataclass", token: "function.decorator", linguagem: "python",
    fallback: ["entity.name.function"], role: "decorator", italico: false },
  { origem: "Pylance: @property", token: "class.decorator", linguagem: "python",
    fallback: ["entity.name.type.class"], role: "decorator", italico: false },
  { origem: "Pylance: MAX: Final = 3", token: "variable.readonly", linguagem: "python",
    fallback: ["variable.other.constant"], role: "constant", italico: false },

  // TypeScript (servidor embutido)
  { origem: "TS: const x = …", token: "variable.readonly", linguagem: "typescript",
    fallback: ["variable.other.constant"], role: "variable", italico: false },
  { origem: "TS: static readonly X", token: "property.readonly.static", linguagem: "typescript",
    fallback: ["variable.other.constant.property"], role: "constant", italico: false },
  { origem: "TS: console", token: "variable.defaultLibrary", linguagem: "typescript",
    fallback: ["support.variable"], role: "builtin", italico: true },
  { origem: "TS: Cue.Start", token: "enumMember", linguagem: "typescript",
    fallback: ["variable.other.enummember"], role: "constant", italico: false },
];

type EstiloSemantico = { foreground?: string; italic?: boolean; underline?: boolean };

/** Pontuação de um seletor de semanticTokenColors, como o VS Code calcula. */
function pontua(seletor: string, tipo: string, mods: string[], linguagem: string): number {
  const [corpo, lang] = seletor.split(":");
  const [selTipo, ...selMods] = corpo.split(".");
  let score = 0;
  if (lang !== undefined) {
    if (lang !== linguagem) return -1;
    score += 10;
  }
  if (selTipo !== "*") {
    if (selTipo !== tipo) return -1;
    score += 100;
  }
  if (selMods.some((m) => !mods.includes(m))) return -1;
  return score + selMods.length * 100;
}

async function resolveSemantico(
  caso: CasoSemantico,
  regras: Record<string, string | EstiloSemantico>,
  registry: vsctm.Registry
): Promise<{ cor: string; italico: boolean; sublinhado: boolean }> {
  const [tipo, ...mods] = caso.token.split(".");
  const melhor: Record<string, { score: number; valor: unknown }> = {};
  for (const [seletor, valor] of Object.entries(regras)) {
    const score = pontua(seletor, tipo, mods, caso.linguagem);
    if (score < 0) continue;
    const estilo: EstiloSemantico = typeof valor === "string" ? { foreground: valor } : valor;
    for (const prop of ["foreground", "italic", "underline"] as const) {
      if (estilo[prop] === undefined) continue;
      if (!melhor[prop] || melhor[prop].score <= score) melhor[prop] = { score, valor: estilo[prop] };
    }
  }
  // Propriedades sem regra no tema: vêm dos escopos de fallback, em ordem.
  const sondas = caso.fallback.length ? await pintaEscopos(registry, caso.fallback) : [];
  const cor = (melhor.foreground?.valor as string | undefined) ?? sondas.find(Boolean)?.cor;
  const italico = (melhor.italic?.valor as boolean | undefined) ?? sondas.some((s) => s?.italico);
  const sublinhado = (melhor.underline?.valor as boolean | undefined) ?? sondas.some((s) => s?.sublinhado);
  return { cor: (cor ?? "?").toLowerCase(), italico, sublinhado };
}

// ------------------------------------------------------------
// Execução
// ------------------------------------------------------------
/** Roda todos os casos para uma paleta; devolve o número de falhas. */
async function rodaPaleta(p: PaletteFile): Promise<number> {
  const c = p.palette;
  const registry = await criaRegistry();

  // O tema entra no registry como o VS Code o entrega: tokenColors precedidos
  // do default (editor.foreground/background).
  const tema = generateVscodeTheme(p) as {
    colors: Record<string, string>;
    tokenColors: vsctm.IRawThemeSetting[];
  };
  registry.setTheme({
    name: p.meta.slug,
    settings: [
      {
        settings: {
          foreground: tema.colors["editor.foreground"],
          background: tema.colors["editor.background"],
        },
      },
      ...tema.tokenColors,
    ],
  });

  // Tokeniza cada fixture uma vez
  const porArquivo = new Map<string, TokenPintado[][]>();
  for (const arquivo of new Set(casos.map((k) => k.arquivo))) {
    const extensao = arquivo.split(".").pop()!;
    const grammar = await registry.loadGrammar(ESCOPO_POR_EXTENSAO[extensao]);
    if (!grammar) throw new Error(`gramática não carregou para ${arquivo}`);
    const linhas = readFileSync(join(raiz, "tests", "fixtures", arquivo), "utf8").split(/\r?\n/);
    porArquivo.set(arquivo, tokenizaArquivo(registry, grammar, linhas));
  }

  let falhas = 0;
  const diagnosticos: string[] = [];
  const linhasTabela: string[][] = [];

  for (const caso of casos) {
    const token = c[p.roles.syntax[caso.role]];
    const esperadoCor = token.toLowerCase();
    const rotulo = `${p.roles.syntax[caso.role]}/${caso.role}`;

    const linhas = readFileSync(join(raiz, "tests", "fixtures", caso.arquivo), "utf8").split(/\r?\n/);
    const idx = linhas[caso.linha - 1]?.indexOf(caso.trecho) ?? -1;
    let obtido = "— trecho não encontrado —";
    let ok = false;
    let escopos: string[] = [];

    if (idx >= 0) {
      const pintado = porArquivo
        .get(caso.arquivo)!
        [caso.linha - 1].find((t) => t.inicio <= idx && idx < t.fim);
      if (pintado) {
        obtido = `${pintado.cor}${pintado.italico ? " itálico" : ""}`;
        ok = pintado.cor === esperadoCor && pintado.italico === caso.italico;
        escopos = pintado.escopos;
      }
    }
    if (!ok) {
      falhas++;
      diagnosticos.push(
        `✘ ${caso.arquivo}:${caso.linha} "${caso.trecho}" — escopos: ${escopos.join(", ") || "?"}`
      );
    }
    linhasTabela.push([
      `${caso.arquivo}:${caso.linha}`,
      caso.trecho,
      `${esperadoCor}${caso.italico ? " itálico" : ""} (${rotulo})`,
      obtido,
      ok ? "✔" : "✘ DIVERGE",
    ]);
  }

  // Camada semântica
  const regras = (tema as unknown as { semanticTokenColors: Record<string, string | EstiloSemantico> })
    .semanticTokenColors;
  for (const caso of casosSemanticos) {
    const esperadoCor = c[p.roles.syntax[caso.role]].toLowerCase();
    const r = await resolveSemantico(caso, regras, registry);
    const ok =
      r.cor === esperadoCor && r.italico === caso.italico && r.sublinhado === Boolean(caso.sublinhado);
    const estilo = (cor: string, it: boolean, sub: boolean) =>
      `${cor}${it ? " itálico" : ""}${sub ? " sublinhado" : ""}`;
    if (!ok) {
      falhas++;
      diagnosticos.push(`✘ semântico ${caso.origem} (${caso.token}:${caso.linguagem})`);
    }
    linhasTabela.push([
      `sem:${caso.linguagem}`,
      caso.token,
      `${estilo(esperadoCor, caso.italico, Boolean(caso.sublinhado))} (${p.roles.syntax[caso.role]}/${caso.role})`,
      estilo(r.cor, r.italico, r.sublinhado),
      ok ? "✔" : "✘ DIVERGE",
    ]);
  }

  // Tabela alinhada, no formato do check_contrast
  const cab = ["onde", "trecho", "esperado", "obtido", "status"];
  const larguras = cab.map((h, i) => Math.max(h.length, ...linhasTabela.map((l) => l[i].length)));
  const fmt = (l: string[]) => l.map((cel, i) => cel.padEnd(larguras[i])).join("  ");
  console.log(`\n[${p.meta.name}] tokenização real contra as gramáticas do VS Code:\n`);
  console.log(fmt(cab));
  console.log(larguras.map((w) => "-".repeat(w)).join("  "));
  for (const l of linhasTabela) console.log(fmt(l));

  if (falhas > 0) {
    console.error(`\n[${p.meta.name}] escopos dos casos que falharam:`);
    for (const d of diagnosticos) console.error(d);
  }
  return falhas;
}

async function main(): Promise<void> {
  const paletas = loadAllPalettes(join(raiz, "palette"));
  let falhas = 0;
  for (const { p } of paletas) falhas += await rodaPaleta(p);

  if (falhas > 0) {
    console.error(`\n✘ ${falhas} caso(s) de tokenização divergem do esperado.`);
    process.exit(1);
  }
  console.log(`\n✔ ${casos.length} casos TextMate + ${casosSemanticos.length} semânticos × ${paletas.length} paleta(s) conferem com o tema.`);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
