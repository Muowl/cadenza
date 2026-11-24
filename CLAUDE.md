# cadenza

Colour theme inspired by Astra Yao (Zenless Zone Zero) with a flat,
restrained structure. Targets: VS Code / Open VSX first; kitty, Hyprland,
Waybar, Base24 and JSON generated from the same file for the author's desktop.

Agreed direction: **restraint in the structure, Astra in the accent** —
near-black background, UI in three greys, colour reserved for syntax and a
handful of UI signals.

The project's language is English: code, comments, script output, docs and
commit messages.

## Architecture — the central rule

`palette/cadenza.yaml` is the **single source of truth**:

```
palette/*.yaml → src/generate.ts → themes/*.json (VS Code)
                                 → extras/{base24,kitty,hyprland,waybar,json}/
                                 → assets/logo.{svg,png}
```

Variants are OVERLAYS (`palette/cadenza-<slug>.yaml`): a full `meta:`, only the
`palette:` tokens and `roles:` that change. Everything else comes from the base
via `loadPaletteVariant`. Generators and validators iterate over
`loadAllPalettes`; a new variant only needs the overlay and an entry in
`package.json → contributes.themes` (the contrast check enforces this).

- `anchors`: colours sampled from the artwork (reference only, not consumed)
- `palette`: tokens with final hex values, tuned for screens
- `roles`: semantic decisions — `syntax`, `ui` (includes desktop roles:
  `border-active`, `border-inactive`, `urgent`), `terminal`, `terminal-bright`

**Hard rules:**
1. No generator contains a hardcoded hex. Deriving from a token (`alpha()`,
   `lighten()`, `raiseL()`) is allowed.
2. "Strings are gold now" changes in `roles:`, never in the generator.
3. `themes/`, `extras/` and `assets/` are generated — never edit them by hand.
4. Constants shared by a generator and a validator live in
   `src/lib/palette.ts` (`ANSI_BRIGHT_L`, `BRACKETS`, `TINTS`).

## Commands

```bash
npm install
npm run build     # gates + generation
npm run preview   # assets/preview-<slug>.png (README)
npm run package   # .vsix
npm run publish:vsce && npm run publish:ovsx   # need VSCE_PAT / OVSX_PAT
```

To test in VS Code: open the folder and press F5 (Extension Development Host).

## References and rights

Official artwork lives in `references/` (ignored by git and by the .vsix).
Fan-made project: no official artwork in the repo, the package or the README;
the name, icon and screenshots are original. The description says "inspired
by Astra Yao" and "not affiliated with HoYoverse".

```bash
python scripts/extract_colors.py references/*.webp --colors 12
```

## Design guidelines

- Background `bg0` near-black with chroma ≤ .007 at the hair's hue (h 222).
  Reads as neutral. Editor and chrome share the background; `bg3` draws the
  borders; only what floats (widgets, menus, inputs) rises to `bg1`.
- `scarlet` is the signature and is scarce: ONLY control flow (if, for, match,
  return, throw, await, yield, #if), tags, cursor, active tab, badges, focus.
  Every other reserved word — declaration, modifier, import/use/using/
  #include — stays in `fg1` (`storage`). It's the boundary rust-analyzer
  (`keyword.controlFlow`) and Roslyn (`controlKeyword`) use; never create a
  generic semantic rule for `keyword`.
- `self`/`this`/`cls` (`builtin`) in `fg1` italic. Metaprogramming
  (decorator, annotation, Rust/C++ attribute, C macro) in `orchid`.
- The primary button is white (`fg0`), not red. Activity bar and panel
  indicator: `fg0`.
- `variable.other.constant` in a declaration (`const x`) and the semantic
  `variable.readonly` go to `variable` — orchid is for literals and
  CONSTANTS.
- Lightness ladder: the order of L in OKLCH separates the colours under
  colour blindness. When changing a token, preserve its hue and L step, and
  run `npx tsx scripts/check_cvd.ts --matrix`.
- `npm run check` fails the build on three fronts: WCAG contrast (syntax,
  terminal, UI pairs read from the generated theme, selection, composited
  tints), separation under protanopia/deuteranopia (`check_cvd.ts`, ΔE ≥ 6 and
  named pairs) and tokenization (`check_tokens.ts`: TextMate cases on the
  fixtures in `tests/fixtures/` + a simulation of VS Code's semantic chain).

## Semantic tokens

With a language server running, VS Code first applies the theme's
`semanticTokenColors` (score: +100 type, +100 per modifier, +10 language; ties
go to the rule defined last) and fills whatever is missing from the
extension's `semanticTokenScopes` — a loose TextMate scope, resolved WITHOUT
ancestors. Practical consequences:

- a TextMate rule with an ancestor selector (`comment keyword`) doesn't apply
  to the semantic fallback; the loose scope needs its own rule
  (e.g. `keyword.other.documentation`);
- to find the fallback scope, read `contributes.semanticTokenScopes` in the
  extension's package.json (rust-analyzer, vscode-csharp, vscode-java,
  vscode-cpptools) and register the case in `semanticCases`;
- `npm run inspect -- <fixture>` shows each token's colour by name.
