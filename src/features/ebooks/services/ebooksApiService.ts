import { API_BASE_URL, requireApiBaseUrl } from "../../../app/config/apiBase.js";
import { adminAuth, AdminApiError } from "../../auth/services/adminAuth.js";
import { artistsApi } from "../../artists/services/artistsApiService.js";

export type EbookStatus = "DRAFT" | "PUBLISHED" | "INACTIVE";

export interface EbookCategory {
    categoryKey: string;
    name: string;
    description?: string | null;
    active?: boolean;
}

export interface EbookAuthor {
    id: number;
    artistKey: string;
    fullName: string;
    displayName: string | null;
    position?: number;
}

export interface EbookLanguage {
    code: string;
    name: string;
    nativeName: string | null;
    active?: boolean;
}

export interface EbookRecord {
    id: number;
    title: string;
    description: string;
    coverImageUrl: string;
    categories: EbookCategory[];
    authors: EbookAuthor[];
    language: EbookLanguage;
    publishedDate: string;
    status: EbookStatus;
    createdAt?: string;
    updatedAt?: string;
    originalCoverFilename?: string;
    originalBookFilename?: string;
    bookFileFormat?: string;
    bookFileSize?: number | null;
    coverImageFormat?: string;
    coverImageSize?: number | null;
}

export interface EbookPage {
    items: EbookRecord[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export interface EbookLibraryItem {
    id: string;
    title: string;
    author: string;
    authors: EbookAuthor[];
    category: string;
    categories: EbookCategory[];
    categoryKeys: string[];
    date: string;
    publishedDate: string;
    description: string;
    language: string;
    languageCode: string;
    format: string;
    access: string;
    downloadable: boolean;
    color: string;
    image: string;
    coverImageUrl: string;
}

interface ApiEnvelope<T> {
    data: T;
    error?: string;
    message?: string;
}

interface LanguageOption {
    code: string;
    name: string;
    nativeName: string | null;
    active: boolean;
}

export interface AdminEbookFilters {
    page: number;
    size: number;
    search?: string;
    categoryKey?: string;
    authorId?: string;
    languageCode?: string;
    status?: string;
}

export interface EbookMetadata {
    title: string;
    description: string;
    languageCode: string;
    categoryKeys: string[];
    authorIds: number[];
    publishedDate: string;
    status?: EbookStatus;
}

export interface EbookMediaFiles {
    coverFile?: File | null;
    pdfFile?: File | null;
}

export interface EbookOptionData {
    categories: { value: string; label: string }[];
    authors: { value: string; label: string; description: string }[];
    languages: { code: string; name: string }[];
}

export interface EbookDeliveryLink {
    url: string;
    expiresAt: string;
}

const publicListCache = new Map<string, EbookLibraryItem[]>();
const publicListRequests = new Map<string, Promise<EbookLibraryItem[]>>();
const palettes = ["emerald", "wine", "navy", "sand", "green"];

function createEbookApiError(message: string, status: number, code: string) {
    const error = new AdminApiError(message);
    Object.assign(error, { status, code });
    return error;
}

function withQuery(path: string, values: Record<string, string | number | undefined>) {
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== "") params.set(key, String(value));
    });
    const query = params.toString();
    return query ? `${path}?${query}` : path;
}

async function readEnvelope<T>(response: Response, description: string): Promise<T> {
    let envelope: ApiEnvelope<T>;
    try {
        envelope = await response.json() as ApiEnvelope<T>;
    } catch {
        throw createEbookApiError(`${description} returned an invalid response.`, response.status, "INVALID_RESPONSE");
    }

    if (!response.ok) {
        throw createEbookApiError(
            typeof envelope?.message === "string" ? envelope.message : `${description} failed (${response.status}).`,
            response.status,
            typeof envelope?.error === "string" ? envelope.error : "API_ERROR",
        );
    }
    if (!envelope || typeof envelope !== "object" || !Object.prototype.hasOwnProperty.call(envelope, "data")) {
        throw createEbookApiError(`${description} response did not include data.`, response.status, "INVALID_RESPONSE");
    }
    return envelope.data;
}

async function publicRequest<T>(path: string): Promise<T> {
    const base = requireApiBaseUrl(API_BASE_URL);
    const response = await fetch(`${base}${path}`, { headers: { Accept: "application/json" } });
    return readEnvelope<T>(response, "Ebook request");
}

async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    requireApiBaseUrl(API_BASE_URL);
    const response = await adminAuth.authenticatedFetch(path, {
        ...init,
        headers: { Accept: "application/json", ...init.headers },
    });
    if (response.status === 204) return undefined as T;
    return readEnvelope<T>(response, "Ebook request");
}

function toLibraryItem(ebook: EbookRecord): EbookLibraryItem {
    const authorNames = ebook.authors.map((author) => author.displayName?.trim() || author.fullName);
    const categoryNames = ebook.categories.map((category) => category.name);
    const languageName = ebook.language?.name || "";
    return {
        id: String(ebook.id),
        title: ebook.title,
        author: authorNames.join(", "),
        authors: ebook.authors,
        category: categoryNames.join(" • "),
        categories: ebook.categories,
        categoryKeys: ebook.categories.map((category) => category.categoryKey),
        date: ebook.publishedDate || "",
        publishedDate: ebook.publishedDate || "",
        description: ebook.description || "",
        language: languageName,
        languageCode: ebook.language?.code || "",
        format: "PDF",
        access: "Read online",
        downloadable: true,
        color: palettes[ebook.id % palettes.length],
        image: ebook.coverImageUrl || "",
        coverImageUrl: ebook.coverImageUrl || "",
    };
}

