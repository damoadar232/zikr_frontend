export function sortQuranAyahs(ayahs) {
  return [...ayahs].sort(
    (left, right) =>
      left.surahNumber - right.surahNumber || left.ayahNumber - right.ayahNumber,
  );
}

export function getJuzReaderRoute(juz) {
  const params = new URLSearchParams({
    juz: String(juz.number),
    surah: String(juz.startSurah),
    ayah: String(juz.startAyah),
  });
  return `surah-read?${params.toString()}`;
}
