import type { JSONContent } from "@tiptap/core";
import type { AdminApiError, AdminAuthService } from "../../auth/services/adminAuth.js";

export type ApiContentStatus = "DRAFT" | "PUBLISHED";
export type ApiLyricLanguage = "ur" | "hi" | "roman";

export interface ApiLanguageVersion {
    id: number;
    languageCode: ApiLyricLanguage;
    document: JSONContent;
    plainText: string | null;
    status: ApiContentStatus;
    createdAt: string;
    updatedAt: string;
    rowVersion: number;
}

export interface ApiMediaReference {
    mediaType: "AUDIO" | "VIDEO";
    title: string;
    url: string;
}

export interface ApiAdminLyric {
    id: number;
    legacyId: string;
    title: string;
    slug: string;
    artistId: string | null;
    artistIds: string[];
    reciters: string[];
    writerId: string | null;
    writer: string | null;
    categoryIds: string[];
    subjectIds: string[];
    tags: string[];
    bookId: string | null;
    coverImageUrl: string | null;
    featured: boolean;
    status: ApiContentStatus;
    createdAt: string;
    updatedAt: string;
    languageVersions: ApiLanguageVersion[];
    mediaReferences: ApiMediaReference[];
}

export interface ApiPublicLanguageVersion {
    code: ApiLyricLanguage;
    label: string;
    script: string;
    dir: "ltr" | "rtl";
    document: JSONContent;
    text: string | null;
}

export interface ApiPublicLyric {
    id: string;
    title: string;
    slug: string;
    artistId: string | null;
    artistIds: string[];
    reciters: string[];
    writerId: string | null;
    writer: string | null;
    categoryIds: string[];
    subjectIds: string[];
    tags: string[];
    bookId: string | null;
    image: string | null;
    featured: boolean;
    createdAt: string;
    languageVersions: ApiPublicLanguageVersion[];
    relatedAudio: ApiMediaReference[];
    relatedVideos: ApiMediaReference[];
}

export interface ApiPage<T> {
    items: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export interface LyricsMetadataRequest {
    legacyId?: string;
    title: string;
    slug?: string;
    artistId?: string | null;
    artistIds?: string[];
    reciters?: string[];
    writerId?: string | null;
    writerName?: string | null;
    categoryIds?: string[];
    subjectIds?: string[];
    tags?: string[];
    bookId?: string | null;
    coverImageUrl?: string | null;
    featured?: boolean;
    mediaReferences?: ApiMediaReference[];
}

export interface LyricsApiService {
    listAdminLyrics(options?: { page?: number; size?: number; status?: ApiContentStatus; query?: string }): Promise<ApiPage<ApiAdminLyric>>;
    listPublicLyrics(options?: { page?: number; size?: number; category?: string; reciter?: string; poet?: string; language?: ApiLyricLanguage }): Promise<ApiPage<ApiPublicLyric>>;
    loadLyricForEditing(reference: string): Promise<ApiAdminLyric>;
    createLyric(metadata: LyricsMetadataRequest): Promise<ApiAdminLyric>;
    updateLyricMetadata(reference: string, metadata: LyricsMetadataRequest): Promise<ApiAdminLyric>;
    loadLanguageVersion(reference: string, languageCode: ApiLyricLanguage): Promise<ApiLanguageVersion | null>;
    saveLanguageVersion(reference: string, languageCode: ApiLyricLanguage, document: JSONContent, expectedRowVersion: number | null, changeNote?: string): Promise<ApiAdminLyric>;
    setLanguageStatus(reference: string, languageCode: ApiLyricLanguage, status: ApiContentStatus): Promise<ApiAdminLyric>;
    setLyricStatus(reference: string, status: ApiContentStatus): Promise<ApiAdminLyric>;
    loadPublicationStatus(reference: string): Promise<{ status: ApiContentStatus; languageVersions: Array<{ languageCode: ApiLyricLanguage; status: ApiContentStatus; rowVersion: number }> }>;
    deleteLyric(reference: string): Promise<void>;
}

export declare function createLyricsApi(options?: { baseUrl?: string; auth?: AdminAuthService; fetchImpl?: typeof fetch }): LyricsApiService;
export declare const lyricsApi: LyricsApiService;
export { AdminApiError };