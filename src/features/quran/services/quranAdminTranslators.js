import { quranAdminApi } from "./quranAdminApi.js";

const languages = new Set(["en", "hi", "ur"]);
const translatorCache = new Map();
const pendingRequests = new Map();
const generations = new Map();

export async function listQuranTranslators(language, { force = false, api = quranAdminApi } = {}) {
    if (!languages.has(language)) {
        throw new Error("Translator language must be en, hi, or ur.");
    }

    if (!force && translatorCache.has(language)) return translatorCache.get(language);
    if (!force && pendingRequests.has(language)) return pendingRequests.get(language);

    const generation = (generations.get(language) || 0) + 1;
    generations.set(language, generation);
    const request = api.listTranslators(language)
        .then((records) => {
            const rows = records.slice().sort((a, b) => a.name.localeCompare(b.name));
            if (generations.get(language) === generation) translatorCache.set(language, rows);
            return rows;
        })
        .finally(() => {
            if (pendingRequests.get(language) === request) pendingRequests.delete(language);
        });
    pendingRequests.set(language, request);
    return request;
}

export async function createQuranTranslator({
    name,
    languageCode,
    sourceRef,
    license,
    licenseNotes,
}, api = quranAdminApi) {
    if (!languages.has(languageCode)) {
        throw new Error("Translator language must be en, hi, or ur.");
    }
    const payload = {
        name: name.trim(),
        languageCode,
        sourceRef: sourceRef.trim(),
        license: license.trim(),
        ...(licenseNotes?.trim() ? { licenseNotes: licenseNotes.trim() } : {}),
    };
    const translator = await api.createTranslator(payload);
    generations.set(languageCode, (generations.get(languageCode) || 0) + 1);
    translatorCache.delete(languageCode);
    pendingRequests.delete(languageCode);
    return translator;
}
