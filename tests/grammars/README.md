# Vendored grammars

Copies of the TextMate grammars VS Code ships, used by
`scripts/check_tokens.ts` to tokenize the fixtures with the editor's own
engine. **Do not edit by hand** — to update, download them again from the
`microsoft/vscode` repository (branch `main`):

| file | source |
| --- | --- |
| `css.tmLanguage.json` | `extensions/css/syntaxes/` |
| `less.tmLanguage.json` | `extensions/less/syntaxes/` |
| `scss.tmLanguage.json` | `extensions/scss/syntaxes/` |
| `html.tmLanguage.json` | `extensions/html/syntaxes/` |
| `html-derivative.tmLanguage.json` | `extensions/html/syntaxes/` |
| `TypeScriptReact.tmLanguage.json` | `extensions/typescript-basics/syntaxes/` |
| `TypeScript.tmLanguage.json` | `extensions/typescript-basics/syntaxes/` |
| `rust.tmLanguage.json` | `extensions/rust/syntaxes/` |
| `java.tmLanguage.json` | `extensions/java/syntaxes/` |
| `c.tmLanguage.json` | `extensions/cpp/syntaxes/` |
| `cpp.tmLanguage.json` | `extensions/cpp/syntaxes/` |
| `cpp.embedded.macro.tmLanguage.json` | `extensions/cpp/syntaxes/` (included by C++) |
| `csharp.tmLanguage.json` | `extensions/csharp/syntaxes/` |
| `MagicPython.tmLanguage.json` | `extensions/python/syntaxes/` |
| `MagicRegExp.tmLanguage.json` | `extensions/python/syntaxes/` (Python regex and C++ raw strings) |

The programming-language grammars came from commit `679e1ca` of
`microsoft/vscode` (2026-11-24).

License: MIT (VS Code); each grammar keeps the license of the upstream
project VS Code imports it from. Used here for testing only.

Updating the grammars can change scope names — if `npm run check` breaks
after an update, the real scopes of each case show up in the failure
diagnostics.
