import { API_BASE_URL, requireApiBaseUrl } from "../../../app/config/apiBase.js";

export const ADMIN_SESSION_KEY = "zikr-admin-session-v1";
export const ADMIN_AUTH_EVENT = "zikr-auth-state";

export class AdminAuthenticationError extends Error {
    constructor(message = "Your administrator session has expired. Sign in again.") {
        super(message);
        this.name = "AdminAuthenticationError";
    }
}

export class AdminApiError extends Error {
    constructor(message, status, code = "API_ERROR") {
        super(message);
        this.name = "AdminApiError";
        this.status = status;
        this.code = code;
    }
}

function getSessionStorage() {
    try {
        return globalThis.sessionStorage || null;
    } catch {
        return null;
    }
}

async function readEnvelope(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

export function createAdminAuth({
    baseUrl = API_BASE_URL,
    storage = getSessionStorage(),
    eventTarget = globalThis.window,
    fetchImpl = globalThis.fetch,
    now = () => Date.now(),
} = {}) {
    let refreshRequest = null;

    const notify = () => eventTarget?.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
    const clearSession = () => {
        try {
            storage?.removeItem(ADMIN_SESSION_KEY);
        } catch {
            // Storage can be unavailable in privacy-restricted contexts.
        }
        notify();
    };
    const readSession = () => {
        try {
            const session = JSON.parse(storage?.getItem(ADMIN_SESSION_KEY) || "null");
            if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.role)
                || typeof session.accessToken !== "string" || typeof session.refreshToken !== "string") return null;
            return session;
        } catch {
            return null;
        }
    };
    const saveSession = (tokens) => {
        if (!tokens || !["ADMIN", "SUPER_ADMIN"].includes(tokens.role)
            || typeof tokens.accessToken !== "string" || typeof tokens.refreshToken !== "string") {
            throw new AdminAuthenticationError("This account is not authorized to manage content.");
        }
        const session = {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: now() + Number(tokens.expiresIn || 0) * 1000,
            role: tokens.role,
            displayName: tokens.displayName || "Administrator",
        };
        try {
            if (!storage) throw new Error("Session storage is unavailable.");
            storage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
        } catch {
            throw new Error("Secure session storage is unavailable in this browser.");
        }
        notify();
        return publicSession(session);
    };
    const publicSession = (session) => session ? {
        role: session.role,
        displayName: session.displayName,
        expiresAt: session.expiresAt,
    } : null;

    const login = async (email, password) => {
        const base = requireApiBaseUrl(baseUrl);
        const response = await fetchImpl(`${base}/api/v1/auth/login`, {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const envelope = await readEnvelope(response);
        if (!response.ok) {
            throw new AdminApiError(envelope.message || "Sign-in failed.", response.status, envelope.error);
        }
        return saveSession(envelope.data);
    };

    const refresh = async () => {
        if (refreshRequest) return refreshRequest;
        const session = readSession();
        if (!session?.refreshToken) {
            clearSession();
            throw new AdminAuthenticationError();
        }
        refreshRequest = (async () => {
            try {
                const base = requireApiBaseUrl(baseUrl);
                const response = await fetchImpl(`${base}/api/v1/auth/refresh`, {
                    method: "POST",
                    headers: { Accept: "application/json", "Content-Type": "application/json" },
                    body: JSON.stringify({ refreshToken: session.refreshToken }),
                });
                const envelope = await readEnvelope(response);
                if (!response.ok) throw new AdminAuthenticationError();
                return saveSession(envelope.data);
            } catch (error) {
                clearSession();
                throw error instanceof AdminAuthenticationError
                    ? error
                    : new AdminAuthenticationError();
            } finally {
                refreshRequest = null;
            }
        })();
        return refreshRequest;
    };

    const authenticatedFetch = async (path, options = {}) => {
        requireApiBaseUrl(baseUrl);
        let session = readSession();
        if (!session) throw new AdminAuthenticationError();
        if (session.expiresAt <= now() + 15_000) {
            await refresh();
            session = readSession();
        }
        const send = (accessToken) => fetchImpl(`${baseUrl.replace(/\/$/, "")}${path}`, {
            ...options,
            headers: {
                Accept: "application/json",
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...options.headers,
                Authorization: `Bearer ${accessToken}`,
            },
        });
        let response = await send(session.accessToken);
        if (response.status !== 401) return response;
        try {
            await refresh();
        } catch {
            throw new AdminAuthenticationError();
        }
        session = readSession();
        if (!session) throw new AdminAuthenticationError();
        response = await send(session.accessToken);
        if (response.status === 401) {
            clearSession();
            throw new AdminAuthenticationError();
        }
        return response;
    };

    const logout = async () => {
        try {
            if (readSession()) await authenticatedFetch("/api/v1/auth/logout", { method: "POST" });
        } catch {
            // Local session is always cleared, even if the server is unavailable.
        } finally {
            clearSession();
        }
    };

    return {
        login,
        logout,
        refresh,
        authenticatedFetch,
        getSession: () => publicSession(readSession()),
        hasAdminSession: () => !!readSession(),
    };
}

export const adminAuth = createAdminAuth();