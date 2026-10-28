import { API_BASE_URL, requireApiBaseUrl } from "../../../app/config/apiBase.js";
import { AdminApiError, adminAuth } from "../../auth/services/adminAuth.js";

export class QuranAdminApiError extends AdminApiError {
    constructor(message, status, code, data) {
        super(message, status, code);
        this.data = data;
    }
}

export function createQuranAdminApi({
    baseUrl = API_BASE_URL,
    auth = adminAuth,
} = {}) {
    const request = async (path, { method = "GET", body } = {}) => {
        requireApiBaseUrl(baseUrl);
        const response = await auth.authenticatedFetch(path, {
            method,
            headers: { Accept: "application/json" },
            ...(body === undefined ? {} : {
                headers: { Accept: "application/json", "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        });
        let envelope = {};
        try {
            envelope = await response.json();
        } catch {
            // Use the standard API error when the response body is not JSON.
        }
        if (!response.ok) {
            throw new QuranAdminApiError(
                typeof envelope.message === "string" ? envelope.message : `Quran request failed (${response.status}).`,
                response.status,
                typeof envelope.error === "string" ? envelope.error : "API_ERROR",
                envelope.data,
            );
        }
        return envelope.data;
    };

    return {
        listSurahs: () => request("/api/v1/admin/quran/surahs"),
        listAyahs: (surah) => request(`/api/v1/admin/quran/ayahs?surah=${encodeURIComponent(surah)}`),
        getAyah: (surah, ayah) => request(`/api/v1/admin/quran/ayahs/${surah}/${ayah}`),
        createAyah: (data) => request("/api/v1/admin/quran/ayahs", { method: "POST", body: data }),
        updateAyah: (surah, ayah, data) => request(`/api/v1/admin/quran/ayahs/${surah}/${ayah}`, { method: "PUT", body: data }),
        setAyahStatus: (surah, ayah, status) => request(`/api/v1/admin/quran/ayahs/${surah}/${ayah}/status`, { method: "PATCH", body: { status } }),
        listTranslations: (surah, ayah) => request(`/api/v1/admin/quran/ayahs/${surah}/${ayah}/translations`),
        upsertTranslation: (surah, ayah, language, data) => request(
            `/api/v1/admin/quran/ayahs/${surah}/${ayah}/translations/${language}`,
            { method: "PUT", body: data },
        ),
        setTranslationStatus: (surah, ayah, language, status, translatorId) => request(
            `/api/v1/admin/quran/ayahs/${surah}/${ayah}/translations/${language}${translatorId === undefined ? "" : `/${encodeURIComponent(translatorId)}`}/status`,
            { method: "PATCH", body: { status } },
        ),
        listTranslators: (language) => request(
            `/api/v1/admin/quran/translators${language ? `?language=${encodeURIComponent(language)}` : ""}`,
        ),
        createTranslator: (data) => request("/api/v1/admin/quran/translators", { method: "POST", body: data }),
        validateImport: (data) => request("/api/v1/admin/quran/import/validate", { method: "POST", body: data }),
        commitImport: (data) => request("/api/v1/admin/quran/import/commit", { method: "POST", body: data }),
    };
}

export const quranAdminApi = createQuranAdminApi();
