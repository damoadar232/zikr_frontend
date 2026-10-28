import { quranAdminApi } from "./quranAdminApi.js";

const translationLanguages = ["en", "hi", "ur"];

export class QuranAdminPartialSaveError extends Error {
    constructor(message, ayah) {
        super(message);
        this.name = "QuranAdminPartialSaveError";
        this.ayah = ayah;
    }
}

export async function loadSurahAyahs(surahNumber, concurrency = 8, api = quranAdminApi) {
    const ayahs = await api.listAyahs(surahNumber);
    const rows = new Array(ayahs.length);
    let nextIndex = 0;
    let failed = false;
    const workerCount = Math.min(Math.max(1, concurrency), ayahs.length);

    await Promise.all(Array.from({ length: workerCount }, async () => {
        while (!failed && nextIndex < ayahs.length) {
            const index = nextIndex++;
            const ayah = ayahs[index];
            try {
                const translations = await api.listTranslations(surahNumber, ayah.ayahNumber);
                rows[index] = { ...ayah, translations };
            } catch (error) {
                failed = true;
                throw error;
            }
        }
    }));

    return rows.sort((a, b) => a.ayahNumber - b.ayahNumber);
}

export async function loadSurahMetadata(surahNumber, api = quranAdminApi) {
    const surahs = await api.listSurahs();
    return surahs.find((surah) => surah.number === surahNumber) || null;
}

export async function loadSurahAyahRecords(surahNumber, api = quranAdminApi) {
    return api.listAyahs(surahNumber);
}

export async function loadAyahDetails(surahNumber, ayahNumber, api = quranAdminApi) {
    const [ayah, translations] = await Promise.all([
        api.getAyah(surahNumber, ayahNumber),
        api.listTranslations(surahNumber, ayahNumber),
    ]);
    return { ...ayah, translations };
}

export function validateAyahRecord({ surahNumber, ayahNumber, ayahCount, arabicText, existingAyahs, editingAyahNumber }) {
    if (!Number.isInteger(ayahCount) || ayahCount < 1) {
        return "Canonical Ayah count is unavailable from Surah metadata; this Ayah cannot be saved safely.";
    }
    if (!Number.isInteger(ayahNumber) || ayahNumber < 1 || ayahNumber > ayahCount) {
        return `Enter an Ayah number from 1 to ${ayahCount} for Surah ${surahNumber}.`;
    }
    if (editingAyahNumber !== undefined && ayahNumber !== editingAyahNumber) {
        return "An existing Ayah number cannot be changed. Add a missing Ayah instead.";
    }
    if (editingAyahNumber === undefined && existingAyahs.some((ayah) => ayah.ayahNumber === ayahNumber)) {
        return `Ayah ${surahNumber}:${ayahNumber} already exists. Choose a missing Ayah number.`;
    }
    if (!arabicText.trim()) return "Arabic text is required.";
    return "";
}

export async function saveAyahRecord({
    surahNumber,
    ayahNumber,
    arabicText,
    status,
    editing,
}, api = quranAdminApi) {
    const payload = {
        surahNumber,
        ayahNumber,
        arabicText: arabicText.trim(),
        status: editing ? status : "DRAFT",
    };
    return editing
        ? api.updateAyah(surahNumber, ayahNumber, payload)
        : api.createAyah(payload);
}

export async function saveTranslationRecord({
    surahNumber,
    ayahNumber,
    languageCode,
    translatorId,
    text,
    status,
}, api = quranAdminApi) {
    if (!translationLanguages.includes(languageCode)) {
        throw new Error("Translation language must be en, hi, or ur.");
    }
    const cleanText = text.trim();
    if (!cleanText) throw new Error("Translation text is required.");
    if (!Number.isInteger(Number(translatorId)) || Number(translatorId) < 1) {
        throw new Error("Choose a registered translator.");
    }
    return api.upsertTranslation(surahNumber, ayahNumber, languageCode, {
        translatorId: Number(translatorId),
        text: cleanText,
        status,
    });
}

