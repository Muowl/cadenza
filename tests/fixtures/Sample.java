package dev.cadenza.stage;

import java.util.List;
import java.util.Optional;

/**
 * Toca o encore quando a plateia pede.
 * @param <T> tipo da faixa
 */
@FunctionalInterface
interface Player<T> { void play(T track); }

public final class Encore<T extends Track> implements Player<T> {
    private static final int MAX_ENCORES = 3;
    private final List<T> setlist;
    private int round = 0;

    public Encore(List<T> setlist) {
        this.setlist = setlist;
    }

    @Override
    public void play(T track) {
        if (round >= MAX_ENCORES) {
            throw new IllegalStateException("acabou: " + round);
        }
        round++;
        System.out.printf("Encore #%d%n", round);
    }

    public Optional<T> next() {
        return setlist.isEmpty() ? Optional.empty() : Optional.of(setlist.get(0));
    }

    record Track(String title, double seconds) {}

    enum Cue { START, FADE, STOP }
}
