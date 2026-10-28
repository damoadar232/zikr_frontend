import { useEffect, useState } from "react";
import {
  fetchJuzTranslations,
  fetchSurahTranslations,
  hasApiUrl,
  type ApiPublishedTranslation,
} from "../services/quranApiService";

export function useQuranPublishedTranslations(
  surahNumber: number,
  juzNumber: number | null,
  languages: readonly string[],
) {
  const languageKey = [...new Set(languages)].sort().join(",");
  const [items, setItems] = useState<ApiPublishedTranslation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!hasApiUrl() || !languageKey) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setItems([]);
    setLoading(true);
    setError(null);
    const selectedLanguages = languageKey.split(",");
    const request = juzNumber === null
      ? fetchSurahTranslations(surahNumber, selectedLanguages, controller.signal)
      : fetchJuzTranslations(juzNumber, selectedLanguages, controller.signal);

    request
      .then((translations) => {
        if (!controller.signal.aborted) {
          setItems(translations);
          setLoading(false);
        }
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load published translations.",
        );
        setLoading(false);
      });

    return () => controller.abort();
  }, [surahNumber, juzNumber, languageKey, retryCount]);

  return {
    items,
    loading,
    error,
    retry: () => setRetryCount((value) => value + 1),
  };
}
