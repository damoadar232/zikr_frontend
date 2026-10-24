export class QuranAdminApiError extends Error {
    status: number;
    code: string;
    data: unknown;
}

export interface QuranAdminApi {
    listSurahs(): Promise<any[]>;
    listAyahs(surah: number): Promise<any[]>;
    getAyah(surah: number, ayah: number): Promise<any>;
    createAyah(data: object): Promise<any>;
    updateAyah(surah: number, ayah: number, data: object): Promise<any>;
    setAyahStatus(surah: number, ayah: number, status: string): Promise<any>;
    listTranslations(surah: number, ayah: number): Promise<any[]>;
    upsertTranslation(surah: number, ayah: number, language: string, data: object): Promise<any>;
    setTranslationStatus(surah: number, ayah: number, language: string, status: string): Promise<any>;
    listTranslators(language?: string): Promise<any[]>;
    createTranslator(data: object): Promise<any>;
    validateImport(data: object): Promise<any>;
    commitImport(data: object): Promise<any>;
}

export declare function createQuranAdminApi(options?: {
    baseUrl?: string;
    auth?: { authenticatedFetch(path: string, options?: object): Promise<Response> };
}): QuranAdminApi;
export declare const quranAdminApi: QuranAdminApi;
