import { API_BASE_URL, requireApiBaseUrl } from "../../../app/config/apiBase.js";
import { adminAuth } from "../../auth/services/adminAuth.js";
import type { AudioRecord } from "../../../audioData.js";

export type AudioStatus = "DRAFT" | "PUBLISHED" | "INACTIVE";

class AudioApiError extends Error {
    status: number;
    code: string;

    constructor(message: string, status: number, code = "API_ERROR") {
        super(message);
        this.name = "AudioApiError";
        this.status = status;
        this.code = code;
    }
}

export interface AudioCategoryOption {
    categoryKey: string;
    name: string;
    description?: string | null;
}

export interface AudioLanguageOption {
    code: string;
    name: string;
    nativeName: string | null;
}

interface ApiArtistCredit {
    id: number;
    artistKey: string;
    fullName: string;
    displayName: string | null;
    position: number;
}

interface ApiAudioCategory extends AudioCategoryOption {
    active?: boolean;
}

interface ApiAudioLanguage extends AudioLanguageOption {
    active?: boolean;
}

interface ApiAudio {
    id: number;
    title: string;
    description: string | null;
    language: ApiAudioLanguage;
    categories: ApiAudioCategory[];
    singers: ApiArtistCredit[];
    writers: ApiArtistCredit[];
    audioUrl: string;
    audioDurationSeconds: number | null;
    coverImageUrl: string;
    publishedDate: string | null;
    status?: AudioStatus;
    audioPublicId?: string;
    coverImagePublicId?: string;
    originalAudioFilename?: string;
    originalCoverFilename?: string;
    audioFormat?: string;
    coverImageFormat?: string;
    audioSize?: number | null;
    createdAt?: string;
    updatedAt?: string;
}

