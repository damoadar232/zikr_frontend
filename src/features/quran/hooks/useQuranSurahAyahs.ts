/**
 * useQuranSurahAyahs
 *
 * Returns Ayah content for one Surah in the requested translation language.
 *
 * When VITE_API_BASE_URL is set   → fetches published Ayahs from the API.
 * When VITE_API_BASE_URL is unset → reads from the existing localStorage
 *   contentRepository overlay (useContentCollection), which is the
 *   original Phase 1 mock behaviour.
 *
 * The returned `chapterContent` map has exactly the same shape that
 * SurahRead's `ayahTextFor()` helper already expects:
 *   Record<number, { arabic: string; translations: Partial<Record<string, string>> }>
 *
 * When the API returns no Ayahs for a Surah (Phase 3 — content not yet
 * imported), the map is empty and the reader shows its existing
 * "Quran text unavailable" notice unchanged.
 */

import { useEffect, useState } from "react";
import { fetchSurahAyahs, hasApiUrl } from "../services/quranApiService";
import { useContentCollection } from "../../../app/hooks/useContentCollection";
import { quranAyahRecords, type TranslationLanguage } from "../data/quranData";

export type AyahContentMap = Record<
  number,
  { arabic: string; translations: Partial<Record<TranslationLanguage, string>> }
>;

export interface UseQuranSurahAyahsResult {
  chapterContent: AyahContentMap;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Internal component used only in fallback (no-API) mode.
 * Delegates to the existing useContentCollection hook so the
 * localStorage admin overlay still works during development.
 */
function buildFallbackContent(
  managedAyahs: ReturnType<typeof useContentCollection<(typeof quranAyahRecords)[number]>>,
  chapterNumber: number,
): AyahContentMap {
  return Object.fromEntries(
    managedAyahs
      .filter((r) => r.status === "published" && r.surahNumber === chapterNumber)
      .map((r) => [
        r.ayahNumber,
        { arabic: r.arabic, translations: r.translations },
      ]),
  );
}

export function useQuranSurahAyahs(
  chapterNumber: number,
  selectedTranslation: TranslationLanguage,
  enabled = true,
): UseQuranSurahAyahsResult {
  // Always call useContentCollection — hooks must not be conditional.
  // In API mode this result is ignored.
  const managedAyahs = useContentCollection("quranAyahs", quranAyahRecords);

  const [apiContent, setApiContent] = useState<AyahContentMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!hasApiUrl() || !enabled) return; // fallback mode or a different reader mode

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSurahAyahs(chapterNumber, selectedTranslation)
      .then((ayahs) => {
        if (cancelled) return;
        const map: AyahContentMap = {};
        for (const ayah of ayahs) {
          map[ayah.ayahNumber] = {
            arabic: ayah.arabicText,
            translations: ayah.translation
              ? { [ayah.translation.languageCode as TranslationLanguage]: ayah.translation.text }
              : {},
          };
        }
        setApiContent(map);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load Ayahs.");
        setApiContent({});
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chapterNumber, selectedTranslation, enabled, retryCount]);

  const chapterContent: AyahContentMap = hasApiUrl()
    ? apiContent
    : buildFallbackContent(managedAyahs, chapterNumber);

  return { chapterContent, loading, error, retry: () => setRetryCount((value) => value + 1) };
}
