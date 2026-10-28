export const QURAN_TRANSLATOR_SELECTION_KEY = "zikr-quran-selected-translator-ids";

export function readQuranTranslatorSelection() {
    const stored = window.localStorage.getItem(QURAN_TRANSLATOR_SELECTION_KEY);
    if (stored === null) return null;

    let parsed;
    try {
        parsed = JSON.parse(stored);
    } catch {
        throw new Error("Saved Quran translator preferences are invalid.");
    }
    if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== "string" || !/^\d+$/.test(id))) {
        throw new Error("Saved Quran translator preferences are invalid.");
    }
    return [...new Set(parsed)];
}

export function writeQuranTranslatorSelection(translatorIds) {
    const uniqueIds = [...new Set(translatorIds)];
    if (uniqueIds.some((id) => typeof id !== "string" || !/^\d+$/.test(id))) {
        throw new TypeError("Quran translator IDs must be positive integer strings.");
    }
    window.localStorage.setItem(QURAN_TRANSLATOR_SELECTION_KEY, JSON.stringify(uniqueIds));
}
