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

function formatValidationMessage(envelope) {
    if (envelope.error !== "VALIDATION_ERROR" || !envelope.data
        || typeof envelope.data !== "object" || Array.isArray(envelope.data)) {
        return "";
    }
    return Object.entries(envelope.data)
        .filter(([, message]) => typeof message === "string")
        .map(([field, message]) => `${field}: ${message}`)
        .join("; ");
}

export function createArtistsApi({ baseUrl = API_BASE_URL, auth = adminAuth, fetchImpl = globalThis.fetch } = {}) {
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
        let envelope;
        try {
            envelope = await response.json();
        } catch {
            if (!response.ok) {
                throw new AdminApiError(`Artists request failed (${response.status}).`, response.status);
            }
            throw new AdminApiError("Artists API returned an invalid JSON response.", response.status, "INVALID_RESPONSE");
        }
        if (!response.ok) {
            const message = typeof envelope?.message === "string"
                ? envelope.message
                : `Artists request failed (${response.status}).`;
            const validationMessage = formatValidationMessage(envelope || {});
            throw new AdminApiError(
                validationMessage ? `${message} ${validationMessage}` : message,
                response.status,
                typeof envelope?.error === "string" ? envelope.error : "API_ERROR",
            );
        }
        if (!envelope || typeof envelope !== "object" || !Object.hasOwn(envelope, "data")) {
            throw new AdminApiError("Artists API response did not include data.", response.status, "INVALID_RESPONSE");
        }
        return envelope.data;
    };

    const listArtists = (options = {}) => request(`/api/v1/admin/artists${queryString(options)}`);
    const getArtist = (id) => request(`/api/v1/admin/artists/${encodeURIComponent(id)}`);
    const createArtist = (data) => request("/api/v1/admin/artists", { method: "POST", body: data });
    const updateArtist = (id, data) => request(`/api/v1/admin/artists/${encodeURIComponent(id)}`, { method: "PUT", body: data });
    const setArtistStatus = (id, status) => request(`/api/v1/admin/artists/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { status } });
    const deleteArtist = (id) => request(`/api/v1/admin/artists/${encodeURIComponent(id)}`, { method: "DELETE" });
    const getArtistOptions = (options = {}) => request(`/api/v1/admin/artists/options${queryString(options)}`);
    const getRoles = () => request(`/api/v1/admin/artists/roles`);
    const getPublicArtistOptions = (options = {}) => request(`/api/v1/artists/options${queryString(options)}`, { authenticated: false });
    const getPublicRoles = () => request(`/api/v1/artists/roles`, { authenticated: false });

    return {
        getArtists: listArtists,
        getArtistById: getArtist,
        createArtist,
        updateArtist,
        updateArtistStatus: setArtistStatus,
        deleteArtist,
        getArtistRoles: getRoles,
        getArtistOptions,
        listArtists,
        getArtist,
        setArtistStatus,
        getRoles,
        getPublicArtistOptions,
        getPublicRoles,
    };
}

export const artistsApi = createArtistsApi();