const viteEnvironment = import.meta.env;

export const API_BASE_URL = (
    viteEnvironment?.VITE_API_BASE_URL ?? ""
).replace(/\/+$/, "");

export function requireApiBaseUrl(baseUrl = API_BASE_URL) {
    if (!baseUrl) {
        throw new Error("The Spring Boot API URL is not configured.");
    }

    return baseUrl.replace(/\/+$/, "");
}