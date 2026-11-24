// Encore: replays the last track when the crowd asks for more
import { useState } from "react";
import type { Track } from "./types";

const MAX_ENCORES = 3;

interface EncoreProps {
  setlist: Track[];
  onFinish?: (rounds: number) => void;
}

export function Encore({ setlist, onFinish }: EncoreProps) {
  const [round, setRound] = useState(0);
  const next = setlist.at(-1) ?? null;

  if (round >= MAX_ENCORES) {
    onFinish?.(round);
    return null;
  }

  return (
    <section className="stage" data-round={round}>
      <h2>{`Encore #${round + 1}\n`}</h2>
      <Button onClick={() => setRound(round + 1)} disabled={!next}>
        Play {next?.title ?? "silence"}
      </Button>
    </section>
  );
}