interface ApiPage<T> {
    items: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

interface ApiEnvelope<T> {
    data: T;
    message?: string;
    error?: string;
}

export interface AdminAudioTrack {
    id: string;
    title: string;
    description: string;
    categoryKeys: string[];
    categoryNames: string[];
    languageCode: string;
    language: string;
    singerIds: string[];
    singerNames: string[];
    writerIds: string[];
    writerNames: string[];
    publishedAt: string;
    status: Lowercase<AudioStatus>;
    featured: false;
    coverImageUrl: string;
    audioUrl: string;
    audioFileName: string;
    audioFileSize: number | null;
}

export interface AdminAudioFilters {
    query?: string;
    categoryKey?: string;
    languageCode?: string;
    status?: AudioStatus;
}

export interface AudioMetadata {
    title: string;
    description: string;
    languageCode: string;
    categoryKeys: string[];
    singerIds: string[];
    writerIds: string[];
    publishedDate: string | null;
    status?: AudioStatus;
}

const publicListCache = new Map<string, AudioRecord[]>();
const publicListRequests = new Map<string, Promise<AudioRecord[]>>();
let publicCategoryCache: AudioCategoryOption[] | null = null;
let publicCategoryRequest: Promise<AudioCategoryOption[]> | null = null;

const palettes = ["green", "gold", "ink", "emerald", "sand", "wine"];

function formatDuration(seconds: number | null | undefined) {
    if (seconds == null || !Number.isFinite(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function artistName(artist: ApiArtistCredit) {
    return artist.displayName?.trim() || artist.fullName;
}

function toAudioRecord(audio: ApiAudio): AudioRecord {
    return {
        id: String(audio.id),
        title: audio.title,
        artist: audio.singers.map(artistName).join(", ") || audio.writers.map(artistName).join(", "),
        categories: audio.categories.map((category) => category.name),
        duration: formatDuration(audio.audioDurationSeconds),
        description: audio.description || "",
        date: audio.publishedDate || "",
        color: palettes[Math.abs(audio.id) % palettes.length],
        image: audio.coverImageUrl || "",
        source: audio.audioUrl || "",
        downloadable: false,
        isDemo: false,
        singers: audio.singers.map(artistName),
        writers: audio.writers.map(artistName),
        language: audio.language.name,
        languageCode: audio.language.code,
        publishedDate: audio.publishedDate,
    };
}

function toAdminAudioTrack(audio: ApiAudio): AdminAudioTrack {
    return {
        id: String(audio.id),
        title: audio.title,
        description: audio.description || "",
        categoryKeys: audio.categories.map((category) => category.categoryKey),
        categoryNames: audio.categories.map((category) => category.name),
        languageCode: audio.language.code,
        language: audio.language.name,
        singerIds: audio.singers.map((artist) => String(artist.id)),
        singerNames: audio.singers.map(artistName),
        writerIds: audio.writers.map((artist) => String(artist.id)),
        writerNames: audio.writers.map(artistName),
        publishedAt: audio.publishedDate || "",
        status: (audio.status || "DRAFT").toLowerCase() as Lowercase<AudioStatus>,
        featured: false,
        coverImageUrl: audio.coverImageUrl || "",
        audioUrl: audio.audioUrl || "",
        audioFileName: audio.originalAudioFilename || "",
        audioFileSize: audio.audioSize ?? null,
    };
}

async function readEnvelope<T>(response: Response, description: string): Promise<T> {
    let envelope: ApiEnvelope<T>;
    try {
        envelope = await response.json() as ApiEnvelope<T>;
    } catch {
        throw new AudioApiError(`${description} returned an invalid response.`, response.status, "INVALID_RESPONSE");
    }

    if (!response.ok) {
        throw new AudioApiError(
            typeof envelope?.message === "string" ? envelope.message : `${description} failed (${response.status}).`,
            response.status,
            typeof envelope?.error === "string" ? envelope.error : "API_ERROR",
        );
    }
    if (!envelope || typeof envelope !== "object" || !Object.prototype.hasOwnProperty.call(envelope, "data")) {
        throw new AudioApiError(`${description} response did not include data.`, response.status, "INVALID_RESPONSE");
    }
    return envelope.data;
}

async function publicRequest<T>(path: string): Promise<T> {
    const base = requireApiBaseUrl(API_BASE_URL);
    const response = await fetch(`${base}${path}`, { headers: { Accept: "application/json" } });
    return readEnvelope<T>(response, "Audio request");
}

async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    requireApiBaseUrl(API_BASE_URL);
    const response = await adminAuth.authenticatedFetch(path, {
        ...init,
        headers: {
            Accept: "application/json",
            ...init.headers,
        },
    });
    if (response.status === 204) return undefined as T;
    return readEnvelope<T>(response, "Audio request");
}

function withQuery(path: string, values: Record<string, string | number | undefined>) {
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== "") params.set(key, String(value));
    });
    const query = params.toString();
    return query ? `${path}?${query}` : path;
}

async function getAllPublicAudio(params: { query?: string; categoryKey?: string } = {}) {
    const first = await publicRequest<ApiPage<ApiAudio>>(withQuery("/api/public/audios", {
        page: 0,
        size: 100,
        query: params.query?.trim() || undefined,
        categoryKey: params.categoryKey,
    }));
    const remaining = await Promise.all(Array.from(
        { length: Math.max(0, first.totalPages - 1) },
        (_, index) => publicRequest<ApiPage<ApiAudio>>(withQuery("/api/public/audios", {
            page: index + 1,
            size: 100,
            query: params.query?.trim() || undefined,
            categoryKey: params.categoryKey,
        })),
    ));
    return [first, ...remaining].flatMap((page) => page.items).map(toAudioRecord);
}

export async function listPublicAudios(params: { query?: string; categoryKey?: string } = {}) {
    const key = JSON.stringify({ query: params.query?.trim() || "", categoryKey: params.categoryKey || "" });
    const cached = publicListCache.get(key);
    if (cached) return cached;

    const existing = publicListRequests.get(key);
    if (existing) return existing;

    const request = getAllPublicAudio(params)
        .then((tracks) => {
            publicListCache.set(key, tracks);
            return tracks;
        })
        .finally(() => publicListRequests.delete(key));
    publicListRequests.set(key, request);
    return request;
}

export async function getPublicAudio(id: string) {
    const audio = await publicRequest<ApiAudio>(`/api/public/audios/${encodeURIComponent(id)}`);
    return toAudioRecord(audio);
}

