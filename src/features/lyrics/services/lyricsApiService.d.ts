import type { JSONContent } from "@tiptap/core";
import type { AdminApiError, AdminAuthService } from "../../auth/services/adminAuth.js";

export type ApiContentStatus = "DRAFT" | "PUBLISHED";
export type ApiLyricLanguage = "ur" | "hi" | "roman";

export interface ApiLanguageVersion {
    id: number;
    languageCode: ApiLyricLanguage;
    document: JSONContent;
    plainText: string | null;
    createdAt: string;
    updatedAt: string;
    rowVersion: number;
}

export interface ApiMediaReference {
    mediaType: "AUDIO" | "VIDEO";
    title: string;
    url: string;
}

export interface ApiLyricSubject {
    id: string;
    name: string;
    numericId: number;
}

export interface ApiPublicSubject {
    id: string;
    name: string;
}

export interface ApiAdminLyric {
    id: number;
    legacyId: string;
    title: string;
    slug: string;
    artistId: number | null;
    artistIds: number[];
    reciters: string[];
    writerId: number | null;
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
    document: JSONContent | null;
    contentFormat: "TIPTAP_JSON" | "HTML";
    content: string | null;
    text: string | null;
}

export interface ApiPublicLyric {
    id: string;
    title: string;
    slug: string;
    artistId: number | null;
    artistIds: number[];
    reciters: string[];
    writerId: number | null;
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
    artistId?: number | string | null;
    artistIds?: Array<number | string>;
    reciters?: string[];
    writerId?: number | string | null;
    writerName?: string | null;
    categoryIds?: string[];
    subjectIds?: string[];
    tags?: string[];
    bookId?: string | null;
    coverImageUrl?: string | null;
    featured?: boolean;
    mediaReferences?: ApiMediaReference[];
}

export interface CombinedLyricsCreateRequest {
    title: string;
    slug?: string;
    writerId?: number | null;
    reciterIds?: number[];
    artistId?: number | null;
    categoryIds?: number[];
    subjectIds?: number[];
    tags?: string[];
    bookId?: string | null;
    featured?: boolean;
    mediaReferences?: ApiMediaReference[];
}

export type CombinedLyricsUpdateRequest = CombinedLyricsCreateRequest;

export interface LyricsApiService {
    listAdminLyrics(options?: { page?: number; size?: number; status?: ApiContentStatus; query?: string }): Promise<ApiPage<ApiAdminLyric>>;
    listAdminSubjects(): Promise<ApiLyricSubject[]>;
    listPublicLyrics(options?: { page?: number; size?: number; category?: string; reciter?: string; poet?: string; language?: ApiLyricLanguage }): Promise<ApiPage<ApiPublicLyric>>;
    listPublicSubjects(): Promise<ApiPublicSubject[]>;
    listAllPublicLyrics(options?: { size?: number; category?: string; reciter?: string; poet?: string; language?: ApiLyricLanguage }): Promise<ApiPublicLyric[]>;
    getPublicLyric(reference: string): Promise<ApiPublicLyric>;
    loadLyricForEditing(reference: string): Promise<ApiAdminLyric>;
    createLyric(request: CombinedLyricsCreateRequest): Promise<ApiAdminLyric>;
    updateLyricMetadata(reference: string, request: CombinedLyricsUpdateRequest): Promise<ApiAdminLyric>;
    loadLanguageVersion(reference: string, languageCode: ApiLyricLanguage): Promise<ApiLanguageVersion | null>;
    saveLanguageVersion(reference: string, languageCode: ApiLyricLanguage, document: JSONContent, expectedRowVersion: number | null, changeNote?: string): Promise<ApiAdminLyric>;
    setLyricStatus(reference: string, status: ApiContentStatus): Promise<ApiAdminLyric>;
    deleteLyric(reference: string): Promise<void>;
}

export declare function createLyricsApi(options?: { baseUrl?: string; auth?: AdminAuthService; fetchImpl?: typeof fetch }): LyricsApiService;
export declare const lyricsApi: LyricsApiService;
export { AdminApiError };