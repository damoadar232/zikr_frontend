export const QURAN_BOOKMARKS_KEY = "zikr-quran-bookmarks";
export const QURAN_BOOKMARKS_UPDATED_EVENT = "zikr-quran-bookmarks-updated";

export function readQuranBookmarks(): number[] {
    return JSON.parse(window.localStorage.getItem(QURAN_BOOKMARKS_KEY) || "[]") as number[];
}

export function writeQuranBookmarks(bookmarks: number[]) {
    window.localStorage.setItem(QURAN_BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

export function toggleStoredQuranBookmark(reference: number) {
    const bookmarks = readQuranBookmarks();
    const nextBookmarks = bookmarks.includes(reference)
        ? bookmarks.filter((item) => item !== reference)
        : [...bookmarks, reference];
    writeQuranBookmarks(nextBookmarks);
    window.dispatchEvent(new Event(QURAN_BOOKMARKS_UPDATED_EVENT));
}
