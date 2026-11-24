import { PaletteFile, resolve, ansiBright } from "../lib/palette";

/**
 * Gera o tema do kitty. Os 16 slots ANSI são exatamente os do terminal
 * integrado do VS Code e do Base24 (mesmos roles, mesmo ansiBright()), então
 * um `ls --color` ou um `git diff` sai idêntico nos três lugares.
 *
 * Uso: copiar para ~/.config/kitty/ e pôr `include cadenza.conf` no
 * kitty.conf (ou `kitten themes` apontando para o arquivo).
 */
export function generateKittyTheme(p: PaletteFile): string {
  const c = p.palette;
  const ui = (role: string) => resolve(p, "ui", role);
  const ansi = (slot: string) => resolve(p, "terminal", slot);
  const ORDEM = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];

  const cores = [
    ...ORDEM.map((slot, i) => `color${i}  ${ansi(slot)}`),
    ...ORDEM.map((slot, i) => `color${i + 8}${i + 8 < 10 ? " " : ""} ${ansiBright(p, slot)}`),
  ].join("\n");

  return `# ${p.meta.name} — kitty
# Gerado por src/generators/kitty.ts a partir de palette/. NÃO editar à mão.
# ${p.meta.description}

foreground              ${c.fg0}
background              ${ui("terminal-bg")}
# "none" mantém a cor da saída por cima da seleção, como no editor.
selection_foreground    none
selection_background    ${c.selection}

cursor                  ${ui("cursor")}
cursor_text_color       ${c.bg0}
url_color               ${ui("link")}

# Bordas de split: a janela ativa leva o accent, as outras somem no fundo.
active_border_color     ${ui("border-active")}
inactive_border_color   ${ui("border-inactive")}
bell_border_color       ${c.warning}
visual_bell_color       none

# Barra de abas plana: ativa um degrau acima, inativas no fundo.
tab_bar_background      ${c.bg0}
tab_bar_margin_color    ${c.bg0}
active_tab_foreground   ${c.fg0}
active_tab_background   ${c.bg2}
active_tab_font_style   bold
inactive_tab_foreground ${c.muted}
inactive_tab_background ${c.bg0}
inactive_tab_font_style normal

# Marcas (kitten marks / hints)
mark1_foreground        ${c.bg0}
mark1_background        ${c.lilac}
mark2_foreground        ${c.bg0}
mark2_background        ${c.gold}
mark3_foreground        ${c.bg0}
mark3_background        ${c.jade}

# ANSI — 8 bases + 8 brights (+0.10 de L em OKLCH)
${cores}
`;
}
