import { API_BASE_URL, requireApiBaseUrl } from "../../../app/config/apiBase.js";
import { AdminApiError, adminAuth } from "../../auth/services/adminAuth.js";
import { sanitizeLyricDocument } from "../utils/lyricDocumentSafety.ts";

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

    const listAdminLyrics = ({ page, size, status, query } = {}) => request(
        `/api/v1/admin/lyrics${queryString({ page, size, status, query })}`);
    const listAdminSubjects = () => request("/api/v1/admin/lyrics/subjects");
    const loadLyricForEditing = (reference) => request(`/api/v1/admin/lyrics/${encodeURIComponent(reference)}`);
    const createLyric = (metadata) => request("/api/v1/admin/lyrics", { method: "POST", body: metadata });
    const updateLyricMetadata = (reference, metadata) => request(
        `/api/v1/admin/lyrics/${encodeURIComponent(reference)}`, { method: "PUT", body: metadata });
    const loadLanguageVersion = async (reference, languageCode) => {
        const lyric = await loadLyricForEditing(reference);
        return lyric.languageVersions.find((version) => version.languageCode === languageCode) || null;
    };
    const saveLanguageVersion = async (reference, languageCode, document, expectedRowVersion, changeNote) => {
        const normalizedDocument = sanitizeLyricDocument(document, { rejectInvalidColors: true });
        return request(
            `/api/v1/admin/lyrics/${encodeURIComponent(reference)}/languages/${encodeURIComponent(languageCode)}`,
            { method: "PUT", body: { document: normalizedDocument, expectedRowVersion, changeNote } });
    };
    const setLyricStatus = (reference, status) => request(
        `/api/v1/admin/lyrics/${encodeURIComponent(reference)}/status`, { method: "PATCH", body: { status } });
    const deleteLyric = (reference) => request(`/api/v1/admin/lyrics/${encodeURIComponent(reference)}`, { method: "DELETE" });
    const listPublicLyrics = (options = {}) => request(`/api/v1/lyrics${queryString(options)}`, { authenticated: false });
    const listPublicSubjects = () => request("/api/v1/lyrics/subjects", { authenticated: false });
    const listAllPublicLyrics = async ({ size = 100, ...filters } = {}) => {
        const firstPage = await listPublicLyrics({ ...filters, page: 0, size });
        const items = [...firstPage.items];
        const pageNumbers = Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) => index + 1);

        for (let index = 0; index < pageNumbers.length; index += 4) {
            const pages = await Promise.all(pageNumbers.slice(index, index + 4).map((page) =>
                listPublicLyrics({ ...filters, page, size })));
            pages.forEach((page) => items.push(...page.items));
        }

        return items;
    };
    const getPublicLyric = (reference) => request(
        `/api/v1/lyrics/${encodeURIComponent(reference)}`, { authenticated: false });

    return {
        listAdminLyrics,
        listAdminSubjects,
        listPublicLyrics,
        listPublicSubjects,
        listAllPublicLyrics,
        getPublicLyric,
        loadLyricForEditing,
        createLyric,
        updateLyricMetadata,
        loadLanguageVersion,
        saveLanguageVersion,
        setLyricStatus,
        deleteLyric,
    };
}

export const lyricsApi = createLyricsApi();