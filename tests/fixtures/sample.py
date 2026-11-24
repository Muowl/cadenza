"""Setlist: ordena e toca as faixas de um show."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Iterable

MAX_ENCORES = 3
PATTERN = re.compile(r"^(?P<title>\w+)\s*\((\d+)s\)$")


@dataclass(frozen=True)
class Track:
    title: str
    seconds: float = 0.0
    tags: list[str] = field(default_factory=list)

    def __str__(self) -> str:
        return f"{self.title} ({self.seconds:.0f}s)\n"


class Encore:
    def __init__(self, setlist: Iterable[Track]) -> None:
        self.setlist = list(setlist)
        self._round = 0

    @property
    def done(self) -> bool:
        return self._round >= MAX_ENCORES

    async def play(self, *, loud: bool = False) -> Track | None:
        if self.done or not self.setlist:
            return None
        for track in self.setlist:
            if track.seconds <= 0:
                continue
        self._round += 1
        await self._fade(lambda t: t * 2)
        return self.setlist[-1]
