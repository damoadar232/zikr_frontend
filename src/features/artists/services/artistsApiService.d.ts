import type { AdminApiError, AdminAuthService } from "../../auth/services/adminAuth.js";

export type ApiArtistStatus = "ACTIVE" | "INACTIVE";
export type ApiArtistRoleCode = "SINGER" | "WRITER" | "LYRICIST" | "POET" | "RECITER" | "NAAT_KHWAN" | "COMPOSER" | "OTHER";

export interface ApiArtist {
    id: number; artistKey: string; numericId: number;
    fullName: string; displayName: string | null;
    roles: ApiArtistRoleCode[]; biography: string | null; status: ApiArtistStatus;
    createdAt: string; updatedAt: string;
}

export interface ApiArtistOption {
    id: number; artistKey: string;
    fullName: string; displayName: string | null;
    roles: ApiArtistRoleCode[]; status: ApiArtistStatus;
}

export interface ApiArtistRoleDto { code: ApiArtistRoleCode; label: string; }

export interface ApiArtistPage {
    items: ApiArtist[]; page: number; size: number;
    totalElements: number; totalPages: number;
}

export interface ArtistListParams {
    page?: number;
    size?: number;
    status?: ApiArtistStatus;
    role?: string;
    query?: string;
}

export interface ArtistOptionsParams {
    role?: string;
    query?: string;
}

export interface CreateArtistRequest { fullName: string; displayName?: string; roles: ApiArtistRoleCode[]; biography?: string; status?: ApiArtistStatus; }
export interface UpdateArtistRequest { fullName: string; displayName?: string; roles: ApiArtistRoleCode[]; biography?: string; status?: ApiArtistStatus; }

export interface ArtistsApiService {
    getArtists(options?: ArtistListParams): Promise<ApiArtistPage>;
    getArtistById(id: string | number): Promise<ApiArtist>;
    createArtist(data: CreateArtistRequest): Promise<ApiArtist>;
    updateArtist(id: string | number, data: UpdateArtistRequest): Promise<ApiArtist>;
    updateArtistStatus(id: string | number, status: ApiArtistStatus): Promise<ApiArtist>;
    deleteArtist(id: string | number): Promise<void>;
    getArtistRoles(): Promise<ApiArtistRoleDto[]>;
    getArtistOptions(options?: ArtistOptionsParams): Promise<ApiArtistOption[]>;
    listArtists(options?: ArtistListParams): Promise<ApiArtistPage>;
    getArtist(id: string | number): Promise<ApiArtist>;
    setArtistStatus(id: string | number, status: ApiArtistStatus): Promise<ApiArtist>;
    getRoles(): Promise<ApiArtistRoleDto[]>;
    getPublicArtistOptions(options?: ArtistOptionsParams): Promise<ApiArtistOption[]>;
    getPublicRoles(): Promise<ApiArtistRoleDto[]>;
}

export declare function createArtistsApi(options?: { baseUrl?: string; auth?: AdminAuthService; fetchImpl?: typeof fetch }): ArtistsApiService;
export declare const artistsApi: ArtistsApiService;
export { AdminApiError };