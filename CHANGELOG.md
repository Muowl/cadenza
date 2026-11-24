# Changelog

Todas as mudanças relevantes do Cadenza ficam registradas aqui.
O projeto segue [Semantic Versioning](https://semver.org/).

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
