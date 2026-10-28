import type { ApiPublishedTranslation, ApiPublicTranslator } from "./quranApiService";

export const QURAN_TRANSLATOR_LANGUAGES: Array<{
    code: "en" | "hi" | "ur";
    label: string;
}>;

export function filterQuranTranslators(
    translators: ApiPublicTranslator[],
    search: string,
): ApiPublicTranslator[];

export function groupQuranTranslators(
    translators: ApiPublicTranslator[],
): Array<{
    code: "en" | "hi" | "ur";
    label: string;
    translators: ApiPublicTranslator[];
}>;

export function selectQuranAyahTranslations(
    translations: ApiPublishedTranslation[],
    selectedTranslatorIds: string[],
    translators: ApiPublicTranslator[],
    surahNumber: number,
    ayahNumber: number,
): ApiPublishedTranslation[];
