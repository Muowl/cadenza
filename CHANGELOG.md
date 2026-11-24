# Changelog

All notable changes to Cadenza are recorded here.
The project follows [Semantic Versioning](https://semver.org/).

## [0.2.0] — 2026-11-24

Per-language review: Rust, TypeScript, Python, Java, C#, C and C++, in VS
Code's grammars and in the language servers' semantic tokens.

### Changed

- **Scarlet for control flow only.** Imports and modules (`import`, `export`,
  `use`, `using`, `package`, `#include`) move to the declaration grey.
  Reason: rust-analyzer and Roslyn only tell control flow apart from
  everything else, so with the server running imports were already grey in
  those languages; now it's the same everywhere.
- `self`, `this` and `cls` in grey italic (they were scarlet): they show up on
  almost every line of Python and Rust and drowned out the control-flow signal.
- Removed the `keyword → scarlet` semantic rule, which painted every reserved
  word in Rust and C# red (`fn`, `let`, `pub`, `public`, `int`, `true`…) once
  the language server loaded.
- `readonly` no longer means constant: in TS (every `const`), Java (`final`)
  and C++ (local `const`) it's a variable again. Orchid is kept for real
  constants: static, global, library, Python's `Final`.

### Fixed

- C#: `int`, `string`, `double` came out scarlet (`keyword.type.cs`); XML tags
  in `///` came out scarlet inside the comment; `await` came out grey.
- Java: annotations (`@Override`) had no colour; `new` and the ternary `?` were
  scarlet; `@param` was scarlet.
- C/C++: `#include`/`#define`, `typedef`, `concept`, `requires` and `= default`
  were scarlet; `std::` and `[[nodiscard]]` had no colour. `#if`/`#ifdef` stay
  scarlet (conditional compilation is control flow).
- Rust: `fn`, `impl`, `async` were scarlet; `u32`/`usize` grey in some
  positions; the dot in `3.5` grey in the middle of the number; `#[derive]` had
  no colour; formatting `{}` lacked the interpolation colour.
- Python: the `f`/`r` string prefix was grey; `:.0f` was grey; named regex
  groups were scarlet; UPPER_CASE constants had no colour; `field(...)` calls
  had no colour.
- TypeScript: the name in `@decorator` had no colour; regex flags (`/u`) were
  grey; regex anchors (`^`, `$`) were scarlet.

### Added

- Metaprogramming in one colour (orchid) in every language: decorators,
  annotations, Rust and C++ attributes, C/C++ macros.
- Rust lifetimes in lilac italic; `mut` variables underlined (the scope
  rust-analyzer uses for this now has a style).
- Documentation tags (`@param`, `<summary>`, JSDoc names) in `doctag`: one
  step above the comment.
- Semantic rules for rust-analyzer, Roslyn, jdt.ls, clangd/cpptools and
  Pylance (`selfParameter`, `module`, `*.decorator`, `lifetime`, `macro`…).
- Gate: 76 new tokenization cases across the six languages and 37 cases that
  simulate VS Code's semantic chain (theme rules → each extension's
  `semanticTokenScopes`). New grammars vendored from `microsoft/vscode`.
- `assets/languages-*.png` (per-language gallery) and `npm run inspect`.

## [0.1.0] — 2026-11-24

First release.

### Added

- **Cadenza** (base): near-black background with a flat structure — editor
  and chrome on the same background, separated by hairline borders; three
  text greys; white primary button. Five syntax hues taken from Astra Yao:
  scarlet (jacket), gold (microphone), jade (earrings), lilac (the dress's
  shadow) and orchid (medallion). Scarlet limited to control flow, tags,
  cursor, active tab and badges; declarations (`const`, `function`, `=>`) in
  the punctuation grey.
- **Cadenza Chandelier** (variant, overlay): a background one step darker and
  bronze instead of scarlet. The only red left is for errors.
- Generators beyond VS Code, all from `palette/`: kitty, Hyprland
  (`$variables`), Waybar (`@define-color`), Base24 and JSON, in `extras/`.
- ANSI "bright" colours derived in OKLCH (+0.10 L, same hue and chroma)
  instead of mixing with white.
- Icon: a fermata (arc over a dot), generated from the palette.
- `npm run preview`: README screenshots drawn with the generated colours and
  code tokenized by VS Code's engine, in Geist Mono.

### Inherited from Papilio

- YAML → generators pipeline, variant overlays and the three build gates
  (WCAG contrast, separation under colour blindness, real tokenization
  against VS Code's grammars). The tokenization infrastructure was extracted
  into `scripts/lib/textmate.ts`, shared by the gate and the preview.
