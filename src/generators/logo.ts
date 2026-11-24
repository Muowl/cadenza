import type { PaletteFile } from "../lib/palette";
import { resolve } from "../lib/palette";

/**
 * Ícone do tema: uma fermata (𝄐) — o arco sobre um ponto.
 *
 * No concerto clássico, a fermata marca o ponto em que a orquestra para e o
 * solista entra na cadenza. O nome do tema e o ícone contam a mesma coisa.
 *
 * Desenho original, geométrico, sem nada da personagem: arco em fg0 (o
 * branco da Vercel) e ponto no accent (o vermelho da jaqueta), sobre o
 * quase preto do editor. Formas grossas e sem detalhe fino para continuar
 * legível a 16 px (barra do Hyprland, aba do marketplace).
 */
export function generateLogoSvg(p: PaletteFile): string {
  const bg = p.palette.bg0;
  const borda = p.palette.bg3;
  const arco = p.palette.fg0;
  const ponto = resolve(p, "ui", "accent");

  // Arco em crescente, como a fermata impressa: grosso no topo (54 px),
  // afinando até as pontas, que terminam arredondadas para não virarem
  // agulhas no redimensionamento. Mais largo que alto — alto demais, lia
  // como ferradura.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <title>Cadenza — fermata</title>
  <rect x="4" y="4" width="504" height="504" rx="112" fill="${bg}" stroke="${borda}" stroke-width="8"/>
  <path d="M 84 330
           C 92 214 166 146 256 146
           C 346 146 420 214 428 330
           C 429 340 420 344 414 336
           C 384 246 326 200 256 200
           C 186 200 128 246 98 336
           C 92 344 83 340 84 330 Z"
        fill="${arco}"/>
  <circle cx="256" cy="304" r="38" fill="${ponto}"/>
</svg>
`;
}
