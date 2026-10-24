export interface LyricsBrowseOption {
    id: string;
    name: string;
}

export interface LyricsBrowseEntry<TLyric> extends LyricsBrowseOption {
    lyrics: TLyric[];
}

export declare function buildAvailableBrowseEntries<TLyric>(
    options: LyricsBrowseOption[],
    lyrics: TLyric[],
    getKeys: (lyric: TLyric) => string[],
): LyricsBrowseEntry<TLyric>[];
