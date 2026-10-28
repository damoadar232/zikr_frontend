/**
 * quranApiService.ts
 *
 * Thin typed client for the Zikr-e-Ilahi Spring Boot API.
 * All functions resolve to the same data shapes the existing
 * QuranPages components already expect, so no JSX needs changing.
 *
 * When VITE_API_BASE_URL is not set the hooks that call these functions
 * fall back to the local mock data automatically — this module is never
 * called directly in fallback mode.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

// ─── Response envelope ────────────────────────────────────────────────────────

interface ApiEnvelope<T> {
  data: T;
  error?: string;
  message?: string;
}

// ─── Domain types (mirror the Spring Boot DTOs) ───────────────────────────────

export interface ApiSurah {
  number: number;
  arabicName: string;
  transliterated: string;
  englishMeaning: string;
  ayahCount: number;
  revelation: "Makki" | "Madani";
  revelationOrder: number;
}

export interface ApiAyahTranslation {
  languageCode: string;
  text: string;
  translatorName: string;
}

export interface ApiAyah {
  surahNumber: number;
  ayahNumber: number;
  arabicText: string;
  translation: ApiAyahTranslation | null;
}

export interface ApiPublicTranslator {
  id: number;
  name: string;
  languageCode: "en" | "hi" | "ur";
}

export interface ApiPublishedTranslation {
  surahNumber: number;
  ayahNumber: number;
  languageCode: "en" | "hi" | "ur";
  translatorId: number;
  translatorName: string;
  text: string;
}

export interface ApiJuz {
  number: number;
  arabicName: string;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
  startRef: string;
  endRef: string;
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // ignore parse error — use default message
    }
    throw new Error(message);
  }
  const payload = (await res.json()) as ApiEnvelope<T>;
  return payload.data;
}

// ─── Public Surah endpoints ───────────────────────────────────────────────────

/** GET /api/v1/quran/surahs — optionally filtered by revelation */
export function fetchSurahs(revelation?: "Makki" | "Madani"): Promise<ApiSurah[]> {
  const qs = revelation ? `?revelation=${revelation}` : "";
  return apiFetch<ApiSurah[]>(`/api/v1/quran/surahs${qs}`);
}

/** GET /api/v1/quran/surahs/:number */
export function fetchSurah(number: number): Promise<ApiSurah> {
  return apiFetch<ApiSurah>(`/api/v1/quran/surahs/${number}`);
}

/** GET /api/v1/quran/surahs/:number/ayahs?translation=XX */
export function fetchSurahAyahs(surahNumber: number, translation: string): Promise<ApiAyah[]> {
  return apiFetch<ApiAyah[]>(
    `/api/v1/quran/surahs/${surahNumber}/ayahs?translation=${encodeURIComponent(translation)}`,
  );
}

/** GET /api/v1/quran/surahs/:number/translations?languages=en&languages=ur */
export function fetchSurahTranslations(
  surahNumber: number,
  languages: readonly string[],
  signal?: AbortSignal,
): Promise<ApiPublishedTranslation[]> {
  const params = new URLSearchParams();
  languages.forEach((language) => params.append("languages", language));
  return apiFetch<ApiPublishedTranslation[]>(
    `/api/v1/quran/surahs/${surahNumber}/translations?${params.toString()}`,
    signal,
  );
}

// ─── Public Juz endpoints ─────────────────────────────────────────────────────

/** GET /api/v1/quran/juz */
export function fetchJuzList(): Promise<ApiJuz[]> {
  return apiFetch<ApiJuz[]>("/api/v1/quran/juz");
}

/** GET /api/v1/quran/juz/:number/ayahs?translation=XX */
export function fetchJuzAyahs(juzNumber: number, translation: string): Promise<ApiAyah[]> {
  return apiFetch<ApiAyah[]>(
    `/api/v1/quran/juz/${juzNumber}/ayahs?translation=${encodeURIComponent(translation)}`,
  );
}

/** GET /api/v1/quran/juz/:number/translations?languages=en&languages=ur */
export function fetchJuzTranslations(
  juzNumber: number,
  languages: readonly string[],
  signal?: AbortSignal,
): Promise<ApiPublishedTranslation[]> {
  const params = new URLSearchParams();
  languages.forEach((language) => params.append("languages", language));
  return apiFetch<ApiPublishedTranslation[]>(
    `/api/v1/quran/juz/${juzNumber}/translations?${params.toString()}`,
    signal,
  );
}

let publicTranslatorCache: ApiPublicTranslator[] | null = null;
let publicTranslatorRequest: Promise<ApiPublicTranslator[]> | null = null;
let publicTranslatorGeneration = 0;

/** GET /api/v1/quran/translators — public-safe translator identifiers and names */
export function fetchPublicTranslators(force = false): Promise<ApiPublicTranslator[]> {
  if (!force && publicTranslatorCache) return Promise.resolve(publicTranslatorCache);
  if (!force && publicTranslatorRequest) return publicTranslatorRequest;

  const generation = ++publicTranslatorGeneration;
  const request = apiFetch<ApiPublicTranslator[]>("/api/v1/quran/translators")
    .then((translators) => {
      const sorted = translators.slice().sort((left, right) =>
        left.languageCode.localeCompare(right.languageCode) ||
        left.name.localeCompare(right.name) ||
        left.id - right.id,
      );
      if (publicTranslatorGeneration === generation) publicTranslatorCache = sorted;
      return sorted;
    })
    .finally(() => {
      if (publicTranslatorRequest === request) publicTranslatorRequest = null;
    });

  publicTranslatorRequest = request;
  return request;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** True when a backend URL is configured — components use this to decide
 *  whether to call the API or fall back to local mock data. */
export function hasApiUrl(): boolean {
  return Boolean(import.meta.env.VITE_API_BASE_URL);
}
