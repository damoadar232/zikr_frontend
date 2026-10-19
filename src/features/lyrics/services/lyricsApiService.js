import { API_BASE_URL, requireApiBaseUrl } from "../../../app/config/apiBase.js";
import { AdminApiError, adminAuth } from "../../auth/services/adminAuth.js";

function queryString(values) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values || {})) {
        if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
    }
    const result = params.toString();
    return result ? `?${result}` : "";
}

export function createLyricsApi({ baseUrl = API_BASE_URL, auth = adminAuth, fetchImpl = globalThis.fetch } = {}) {
    const request = async (path, { method = "GET", body, authenticated = true } = {}) => {
        const base = requireApiBaseUrl(baseUrl);
        const options = {
            method,
            headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        };
        const response = authenticated
            ? await auth.authenticatedFetch(path, options)
            : await fetchImpl(`${base}${path}`, options);
        if (response.status === 204) return undefined;
        let envelope = {};
        try {
            envelope = await response.json();
        } catch {
            // Use a generic API error if an upstream response is not JSON.
        }
        if (!response.ok) {
            throw new AdminApiError(
                typeof envelope.message === "string" ? envelope.message : `Lyrics request failed (${response.status}).`,
                response.status,
                typeof envelope.error === "string" ? envelope.error : "API_ERROR",
            );
        }
        return envelope.data;
    };

    const listAdminLyrics = (options = {}) => request(`/api/v1/admin/lyrics${queryString(options)}`);
    const loadLyricForEditing = (reference) => request(`/api/v1/admin/lyrics/${encodeURIComponent(reference)}`);
    const createLyric = (metadata) => request("/api/v1/admin/lyrics", { method: "POST", body: metadata });
    const updateLyricMetadata = (reference, metadata) => request(
        `/api/v1/admin/lyrics/${encodeURIComponent(reference)}`, { method: "PUT", body: metadata });
    const loadLanguageVersion = async (reference, languageCode) => {
        const lyric = await loadLyricForEditing(reference);
        return lyric.languageVersions.find((version) => version.languageCode === languageCode) || null;
    };
    const saveLanguageVersion = (reference, languageCode, document, expectedRowVersion, changeNote) => request(
        `/api/v1/admin/lyrics/${encodeURIComponent(reference)}/languages/${encodeURIComponent(languageCode)}`,
        { method: "PUT", body: { document, expectedRowVersion, changeNote } });
    const setLanguageStatus = (reference, languageCode, status) => request(
        `/api/v1/admin/lyrics/${encodeURIComponent(reference)}/languages/${encodeURIComponent(languageCode)}/status`,
        { method: "PATCH", body: { status } });
    const setLyricStatus = (reference, status) => request(
        `/api/v1/admin/lyrics/${encodeURIComponent(reference)}/status`, { method: "PATCH", body: { status } });
    const loadPublicationStatus = async (reference) => {
        const lyric = await loadLyricForEditing(reference);
        return {
            status: lyric.status, languageVersions: lyric.languageVersions.map((version) => ({
                languageCode: version.languageCode,
                status: version.status,
                rowVersion: version.rowVersion,
            }))
        };
    };
    const deleteLyric = (reference) => request(`/api/v1/admin/lyrics/${encodeURIComponent(reference)}`, { method: "DELETE" });
    const listPublicLyrics = (options = {}) => request(`/api/v1/lyrics${queryString(options)}`, { authenticated: false });

    return {
        listAdminLyrics,
        listPublicLyrics,
        loadLyricForEditing,
        createLyric,
        updateLyricMetadata,
        loadLanguageVersion,
        saveLanguageVersion,
        setLanguageStatus,
        setLyricStatus,
        loadPublicationStatus,
        deleteLyric,
    };
}

export const lyricsApi = createLyricsApi();