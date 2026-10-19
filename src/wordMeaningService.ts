export type MeaningLanguage = "en" | "hi" | "ur";
export type WordMeanings = Record<MeaningLanguage, string | null>;

const supportedLanguages = new Set<MeaningLanguage>(["en", "hi", "ur"]);
const cache = new Map<string, WordMeanings>();

type TranslationResponse = {
  responseStatus?: number;
  responseData?: { translatedText?: string };
};

async function translateWord(word: string, sourceLanguage: MeaningLanguage, targetLanguage: MeaningLanguage, signal?: AbortSignal): Promise<string | null> {
  if (sourceLanguage === targetLanguage) return word;
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", word);
  url.searchParams.set("langpair", `${sourceLanguage}|${targetLanguage}`);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Dictionary request failed (${response.status})`);
  const payload = await response.json() as TranslationResponse;
  const translated = payload.responseData?.translatedText?.trim();
  if (payload.responseStatus !== 200 || !translated || translated.toLowerCase() === "no translation found.") return null;
  return translated;
}

export async function lookupWordMeanings(word: string, sourceLanguage: string, signal?: AbortSignal): Promise<WordMeanings> {
  if (!supportedLanguages.has(sourceLanguage as MeaningLanguage)) return { en: null, hi: null, ur: null };
  const source = sourceLanguage as MeaningLanguage;
  const normalizedWord = word.trim();
  const cacheKey = `${source}:${normalizedWord.toLocaleLowerCase()}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const targets: MeaningLanguage[] = ["en", "hi", "ur"];
  const results = await Promise.allSettled(targets.map((target) => translateWord(normalizedWord, source, target, signal)));
  if (signal?.aborted) throw new DOMException("Lookup aborted", "AbortError");
  const completedRemoteLookup = results.some((result, index) => result.status === "fulfilled" && targets[index] !== source);
  const meanings = Object.fromEntries(targets.map((target, index) => [
    target,
    results[index].status === "fulfilled" ? results[index].value : null,
  ])) as WordMeanings;
  if (completedRemoteLookup) cache.set(cacheKey, meanings);
  return meanings;
}