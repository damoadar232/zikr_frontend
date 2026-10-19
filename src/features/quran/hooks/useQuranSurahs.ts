/**
 * useQuranSurahs
 *
 * Returns the list of Surahs, optionally filtered by revelation type.
 *
 * When VITE_API_BASE_URL is set   → fetches from Spring Boot API.
 * When VITE_API_BASE_URL is unset → returns the existing static `surahs`
 *   array from surahMetadata.ts unchanged, so the app behaves exactly as
 *   it did before Phase 3.
 *
 * The returned `items` array uses the same string-tuple shape as the
 * existing `surahs` export so SurahGrid and filterQuranSurahs work without
 * modification: [paddedNumber, arabicName, transliterated, "N Ayat", revelation]
 */

import { useEffect, useState } from "react";
import { fetchSurahs, hasApiUrl, type ApiSurah } from "../services/quranApiService";
import { surahs as staticSurahs } from "../data/surahMetadata";

export type SurahRow = [string, string, string, string, string];
// [paddedNumber, arabicName, transliterated, "N Ayat", revelation]

function apiSurahToRow(s: ApiSurah): SurahRow {
  return [
    String(s.number).padStart(2, "0"),
    s.arabicName,
    s.transliterated,
    `${s.ayahCount} Ayat`,
    s.revelation,
  ];
}

export interface UseQuranSurahsResult {
  items: SurahRow[];
  loading: boolean;
  error: string | null;
}

export function useQuranSurahs(
  revelation?: "Makki" | "Madani",
): UseQuranSurahsResult {
  const [items, setItems] = useState<SurahRow[]>(() => {
    // Initialise synchronously from static data so there is no flash of empty
    if (!hasApiUrl()) {
      return revelation
        ? (staticSurahs.filter((r) => r[4] === revelation) as SurahRow[])
        : (staticSurahs as SurahRow[]);
    }
    return [];
  });
  const [loading, setLoading] = useState(() => hasApiUrl());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasApiUrl()) {
      // Static fallback — filter in place if a revelation type is requested
      const filtered = revelation
        ? (staticSurahs.filter((r) => r[4] === revelation) as SurahRow[])
        : (staticSurahs as SurahRow[]);
      setItems(filtered);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSurahs(revelation)
      .then((data) => {
        if (!cancelled) {
          setItems(data.map(apiSurahToRow));
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Could not load Surahs.";
          setError(message);
          // Keep showing whatever was already in state (static fallback on error)
          if (items.length === 0) {
            const fallback = revelation
              ? (staticSurahs.filter((r) => r[4] === revelation) as SurahRow[])
              : (staticSurahs as SurahRow[]);
            setItems(fallback);
          }
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revelation]);

  return { items, loading, error };
}
