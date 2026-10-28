export const QURAN_TRANSLATOR_LANGUAGES = [
    { code: "en", label: "English" },
    { code: "hi", label: "Hindi" },
    { code: "ur", label: "Urdu" },
];

export function filterQuranTranslators(translators, search) {
    const query = search.trim().toLowerCase();
    if (!query) return translators;
    return translators.filter((translator) => {
        const language = QURAN_TRANSLATOR_LANGUAGES.find(
            (item) => item.code === translator.languageCode,
        )?.label ?? translator.languageCode;
        return `${translator.name} ${language} ${translator.languageCode}`
            .toLowerCase()
            .includes(query);
    });
}

export function groupQuranTranslators(translators) {
    return QURAN_TRANSLATOR_LANGUAGES.map((language) => ({
        ...language,
        translators: translators.filter((translator) => translator.languageCode === language.code),
    }));
}

export function selectQuranAyahTranslations(
    translations,
    selectedTranslatorIds,
    translators,
    surahNumber,
    ayahNumber,
) {
    const selectedIds = new Set(selectedTranslatorIds);
    const languageByTranslatorId = new Map(
        translators.map((translator) => [String(translator.id), translator.languageCode]),
    );
    return translations.filter((translation) =>
        translation.surahNumber === surahNumber
        && translation.ayahNumber === ayahNumber
        && selectedIds.has(String(translation.translatorId))
        && languageByTranslatorId.get(String(translation.translatorId)) === translation.languageCode,
    );
}