export async function listPublicAudioCategories() {
    if (publicCategoryCache) return publicCategoryCache;
    if (publicCategoryRequest) return publicCategoryRequest;

    const request = publicRequest<AudioCategoryOption[]>("/api/public/audio-categories")
        .then((categories) => {
            publicCategoryCache = categories;
            return categories;
        })
        .finally(() => {
            if (publicCategoryRequest === request) publicCategoryRequest = null;
        });
    publicCategoryRequest = request;
    return request;
}

export async function listAdminAudios(filters: AdminAudioFilters = {}) {
    const first = await adminRequest<ApiPage<ApiAudio>>(withQuery("/api/admin/audios", {
        page: 0,
        size: 100,
        query: filters.query?.trim() || undefined,
        categoryKey: filters.categoryKey,
        languageCode: filters.languageCode,
        status: filters.status,
        sort: "publishedDate",
        direction: "DESC",
    }));
    const remaining = await Promise.all(Array.from(
        { length: Math.max(0, first.totalPages - 1) },
        (_, index) => adminRequest<ApiPage<ApiAudio>>(withQuery("/api/admin/audios", {
            page: index + 1,
            size: 100,
            query: filters.query?.trim() || undefined,
            categoryKey: filters.categoryKey,
            languageCode: filters.languageCode,
            status: filters.status,
            sort: "publishedDate",
            direction: "DESC",
        })),
    ));
    return [first, ...remaining].flatMap((page) => page.items).map(toAdminAudioTrack);
}

export async function getAdminAudio(id: string) {
    return toAdminAudioTrack(await adminRequest<ApiAudio>(`/api/admin/audios/${encodeURIComponent(id)}`));
}

export async function listAdminAudioCategories() {
    return adminRequest<AudioCategoryOption[]>("/api/admin/audio-categories");
}

export async function listAdminAudioLanguages() {
    return adminRequest<AudioLanguageOption[]>("/api/admin/languages");
}

function metadataForRequest(values: AudioMetadata, includeStatus: boolean) {
    const artists = [
        ...values.singerIds.map((id, position) => ({ artistId: Number(id), role: "SINGER", position })),
        ...values.writerIds.map((id, position) => ({ artistId: Number(id), role: "WRITER", position })),
    ];
    return {
        title: values.title,
        description: values.description,
        languageCode: values.languageCode,
        categoryKeys: values.categoryKeys,
        artists,
        publishedDate: values.publishedDate || null,
        ...(includeStatus && values.status ? { status: values.status } : {}),
    };
}

function createAudioFormData(values: AudioMetadata, files: { audioFile?: File | null; coverImage?: File | null }, includeStatus: boolean) {
    const formData = new FormData();
    formData.append("data", new Blob([JSON.stringify(metadataForRequest(values, includeStatus))], {
        type: "application/json",
    }));
    if (files.audioFile) formData.append("audioFile", files.audioFile);
    if (files.coverImage) formData.append("coverImage", files.coverImage);
    return formData;
}

export async function createAdminAudio(
    values: AudioMetadata,
    files: { audioFile?: File | null; coverImage?: File | null },
) {
    const body = createAudioFormData(values, files, true);
    return toAdminAudioTrack(await adminRequest<ApiAudio>("/api/admin/audios", { method: "POST", body }));
}

export async function updateAdminAudio(
    id: string,
    values: AudioMetadata,
    files: { audioFile?: File | null; coverImage?: File | null },
) {
    const body = createAudioFormData(values, files, false);
    return toAdminAudioTrack(await adminRequest<ApiAudio>(`/api/admin/audios/${encodeURIComponent(id)}`, {
        method: "PUT",
        body,
    }));
}

export async function updateAdminAudioStatus(id: string, status: AudioStatus) {
    const updated = await adminRequest<ApiAudio>(`/api/admin/audios/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    return toAdminAudioTrack(updated);
}

export async function deleteAdminAudio(id: string) {
    await adminRequest<void>(`/api/admin/audios/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function invalidateAudioListCache() {
    publicListCache.clear();
    publicListRequests.clear();
}