export function validateAyahDraft({
    surahNumber,
    ayahNumber,
    ayahCount,
    arabicText,
    existingAyahs,
    editingAyahNumber,
    translations,
    translators,
    originalTranslations,
}) {
    if (!Number.isInteger(ayahCount) || ayahCount < 1) {
        return "Canonical Ayah count is unavailable from Surah metadata; this Ayah cannot be saved safely.";
    }
    if (!Number.isInteger(ayahNumber) || ayahNumber < 1 || ayahNumber > ayahCount) {
        return `Enter an Ayah number from 1 to ${ayahCount} for Surah ${surahNumber}.`;
    }
    if (editingAyahNumber !== undefined && ayahNumber !== editingAyahNumber) {
        return "An existing Ayah number cannot be changed. Add a missing Ayah instead.";
    }
    if (editingAyahNumber === undefined && existingAyahs.some((ayah) => ayah.ayahNumber === ayahNumber)) {
        return `Ayah ${surahNumber}:${ayahNumber} already exists. Choose a missing Ayah number.`;
    }
    if (!arabicText.trim()) return "Arabic text is required.";

    for (const language of translationLanguages) {
        const translation = translations[language];
        const original = originalTranslations[language];
        const text = translation.text.trim();
        if (original?.text && !text) {
            return `The existing ${language.toUpperCase()} translation cannot be removed because the API does not provide a delete operation.`;
        }
        if (!text) continue;
        const translator = translators.find((item) => String(item.id) === translation.translatorId);
        if (!translator) return `Choose a registered ${language.toUpperCase()} translator.`;
        if (translator.languageCode !== language) {
            return `Choose a translator registered for ${language.toUpperCase()}.`;
        }
    }
    return "";
}

export async function saveAyahWithTranslations({
    surahNumber,
    ayahNumber,
    arabicText,
    status,
    editing,
    translations,
    originalTranslations,
}, api = quranAdminApi) {
    const payload = { surahNumber, ayahNumber, arabicText: arabicText.trim(), status };
    const ayah = editing
        ? await api.updateAyah(surahNumber, ayahNumber, payload)
        : await api.createAyah(payload);

    const savedLanguages = [];
    try {
        for (const language of translationLanguages) {
            const translation = translations[language];
            if (!translation.text.trim()) continue;
            const original = originalTranslations[language];
            const translationChanged = original
                && (original.text !== translation.text.trim()
                    || String(original.translatorId) !== translation.translatorId);
            const nextStatus = original?.status === "PUBLISHED" && translationChanged
                ? "DRAFT"
                : translation.status;
            if (original
                && original.text === translation.text.trim()
                && String(original.translatorId) === translation.translatorId
                && original.status === nextStatus) continue;
            await api.upsertTranslation(surahNumber, ayahNumber, language, {
                text: translation.text.trim(),
                translatorId: Number(translation.translatorId),
                status: nextStatus,
            });
            savedLanguages.push(language);
        }
    } catch (error) {
        const completed = savedLanguages.length
            ? ` ${savedLanguages.join(", ").toUpperCase()} translation${savedLanguages.length > 1 ? "s were" : " was"} saved. A later`
            : " A";
        throw new QuranAdminPartialSaveError(
            `Ayah ${surahNumber}:${ayahNumber} was saved.${completed} translation request failed: ${error instanceof Error ? error.message : "The translation request failed."}`,
            ayah,
        );
    }

    return { ayah, savedLanguages };
}

export async function changeAyahStatus(surahNumber, ayahNumber, status, api = quranAdminApi) {
    return api.setAyahStatus(surahNumber, ayahNumber, status);
}

export async function changeTranslationStatus(surahNumber, ayahNumber, language, status, translatorId, api = quranAdminApi) {
    return api.setTranslationStatus(surahNumber, ayahNumber, language, status, translatorId);
}