function buildEbookFormData(values: EbookMetadata, files: EbookMediaFiles, includeStatus: boolean) {
    const metadata = {
        title: values.title,
        description: values.description,
        languageCode: values.languageCode,
        categoryKeys: values.categoryKeys,
        authorIds: values.authorIds,
        publishedDate: values.publishedDate,
        ...(includeStatus && values.status ? { status: values.status } : {}),
    };
    const formData = new FormData();
    formData.append("data", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    if (files.coverFile) formData.append("coverImage", files.coverFile);
    if (files.pdfFile) formData.append("bookFile", files.pdfFile);
    return formData;
}

export async function listAdminEbooks(filters: AdminEbookFilters): Promise<EbookPage> {
    const path = withQuery("/api/admin/ebooks", {
        page: filters.page,
        size: filters.size,
        search: filters.search?.trim() || undefined,
        categoryKey: filters.categoryKey,
        authorId: filters.authorId,
        languageCode: filters.languageCode,
        status: filters.status?.toUpperCase(),
        sort: "publishedDate",
        direction: "DESC",
    });
    return adminRequest<EbookPage>(path);
}

export async function getAdminEbook(id: string): Promise<EbookRecord> {
    return adminRequest<EbookRecord>(`/api/admin/ebooks/${encodeURIComponent(id)}`);
}

export async function getAdminEbookOptions(): Promise<EbookOptionData> {
    const [categories, languages, authors] = await Promise.all([
        adminRequest<EbookCategory[]>("/api/admin/ebooks/categories"),
        adminRequest<LanguageOption[]>("/api/admin/languages"),
        artistsApi.getArtistOptions(),
    ]);
    return {
        categories: categories.map((category) => ({ value: category.categoryKey, label: category.name })),
        authors: authors.map((author) => ({
            value: String(author.id),
            label: author.displayName?.trim() || author.fullName,
            description: author.roles?.join(", ") || "",
        })),
        languages: languages.map((language) => ({ code: language.code, name: language.name })),
    };
}

export async function createAdminEbook(
    values: EbookMetadata,
    files: EbookMediaFiles,
): Promise<EbookRecord> {
    const result = await adminRequest<EbookRecord>("/api/admin/ebooks", {
        method: "POST",
        body: buildEbookFormData(values, files, true),
    });
    invalidatePublicEbookCache();
    return result;
}

export async function updateAdminEbook(
    id: string,
    values: EbookMetadata,
    files: EbookMediaFiles,
): Promise<EbookRecord> {
    const result = await adminRequest<EbookRecord>(`/api/admin/ebooks/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: buildEbookFormData(values, files, false),
    });
    invalidatePublicEbookCache();
    return result;
}

export async function updateAdminEbookStatus(id: string, status: EbookStatus): Promise<EbookRecord> {
    const result = await adminRequest<EbookRecord>(`/api/admin/ebooks/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    invalidatePublicEbookCache();
    return result;
}

export async function deleteAdminEbook(id: string): Promise<void> {
    await adminRequest<void>(`/api/admin/ebooks/${encodeURIComponent(id)}`, { method: "DELETE" });
    invalidatePublicEbookCache();
}

export async function getPublicEbook(id: string): Promise<EbookLibraryItem> {
    const ebook = await publicRequest<EbookRecord>(`/api/public/ebooks/${encodeURIComponent(id)}`);
    if (ebook.status !== "PUBLISHED") {
        throw createEbookApiError("Ebook not found.", 404, "NOT_FOUND");
    }
    return toLibraryItem(ebook);
}

export async function getPublicEbookReadLink(id: string): Promise<EbookDeliveryLink> {
    return publicRequest<EbookDeliveryLink>(`/api/public/ebooks/${encodeURIComponent(id)}/read`);
}

export async function getPublicEbookDownloadLink(id: string): Promise<EbookDeliveryLink> {
    return publicRequest<EbookDeliveryLink>(`/api/public/ebooks/${encodeURIComponent(id)}/download`);
}

async function fetchAllPublicEbooks(): Promise<EbookLibraryItem[]> {
    const first = await publicRequest<EbookPage>("/api/public/ebooks?page=0&size=100");
    const remaining = await Promise.all(Array.from(
        { length: Math.max(0, first.totalPages - 1) },
        (_, index) => publicRequest<EbookPage>(`/api/public/ebooks?page=${index + 1}&size=100`),
    ));
    return [first, ...remaining]
        .flatMap((page) => page.items)
        .filter((ebook) => ebook.status === "PUBLISHED")
        .map(toLibraryItem)
        .sort((left, right) => right.publishedDate.localeCompare(left.publishedDate));
}

export function listPublicEbooks(): Promise<EbookLibraryItem[]> {
    const cached = publicListCache.get("all");
    if (cached) return Promise.resolve(cached);
    const activeRequest = publicListRequests.get("all");
    if (activeRequest) return activeRequest;

    const request = fetchAllPublicEbooks()
        .then((books) => {
            publicListCache.set("all", books);
            return books;
        })
        .finally(() => publicListRequests.delete("all"));
    publicListRequests.set("all", request);
    return request;
}

export function invalidatePublicEbookCache() {
    publicListCache.clear();
    publicListRequests.clear();
}
