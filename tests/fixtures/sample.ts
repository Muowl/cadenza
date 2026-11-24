import { readFile } from "node:fs/promises";
import type { Track } from "./types";

export const MAX_ENCORES = 3 as const;

export enum Cue { Start, Fade = 2, Stop }

type Setlist<T extends Track = Track> = readonly T[];

@sealed
export class Encore<T extends Track> implements Iterable<T> {
  #round = 0;
  private static instances = 0;

  constructor(private readonly setlist: Setlist<T>) {
    Encore.instances++;
  }

  get done(): boolean {
    return this.#round >= MAX_ENCORES;
  }

  /**
   * Próxima faixa do encore.
   * @param hint - título preferido
   */
  async next(hint?: string): Promise<T | undefined> {
    if (this.done) throw new Error(`acabou: ${this.#round}`);
    const raw = await readFile("./setlist.json", "utf8");
    const pattern = /^(?<title>\w+)\s*$/u;
    this.#round += 1;
    return this.setlist.find((t) => pattern.test(t.title)) ?? undefined;
  }

  *[Symbol.iterator](): Iterator<T> {
    yield* this.setlist;
  }
}
