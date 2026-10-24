import type { ApiAyah } from "../services/quranApiService";

export function sortQuranAyahs(ayahs: ApiAyah[]): ApiAyah[];

export function getJuzReaderRoute(juz: {
  number: number;
  startSurah: number;
  startAyah: number;
}): string;
