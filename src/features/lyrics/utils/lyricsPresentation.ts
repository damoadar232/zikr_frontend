import { artists, lyricBooks, lyricCategories, poets } from "../../../lyricsData";

export function getLyricCategoryNames(item: any) {
    return (item.categoryIds || []).map((categoryId: string) => lyricCategories.find((category) => category.id === categoryId)?.name || categoryId).filter(Boolean);
}

export function getLyricArtistName(item: any) {
    return getLyricArtistNames(item).join(", ") || "Unknown artist";
}

export function getLyricArtistNames(item: any) {
    const explicitNames = Array.isArray(item.reciters) ? item.reciters.filter((name: unknown): name is string => typeof name === "string" && !!name.trim()) : [];
    const artistIds = Array.isArray(item.artistIds) ? item.artistIds : [item.artistId];
    const relatedNames = artistIds.filter(Boolean).map((id: string) => artists.find((artist) => artist.id === id)?.name || id);
    const names = explicitNames.length ? explicitNames : relatedNames.length ? relatedNames : [item.artist].filter(Boolean);
    return [...new Set(names)];
}

export function getLyricWriterName(item: any) {
    return poets.find((poet) => poet.id === item.writerId)?.name || item.writer || "Unknown writer";
}

export function getLyricBookName(item: any) {
    return item.bookId ? lyricBooks.find((book) => book.id === item.bookId)?.title || "" : "";
}

export function formatLyricDate(date: string | undefined) {
    if (!date) return "Recently published";
    return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function getPrimaryLanguage(item: any) {
    const preferred = item.languageVersions?.[0];
    return preferred ? preferred.label : "Urdu";
}