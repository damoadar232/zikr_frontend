export function buildAvailableBrowseEntries(options, lyrics, getKeys) {
    const lyricsByKey = new Map();
    for (const lyric of lyrics) {
        for (const key of new Set(getKeys(lyric).filter(Boolean))) {
            const associatedLyrics = lyricsByKey.get(key) || [];
            associatedLyrics.push(lyric);
            lyricsByKey.set(key, associatedLyrics);
        }
    }

    return options.flatMap((option) => {
        const associatedLyrics = lyricsByKey.get(option.id) || [];
        return associatedLyrics.length ? [{ ...option, lyrics: associatedLyrics }] : [];
    });
}
