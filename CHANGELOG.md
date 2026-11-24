# Changelog

Todas as mudanças relevantes do Cadenza ficam registradas aqui.
O projeto segue [Semantic Versioning](https://semver.org/).

## [0.2.0] — 2026-11-24

Revisão por linguagem: Rust, TypeScript, Python, Java, C#, C e C++, nas
gramáticas do VS Code e nos tokens semânticos dos servidores de linguagem.

### Changed

- **Scarlet só para fluxo de controle.** Imports e módulos (`import`, `export`,
  `use`, `using`, `package`, `#include`) passam para o cinza das declarações.
  Motivo: o rust-analyzer e o Roslyn só distinguem fluxo de controle do resto,
  então com o servidor ativo os imports já ficavam cinza nessas linguagens; agora
  é igual em todas.
- `self`, `this` e `cls` em cinza itálico (eram scarlet): aparecem em quase toda
  linha de Python e Rust e apagavam o sinal do fluxo de controle.
- Removida a regra semântica `keyword → scarlet`, que pintava de vermelho toda
  palavra reservada de Rust e C# (`fn`, `let`, `pub`, `public`, `int`, `true`…)
  quando o servidor de linguagem carregava.
- `readonly` deixa de significar constante: no TS (toda `const`), no Java
  (`final`) e no C++ (`const` local) volta a ser variável. Orquídea fica para
  constantes de verdade: estáticas, globais, de biblioteca, `Final` do Python.

### Fixed

- C#: `int`, `string`, `double` saíam em scarlet (`keyword.type.cs`); tags XML
  de `///` saíam em scarlet dentro do comentário; `await` saía cinza.
- Java: anotações (`@Override`) sem cor; `new` e o `?` do ternário em scarlet;
  `@param` em scarlet.
- C/C++: `#include`/`#define`, `typedef`, `concept`, `requires` e `= default` em
  scarlet; `std::` e `[[nodiscard]]` sem cor. `#if`/`#ifdef` continuam em
  scarlet (compilação condicional é fluxo de controle).
- Rust: `fn`, `impl`, `async` em scarlet; `u32`/`usize` cinza em algumas
  posições; ponto de `3.5` cinza no meio do número; `#[derive]` sem cor;
  `{}` de formatação sem a cor de interpolação.
- Python: `f`/`r` de string cinza; `:.0f` cinza; grupo nomeado de regex em
  scarlet; constantes em CAIXA ALTA sem cor; chamadas `field(...)` sem cor.
- TypeScript: `@decorator` com o nome sem cor; flag de regex (`/u`) cinza;
  âncoras de regex (`^`, `$`) em scarlet.

### Added

- Metaprogramação com uma cor (orquídea) em todas as linguagens: decorators,
  anotações, atributos de Rust e C++, macros de C/C++.
- Lifetimes do Rust em lilás itálico; variáveis `mut` sublinhadas (o escopo que
  o rust-analyzer usa para isso agora tem estilo).
- Tags de documentação (`@param`, `<summary>`, nomes no JSDoc) em `doctag`: um
  degrau acima do comentário.
- Regras semânticas para rust-analyzer, Roslyn, jdt.ls, clangd/cpptools e
  Pylance (`selfParameter`, `module`, `*.decorator`, `lifetime`, `macro`…).
- Gate: 76 casos novos de tokenização nas seis linguagens e 37 casos que
  simulam a cadeia semântica do VS Code (regras do tema → `semanticTokenScopes`
  de cada extensão). Gramáticas novas vendorizadas de `microsoft/vscode`.
- `assets/languages-*.png` (galeria por linguagem) e `npm run inspect`.

## [0.1.0] — 2026-11-24

Primeira versão.

### Added

- **Cadenza** (base): fundo quase preto com estrutura plana à la Vercel/Geist —
  editor e chrome no mesmo fundo, separados por bordas finas; três cinzas de
  texto; botão primário branco. Cinco matizes de sintaxe tirados da Astra Yao:
  scarlet (jaqueta), gold (microfone), jade (brincos), lilac (sombra do
  vestido) e orchid (medalhão). Scarlet restrito a controle de fluxo, tags,
  cursor, aba ativa e badges; declarações (`const`, `function`, `=>`) no cinza
  da pontuação.
- **Cadenza Chandelier** (variante, overlay): fundo um degrau mais escuro e
  bronze no lugar do scarlet. O único vermelho que sobra é o de erro.
- Geradores além do VS Code, todos a partir de `palette/`: kitty, Hyprland
  (`$variáveis`), Waybar (`@define-color`), Base24 e JSON, em `extras/`.
- ANSI "bright" derivado em OKLCH (+0.10 de L, mesmo matiz e croma), o método
  da paleta de terminal da Vercel, no lugar da mistura com branco.
- Ícone: fermata (arco sobre ponto), gerado da palette.
- `npm run preview`: screenshots do README desenhados com as cores geradas e
  o código tokenizado pelo motor do VS Code, em Geist Mono.

### Herdado do Papilio

- Pipeline YAML → geradores, overlays de variante e os três gates do build
  (contraste WCAG, separação sob daltonismo, tokenização real contra as
  gramáticas do VS Code). A infra de tokenização foi extraída para
  `scripts/lib/textmate.ts`, compartilhada entre o gate e o preview.
