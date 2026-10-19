// Emblemas dos 9 arquétipos (traço simples, cor herdada). O Farol é o da referência visual.
// SVG estático do próprio site: pode ir por svg() sem risco.

const abrir = '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

const TRACOS = {
  1: '<path d="M60 100c-18 0-28-12-28-27 0-18 16-26 16-44 10 8 14 18 13 28 6-4 9-10 9-16 12 10 18 22 18 32 0 15-10 27-28 27z"/><path d="M60 100c-8 0-13-6-13-13 0-8 7-12 9-20 8 6 17 12 17 20 0 7-5 13-13 13z"/>',
  2: '<path d="M14 82 H106"/><path d="M22 82 C34 46 86 46 98 82"/><path d="M40 62 V82 M60 56 V82 M80 62 V82"/><path d="M14 92 H106" opacity="0.5"/>',
  3: '<path d="M30 48 H44 L62 32 V88 L44 72 H30 Z"/><path d="M74 46 C82 52 82 68 74 74"/><path d="M84 36 C98 48 98 72 84 84"/>',
  4: '<path d="M60 18 V70"/><path d="M40 34 C40 24 80 24 80 34 C92 34 92 56 80 58 H40 C28 56 28 34 40 34 Z"/><path d="M60 70 C56 82 44 86 34 100 M60 70 C64 82 76 86 86 100 M60 70 V102"/>',
  5: '<path d="M16 46 H72 C84 46 88 32 78 26 C70 22 62 28 64 36"/><path d="M16 62 H92 C104 62 106 78 96 82 C88 86 80 80 82 72"/><path d="M28 78 H62"/>',
  6: '<path d="M20 58 L60 24 L100 58"/><path d="M30 50 V98 H90 V50"/><path d="M50 98 V72 H70 V98"/><path d="M60 46 C54 40 46 46 52 52 L60 60 L68 52 C74 46 66 40 60 46 Z"/>',
  7: '<path d="M48 100 L54 46 H66 L72 100 Z"/><path d="M51 82 H69 M53 64 H67"/><rect x="52" y="33" width="16" height="13" rx="2"/><path d="M50 33 L60 24 L70 33"/><path d="M38 100 H82"/><path d="M74 37 L104 26 M74 42 L104 52" opacity="0.6"/><path d="M46 37 L16 26 M46 42 L16 52" opacity="0.6"/>',
  8: '<circle cx="60" cy="60" r="26"/><circle cx="60" cy="60" r="8"/><path d="M60 14 V34 M60 86 V106 M14 60 H34 M86 60 H106 M27 27 L42 42 M78 78 L93 93 M93 27 L78 42 M42 78 L27 93"/>',
  9: '<path d="M14 78 H106"/><path d="M32 78 A28 28 0 0 1 88 78"/><path d="M60 36 V26 M38 46 L31 39 M82 46 L89 39 M24 64 H16 M96 64 H104"/><path d="M28 92 H92 M42 104 H78" opacity="0.6"/>',
};

export function emblema(numero, tamanho = 56, espessura = 3) {
  return `${abrir.replace("<svg ", `<svg width="${tamanho}" height="${tamanho}" stroke-width="${espessura}" `)}${TRACOS[numero] ?? TRACOS[7]}</svg>`;
}

/** Gráfico 2×2 do temperamento: x = ação → reflexão, y = emoção → razão. */
export function grafico2x2(placar) {
  const x = 8 + (placar.reflexao / 5) * 104; // reflexão empurra para a direita
  const y = 8 + (placar.razao / 5) * 104; // razão empurra para baixo
  const qx = placar.reflexao > placar.acao ? 60 : 8;
  const qy = placar.razao > placar.emocao ? 60 : 8;
  return `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" role="img" aria-label="Gráfico do jeito: ${placar.acao > placar.reflexao ? "mais ação" : "mais reflexão"} e ${placar.emocao > placar.razao ? "mais emoção" : "mais razão"}">
    <rect x="0.5" y="0.5" width="119" height="119" rx="12" stroke="var(--borda)"/>
    <rect x="${qx}" y="${qy}" width="52" height="52" fill="var(--nome-fundo)"/>
    <path d="M60 8V112M8 60H112" stroke="var(--borda)"/>
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="var(--nome)"/>
  </svg>`;
}
