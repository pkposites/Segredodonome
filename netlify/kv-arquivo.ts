// Chave-valor em arquivo, para o servidor local. A fila evita que duas escritas se apaguem.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Kv } from "../worker/src/banco-kv";

export class KvArquivo implements Kv {
  private fila: Promise<void> = Promise.resolve();
  private cache: Record<string, string> | null = null;

  constructor(private readonly caminho: string) {}

  private async emFila<T>(fn: () => Promise<T>): Promise<T> {
    const vez = this.fila.then(fn, fn);
    this.fila = vez.then(() => undefined, () => undefined);
    return vez;
  }

  private async ler(): Promise<Record<string, string>> {
    if (this.cache) return this.cache;
    try {
      this.cache = JSON.parse(await readFile(this.caminho, "utf8")) as Record<string, string>;
    } catch {
      this.cache = {};
    }
    return this.cache;
  }

  private async gravar(dados: Record<string, string>) {
    await mkdir(dirname(this.caminho), { recursive: true });
    const tmp = `${this.caminho}.tmp`;
    await writeFile(tmp, JSON.stringify(dados));
    await rename(tmp, this.caminho);
    this.cache = dados;
  }

  async get(chave: string) {
    return (await this.ler())[chave] ?? null;
  }

  async set(chave: string, valor: string) {
    await this.emFila(async () => {
      const dados = await this.ler();
      dados[chave] = valor;
      await this.gravar(dados);
    });
  }

  async del(chave: string) {
    await this.emFila(async () => {
      const dados = await this.ler();
      delete dados[chave];
      await this.gravar(dados);
    });
  }

  async list(prefixo: string) {
    return Object.keys(await this.ler()).filter((k) => k.startsWith(prefixo));
  }
}
