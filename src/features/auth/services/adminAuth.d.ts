export interface AdminSession {
    role: "ADMIN" | "SUPER_ADMIN";
    displayName: string;
    expiresAt: number;
}

export class AdminAuthenticationError extends Error { }
export class AdminApiError extends Error {
    status: number;
    code: string;
}

export interface AdminAuthService {
    login(email: string, password: string): Promise<AdminSession>;
    logout(): Promise<void>;
    refresh(): Promise<AdminSession>;
    authenticatedFetch(path: string, options?: RequestInit): Promise<Response>;
    getSession(): AdminSession | null;
    hasAdminSession(): boolean;
}

export declare const ADMIN_SESSION_KEY: string;
export declare const ADMIN_AUTH_EVENT: string;
export declare function createAdminAuth(options?: {
    baseUrl?: string;
    storage?: Storage | null;
    eventTarget?: EventTarget | null;
    fetchImpl?: typeof fetch;
    now?: () => number;
}): AdminAuthService;
export declare const adminAuth: AdminAuthService;