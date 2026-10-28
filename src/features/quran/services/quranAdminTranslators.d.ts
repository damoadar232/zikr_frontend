import type { AdminTranslator } from "./quranAdminManagement.js";

export function listQuranTranslators(
    language: "en" | "hi" | "ur",
    options?: { force?: boolean; api?: Pick<QuranAdminApi, "listTranslators"> },
): Promise<AdminTranslator[]>;

export function createQuranTranslator(input: {
    name: string;
    languageCode: "en" | "hi" | "ur";
    sourceRef: string;
    license: string;
    licenseNotes?: string;
}, api?: Pick<QuranAdminApi, "createTranslator">): Promise<AdminTranslator>;
