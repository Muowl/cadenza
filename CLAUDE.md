# cadenza

Tema de cores inspirado na Astra Yao (Zenless Zone Zero) com a estrutura do
design da Vercel (Geist). Alvos: VS Code / Open VSX primeiro; kitty, Hyprland,
Waybar, Base24 e JSON gerados do mesmo arquivo para o desktop do autor.

Direção acordada: **Vercel na estrutura, Astra no acento** — fundo quase preto,
interface em três cinzas, cor reservada para a sintaxe e poucos sinais de UI.

## Arquitetura — regra central

`palette/cadenza.yaml` é a **única fonte da verdade**:

```
palette/*.yaml → src/generate.ts → themes/*.json (VS Code)
                                 → extras/{base24,kitty,hyprland,waybar,json}/
                                 → assets/logo.{svg,png}
```

Variantes são OVERLAYS (`palette/cadenza-<slug>.yaml`): `meta:` completo, só os
tokens de `palette:` e os `roles:` que mudam. O resto vem da base via
`loadPaletteVariant`. Geradores e validadores iteram por `loadAllPalettes`;
uma variante nova precisa só do overlay e de uma entrada em
`package.json → contributes.themes` (o check de contraste cobra isso).

- `anchors`: cores amostradas das artes (referência, não consumidas)
- `palette`: tokens com hex final, ajustados para tela
- `roles`: decisões semânticas — `syntax`, `ui` (inclui roles de desktop:
  `border-active`, `border-inactive`, `urgent`), `terminal`, `terminal-bright`

**Regras invioláveis:**
1. Nenhum gerador contém hex hardcoded. Derivar de token (`alpha()`,
   `lighten()`, `raiseL()`) é permitido.
2. "Strings agora são douradas" muda em `roles:`, nunca no gerador.
3. `themes/`, `extras/` e `assets/` são gerados — nunca editar à mão.
4. Constante compartilhada entre gerador e validador mora em
   `src/lib/palette.ts` (`ANSI_BRIGHT_L`, `BRACKETS`, `CHAPAS`).

## Comandos

```bash
npm install
npm run build     # gates + geração
npm run preview   # assets/preview-<slug>.png (README)
npm run package   # .vsix
npm run publish:vsce && npm run publish:ovsx   # precisam de VSCE_PAT / OVSX_PAT
```

Testar no VS Code: abrir a pasta e F5 (Extension Development Host).

## Referências e direitos

Artes oficiais ficam em `references/` (ignorada pelo git e pelo .vsix).
Projeto fan-made: nenhuma arte oficial no repo, no pacote ou no README; nome,
ícone e screenshots são originais. A descrição diz "inspired by Astra Yao" e
"not affiliated with HoYoverse".

```bash
python scripts/extract_colors.py references/*.webp --colors 12
```

## Diretrizes de design

- Fundo `bg0` quase preto com croma ≤ .007 no matiz do cabelo (h 222). Lê
  como neutro. Editor e chrome no mesmo fundo; `bg3` desenha as bordas; só o
  que flutua (widgets, menus, inputs) sobe para `bg1`.
- `scarlet` é a assinatura e é escasso: controle de fluxo, tags, cursor, aba
  ativa, badges, foco. Declarações (`storage`) ficam em `fg1`. Botão primário
  é branco (`fg0`), não vermelho. Indicador da activity bar e do painel: `fg0`.
- `variable.other.constant` em declaração (`const x`) e o semântico
  `variable.readonly` vão para `variable` — orquídea fica para literais e
  CONSTANTES.
- Escada de luminosidade: a ordem de L em OKLCH separa as cores sob
  daltonismo. Ao mexer num token, preserve matiz e degrau de L, e rode
  `npx tsx scripts/check_cvd.ts --matriz`.
- `npm run check` falha o build em três frentes: contraste WCAG (sintaxe,
  terminal, pares de UI lidos do tema gerado, seleção, chapas compostas),
  separação sob protanopia/deuteranopia (`check_cvd.ts`, ΔE ≥ 6 e pares
  nomeados) e tokenização real (`check_tokens.ts`).
