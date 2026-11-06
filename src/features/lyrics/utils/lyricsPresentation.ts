import { artists, lyricBooks, lyricCategories, poets } from "../../../lyricsData";
import { reciterProfiles } from "../data/reciterProfiles";
import type { ApiArtistProfile } from "../services/lyricsApiService.js";

export function getLyricCategoryNames(item: any) {
    return (item.categoryIds || []).map((categoryId: string) => lyricCategories.find((category) => category.id === categoryId)?.name || categoryId).filter(Boolean);
}

export function getLyricArtistName(item: any) {
    return getLyricArtistNames(item).join(", ") || "Unknown artist";
}

function stringIds(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((id: unknown): id is string | number =>
            (typeof id === "string" && !!id) || (typeof id === "number" && Number.isSafeInteger(id)))
        .map(String);
}

export function getLyricArtistNames(item: any): string[] {
    const explicitNames: string[] = Array.isArray(item.reciters) ? item.reciters.filter((name: unknown): name is string => typeof name === "string" && !!name.trim()) : [];
    const artistIds = stringIds(item.reciterIds).length
        ? stringIds(item.reciterIds)
        : stringIds(item.artistIds).length ? stringIds(item.artistIds) : stringIds([item.artistId]);
    const relatedNames = artistIds
        .map((id) => reciterProfiles.find((reciter) => reciter.id === id)?.name || artists.find((artist) => artist.id === id)?.name)
        .filter((name): name is string => typeof name === "string" && !!name.trim());
    const names: string[] = explicitNames.length ? explicitNames : relatedNames.length ? relatedNames : typeof item.artist === "string" ? [item.artist] : [];
    return names.filter((name, index) => names.findIndex((candidate) => candidate.trim().toLowerCase() === name.trim().toLowerCase()) === index);
}

export function getLyricArtistProfiles(item: any): ApiArtistProfile[] {
    if (!Array.isArray(item.artistProfiles)) return [];
    return item.artistProfiles.filter((value: unknown): value is ApiArtistProfile => {
        if (!value || typeof value !== "object") return false;
        const profile = value as Record<string, unknown>;
        return typeof profile.id === "number"
            && typeof profile.artistKey === "string"
            && typeof profile.fullName === "string"
            && (typeof profile.displayName === "string" || profile.displayName === null)
            && (typeof profile.profileImageUrl === "string" || profile.profileImageUrl === null
                || profile.profileImageUrl === undefined);
    });
}

export function getLyricArtistProfile(item: any, identifier: string | number): ApiArtistProfile | undefined {
    const value = String(identifier).trim().toLowerCase();
    return getLyricArtistProfiles(item).find((profile) =>
        String(profile.id) === value
        || profile.artistKey?.trim().toLowerCase() === value
        || profile.fullName.trim().toLowerCase() === value
        || profile.displayName?.trim().toLowerCase() === value);
}

export function getLyricWriterProfile(item: any): ApiArtistProfile | undefined {
    if (item.writerId !== undefined && item.writerId !== null) {
        const byId = getLyricArtistProfile(item, item.writerId);
        if (byId) return byId;
    }
    return typeof item.writer === "string" ? getLyricArtistProfile(item, item.writer) : undefined;
}

export function getLyricReciterIds(item: any): string[] {
    const reciterIds = stringIds(item.reciterIds);
    if (reciterIds.length) return [...new Set(reciterIds)];
    return [...new Set(stringIds(item.artistIds).length ? stringIds(item.artistIds) : stringIds([item.artistId]))];
}

export function getLyricWriterName(item: any) {
    return (typeof item.writer === "string" && item.writer.trim())
        ? item.writer.trim()
        : poets.find((poet) => String(poet.id) === String(item.writerId))?.name || "Unknown writer";
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