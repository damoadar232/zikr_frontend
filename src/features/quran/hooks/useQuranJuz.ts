import { useEffect, useState } from "react";
import { juzStarts, type TranslationLanguage } from "../data/quranData";
import { surahData } from "../data/surahMetadata";
import {
  fetchJuzAyahs,
  fetchJuzList,
  hasApiUrl,
  type ApiAyah,
  type ApiJuz,
} from "../services/quranApiService";
import { sortQuranAyahs } from "../utils/quranBrowseUtils.js";

export type QuranJuzEntry = Pick<ApiJuz, "number" | "arabicName" | "startSurah" | "startAyah" | "startRef"> &
  Partial<Pick<ApiJuz, "endSurah" | "endAyah" | "endRef">>;

function getLocalJuzEntries(): QuranJuzEntry[] {
  return juzStarts.map(({ juz, surah, ayah }) => ({
    number: juz,
    arabicName: "",
    startSurah: surah,
    startAyah: ayah,
    startRef: `${surah}:${ayah}`,
  }));
}

export function useQuranJuzList() {
  const [items, setItems] = useState<QuranJuzEntry[]>(() => hasApiUrl() ? [] : getLocalJuzEntries());
  const [loading, setLoading] = useState(() => hasApiUrl());
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!hasApiUrl()) {
      setItems(getLocalJuzEntries());
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchJuzList()
      .then((juz) => {
        if (!cancelled) {
          setItems(juz);
          setLoading(false);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setItems([]);
          setError(requestError instanceof Error ? requestError.message : "Could not load Juz.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [retry]);

  return {
    items,
    loading,
    error,
    retry: () => setRetry((value) => value + 1),
    apiConfigured: hasApiUrl(),
  };
}

export function useQuranJuzAyahs(
  juzNumber: number | null,
  language: TranslationLanguage,
) {
  const [ayahs, setAyahs] = useState<ApiAyah[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!juzNumber || !hasApiUrl()) {
      setAyahs([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchJuzAyahs(juzNumber, language)
      .then((result) => {
        if (!cancelled) {
          setAyahs(sortQuranAyahs(result));
          setLoading(false);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setAyahs([]);
          setError(requestError instanceof Error ? requestError.message : "Could not load Juz Ayahs.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [juzNumber, language, retry]);

  return {
    ayahs,
    loading,
    error,
    retry: () => setRetry((value) => value + 1),
    apiConfigured: hasApiUrl(),
  };
}

export function getSurahLabel(surahNumber: number): string {
  return surahData[surahNumber - 1]?.[1] ?? `Surah ${surahNumber}`;
}
