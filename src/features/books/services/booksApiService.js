import { API_BASE_URL, requireApiBaseUrl } from "../../../app/config/apiBase.js";
import { AdminApiError } from "../../auth/services/adminAuth.js";

export function createBooksApi({ baseUrl = API_BASE_URL, fetchImpl = globalThis.fetch } = {}) {
    const listBooks = async () => {
        const base = requireApiBaseUrl(baseUrl);
        const response = await fetchImpl(`${base}/api/v1/books`, {
            headers: { Accept: "application/json" },
        });
        let envelope;
        try {
            envelope = await response.json();
        } catch {
            if (!response.ok) {
                throw new AdminApiError(`Books request failed (${response.status}).`, response.status);
            }
            throw new AdminApiError("Books API returned an invalid JSON response.", response.status, "INVALID_RESPONSE");
        }
        if (!response.ok) {
            throw new AdminApiError(
                typeof envelope?.message === "string" ? envelope.message : `Books request failed (${response.status}).`,
                response.status,
                typeof envelope?.error === "string" ? envelope.error : "API_ERROR",
            );
        }
        if (!envelope || !Array.isArray(envelope.data)) {
            throw new AdminApiError("Books API response did not include a book list.", response.status, "INVALID_RESPONSE");
        }
        return envelope.data;
    };

    return { listBooks };
}

export const booksApi = createBooksApi();
