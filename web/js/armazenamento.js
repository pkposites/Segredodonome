// localStorage/sessionStorage com try/catch: modo privado ou bloqueio não podem quebrar o site.
// Tudo o que identifica a pessoa fica só aqui, no aparelho dela (ARQUITETURA.md, 1).

const PREFIXO = "sdn_";

function ler(store, chave) {
  try {
    const v = store.getItem(PREFIXO + chave);
    return v === null ? null : JSON.parse(v);
  } catch {
    return null;
  }
}

function gravar(store, chave, valor) {
  try {
    if (valor === null || valor === undefined) store.removeItem(PREFIXO + chave);
    else store.setItem(PREFIXO + chave, JSON.stringify(valor));
  } catch {
    // sem armazenamento: o site continua funcionando, só não lembra
  }
}

export const local = {
  ler: (c) => ler(window.localStorage, c),
  gravar: (c, v) => gravar(window.localStorage, c, v),
};

export const sessao = {
  ler: (c) => ler(window.sessionStorage, c),
  gravar: (c, v) => gravar(window.sessionStorage, c, v),
};

/** "Apagar meus dados deste aparelho": remove tudo o que o site guardou aqui. */
export function apagarTudo() {
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      for (const k of Object.keys(store)) if (k.startsWith(PREFIXO)) store.removeItem(k);
    } catch {}
  }
}

export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
