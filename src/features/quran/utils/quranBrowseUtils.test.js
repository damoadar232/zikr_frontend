import test from "node:test";
import assert from "node:assert/strict";
import { getJuzReaderRoute, sortQuranAyahs } from "./quranBrowseUtils.js";

test("sorts a cross-Surah Juz response in canonical order", () => {
  const ayahs = [
    { surahNumber: 2, ayahNumber: 2 },
    { surahNumber: 1, ayahNumber: 1 },
    { surahNumber: 2, ayahNumber: 1 },
  ];

  assert.deepEqual(
    sortQuranAyahs(ayahs).map(({ surahNumber, ayahNumber }) => `${surahNumber}:${ayahNumber}`),
    ["1:1", "2:1", "2:2"],
  );
  assert.deepEqual(ayahs.map(({ surahNumber, ayahNumber }) => `${surahNumber}:${ayahNumber}`), [
    "2:2",
    "1:1",
    "2:1",
  ]);
});

test("creates a Juz reader route using the stored start boundary", () => {
  assert.equal(
    getJuzReaderRoute({ number: 1, startSurah: 1, startAyah: 1 }),
    "surah-read?juz=1&surah=1&ayah=1",
  );
});
