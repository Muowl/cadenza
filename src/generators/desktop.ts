import { PaletteFile, resolve, ansiBright } from "../lib/palette";

/**
 * Exportações para o desktop (Hyprland, Waybar e qualquer coisa que leia
 * JSON: quickshell, ags, eww, scripts).
 *
 * São SÓ cores, com os mesmos nomes em todos os formatos, para que um
 * config escrito contra `$accent` / `@accent` troque de variante trocando
 * o arquivo incluído. Layout, fontes e módulos da barra ficam no config do
 * usuário — o tema não decide isso.
 */

/** Roles de UI que viram nomes de cor no desktop, além dos tokens da palette. */
const ROLES_DESKTOP = [
  "accent",
  "cursor",
  "link",
  "border-active",
  "border-inactive",
  "urgent",
] as const;

/** Nome seguro para hyprlang e GTK CSS: hífen vira sublinhado. */
const nome = (s: string) => s.replace(/-/g, "_");

/** Todas as cores exportadas, na ordem: palette, depois roles de UI. */
function cores(p: PaletteFile): [string, string][] {
  return [
    ...Object.entries(p.palette).map(([k, v]) => [nome(k), v] as [string, string]),
    ...ROLES_DESKTOP.map((r) => [nome(r), resolve(p, "ui", r)] as [string, string]),
  ];
}

const sem = (hex: string) => hex.slice(1);

/**
 * Hyprland (hyprlang). `$nome = rgb(rrggbb)` para uso direto e
 * `$nomeAlpha = rrggbb` para compor transparência: `rgba($bg0Alphacc)`.
 * Uso: `source = ~/.config/hypr/cadenza.conf` no hyprland.conf.
 */
export function generateHyprland(p: PaletteFile): string {
  const linhas = cores(p).flatMap(([k, v]) => [
    `$${k} = rgb(${sem(v)})`,
    `$${k}Alpha = ${sem(v)}`,
  ]);
  return `# ${p.meta.name} — Hyprland
# Gerado por src/generators/desktop.ts a partir de palette/. NÃO editar à mão.
#
# Exemplo:
#   source = ~/.config/hypr/${p.meta.slug}.conf
#   general {
#     col.active_border = $border_active
#     col.inactive_border = $border_inactive
#   }
#   decoration { shadow { color = rgba($bg0Alphaee) } }

${linhas.join("\n")}
`;
}

/**
 * Waybar (GTK CSS). `@define-color` para cada cor; o cabeçalho do arquivo
 * gerado traz um exemplo de style.css.
 */
export function generateWaybar(p: PaletteFile): string {
  const linhas = cores(p).map(([k, v]) => `@define-color ${k} ${v};`);
  return `/* ${p.meta.name} — Waybar (GTK CSS)
 * Gerado por src/generators/desktop.ts a partir de palette/. NÃO editar à mão.
 *
 * No style.css:
 *   @import "${p.meta.slug}.css";
 *   window#waybar { background: @bg0; color: @fg1; border-bottom: 1px solid @bg3; }
 *   #workspaces button.active { color: @fg0; box-shadow: inset 0 -2px @accent; }
 *   #workspaces button.urgent { color: @urgent; }
 */

${linhas.join("\n")}
`;
}

/** JSON com palette, roles resolvidos e os 16 ANSI — para qualquer outra ferramenta. */
export function generateJson(p: PaletteFile): string {
  const ORDEM = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];
  const resolvidos = (grupo: "syntax" | "ui") =>
    Object.fromEntries(Object.keys(p.roles[grupo]).map((r) => [r, resolve(p, grupo, r)]));
  return (
    JSON.stringify(
      {
        name: p.meta.name,
        slug: p.meta.slug,
        variant: p.meta.variant,
        palette: p.palette,
        syntax: resolvidos("syntax"),
        ui: resolvidos("ui"),
        ansi: [
          ...ORDEM.map((s) => resolve(p, "terminal", s)),
          ...ORDEM.map((s) => ansiBright(p, s)),
        ],
      },
      null,
      2
    ) + "\n"
  );
}
