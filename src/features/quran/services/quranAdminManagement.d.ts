import type { QuranAdminApi } from "./quranAdminApi.js";

export interface AdminAyahTranslation {
    id?: number;
    languageCode: "en" | "hi" | "ur";
    text: string;
    translatorId: number;
    translatorName?: string;
    status: "DRAFT" | "PUBLISHED";
}

export interface AdminAyah {
    surahNumber: number;
    ayahNumber: number;
    arabicText: string;
    status: "DRAFT" | "PUBLISHED";
    translations: AdminAyahTranslation[];
}

export interface AdminTranslator {
    id: number;
    name: string;
    languageCode: "en" | "hi" | "ur";
    sourceRef: string;
    license: string;
}

export class QuranAdminPartialSaveError extends Error {
    ayah: AdminAyah;
}

export function loadSurahAyahs(surahNumber: number, concurrency?: number, api?: QuranAdminApi): Promise<AdminAyah[]>;
export function loadSurahMetadata(surahNumber: number, api?: QuranAdminApi): Promise<{
    number: number;
    arabicName: string;
    transliterated: string;
    englishMeaning: string;
    ayahCount: number;
    revelation: string;
    status: string;
} | null>;
export function loadSurahAyahRecords(surahNumber: number, api?: QuranAdminApi): Promise<Array<{
    surahNumber: number;
    ayahNumber: number;
    arabicText: string;
    status: "DRAFT" | "PUBLISHED";
}>>;
export function loadAyahDetails(surahNumber: number, ayahNumber: number, api?: QuranAdminApi): Promise<AdminAyah>;
export function validateAyahRecord(input: {
    surahNumber: number;
    ayahNumber: number;
    ayahCount?: number;
    arabicText: string;
    existingAyahs: AdminAyah[];
    editingAyahNumber?: number;
}): string;
export function saveAyahRecord(input: {
    surahNumber: number;
    ayahNumber: number;
    arabicText: string;
    status: "DRAFT" | "PUBLISHED";
    editing: boolean;
}, api?: QuranAdminApi): Promise<AdminAyah>;
export function saveTranslationRecord(input: {
    surahNumber: number;
    ayahNumber: number;
    languageCode: "en" | "hi" | "ur";
    translatorId: number | string;
    text: string;
    status: "DRAFT" | "PUBLISHED";
}, api?: QuranAdminApi): Promise<AdminAyahTranslation>;
export function validateAyahDraft(input: {
    surahNumber: number;
    ayahNumber: number;
    ayahCount?: number;
    arabicText: string;
    existingAyahs: AdminAyah[];
    editingAyahNumber?: number;
    translations: Record<string, { text: string; translatorId: string; status: string }>;
    translators: AdminTranslator[];
    originalTranslations: Record<string, { text: string; translatorId: number; status: string } | undefined>;
}): string;
export function saveAyahWithTranslations(input: {
    surahNumber: number;
    ayahNumber: number;
    arabicText: string;
    status: "DRAFT" | "PUBLISHED";
    editing: boolean;
    translations: Record<string, { text: string; translatorId: string; status: string }>;
    originalTranslations: Record<string, { text: string; translatorId: number; status: string } | undefined>;
}, api?: QuranAdminApi): Promise<{ ayah: AdminAyah; savedLanguages: string[] }>;
export function changeAyahStatus(surahNumber: number, ayahNumber: number, status: string, api?: QuranAdminApi): Promise<AdminAyah>;
export function changeTranslationStatus(surahNumber: number, ayahNumber: number, language: string, status: string, translatorId?: number, api?: QuranAdminApi): Promise<AdminAyahTranslation>;
