using System;
using System.Collections.Generic;

namespace Cadenza.Stage;

/// <summary>Toca o encore quando a plateia pede.</summary>
[Serializable]
public sealed class Encore<T> where T : ITrack
{
    private const int MaxEncores = 3;
    private readonly List<T> _setlist;
    public int Round { get; private set; }

    public Encore(IEnumerable<T> setlist) => _setlist = new List<T>(setlist);

    public async Task<T?> NextAsync(string? hint = null)
    {
        if (Round >= MaxEncores)
            throw new InvalidOperationException($"acabou: {Round}\n");

        foreach (var track in _setlist)
        {
            if (track.Title is null) continue;
            await Task.Delay(10);
        }
        Round++;
        return _setlist.Count > 0 ? _setlist[^1] : default;
    }
}

public record Track(string Title, double Seconds) : ITrack;
public enum Cue { Start, Fade = 2, Stop }
