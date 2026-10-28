import { useEffect, useState } from "react";
import {
  fetchPublicTranslators,
  hasApiUrl,
  type ApiPublicTranslator,
} from "../services/quranApiService";

export function useQuranTranslators() {
  const [items, setItems] = useState<ApiPublicTranslator[]>([]);
  const [loading, setLoading] = useState(() => hasApiUrl());
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!hasApiUrl()) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPublicTranslators(retryCount > 0)
      .then((translators) => {
        if (cancelled) return;
        setItems(translators);
        setLoading(false);
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setItems([]);
        setError(requestError instanceof Error ? requestError.message : "Could not load translators.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  return {
    items,
    loading,
    error,
    retry: () => setRetryCount((value) => value + 1),
    apiConfigured: hasApiUrl(),
  };
}
