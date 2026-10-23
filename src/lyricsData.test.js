import test from "node:test";
import assert from "node:assert/strict";
import {
    filterLyricsByTitle,
    getPublishedLyrics,
    getLyricsByCategory,
    getLyricsByArtist,
    getLyricsByPoet,
    getLyricsByBook,
    getLyricsByLanguage,
    normalizeLyricLanguageCode,
    getLyricsBySubject,
    lyrics,
} from "./lyricsData.js";

test("published lyrics retain newest-first order and title-only search works", () => {
    const published = getPublishedLyrics(lyrics);
    assert.ok(published.length > 0);
    assert.equal(published[0].title, "786 Durood");
    assert.equal(published[0].createdAt, "2025-05-16T10:00:00Z");

    const matches = filterLyricsByTitle(published, "mustafa", "All");
    assert.equal(matches.length, 1);
    assert.equal(matches[0].title, "Mustafa Jaan-e-Rehmat");

    const initial = filterLyricsByTitle(published, "", "M");
    assert.ok(initial.some((item) => item.title.startsWith("M")));
    assert.ok(!initial.some((item) => item.title.startsWith("A")));
});

test("combined titles can be searched by either Hindi script or Roman transliteration", () => {
    const combined = {
        id: "combined-title",
        title: "तुम ज़ात-ए-ख़ुदा से न जुदा हो / Tum Zaat-e-Khuda Se Na Juda Ho",
        status: "published",
    };

    assert.deepEqual(filterLyricsByTitle([combined], "ज़ात-ए-ख़ुदा", "All").map((item) => item.id), ["combined-title"]);
    assert.deepEqual(filterLyricsByTitle([combined], "tum zaat-e-khuda", "All").map((item) => item.id), ["combined-title"]);
    assert.deepEqual(filterLyricsByTitle([combined], "tum zaat-e-khuda", "T").map((item) => item.id), ["combined-title"]);
});

test("lyrics categories, language, and subject filters reflect the actual dataset", () => {
    const published = getPublishedLyrics(lyrics);

    assert.deepEqual(
        getLyricsByCategory(published, "durood-o-salam").map((item) => item.title).sort(),
        ["786 Durood", "Mustafa Jaan-e-Rehmat"].sort(),
    );

    assert.deepEqual(
        getLyricsByArtist(published, "owais-raza-qadri").map((item) => item.title).sort(),
        ["Kabe Ki Ronaq", "Karam Mangta Hoon", "Mustafa Jaan-e-Rehmat"].sort(),
    );

    assert.deepEqual(
        getLyricsByPoet(published, "imam-ahmed-raza-khan").map((item) => item.title),
        ["Mustafa Jaan-e-Rehmat"],
    );

    assert.deepEqual(
        getLyricsByBook(published, "madina-roses").map((item) => item.title).sort(),
        ["Karam Mangta Hoon", "Mere Aaqa Aao"].sort(),
    );

    assert.deepEqual(
        getLyricsByLanguage(published, "en").map((item) => item.title).sort(),
        ["786 Durood", "Allah Hu Allah Hu", "Karam Mangta Hoon", "Main So Jaun", "Mere Aaqa Aao", "Mustafa Jaan-e-Rehmat"].sort(),
    );

    assert.deepEqual(
        getLyricsBySubject(published, "ramadan").map((item) => item.title).sort(),
        ["786 Durood", "Main So Jaun"].sort(),
    );
});

test("language filters accept normalized code and script labels without changing stored records", () => {
    const hindiRecord = {
        id: "hindi-script-alias",
        title: "Hindi title",
        status: "published",
        languageVersions: [{ code: "Hindi", label: "Hindi", script: "Devanagari", text: "देवनागरी" }],
    };
    assert.equal(normalizeLyricLanguageCode("hi-IN"), "hi");
    assert.equal(normalizeLyricLanguageCode("Devanagari"), "hi");
    assert.deepEqual(getLyricsByLanguage([hindiRecord], "hi").map((item) => item.id), ["hindi-script-alias"]);
    assert.equal(hindiRecord.languageVersions[0].code, "Hindi");
});

test("artist filters include additional reciters without changing legacy artistId records", () => {
    const multiReciter = {
        id: "shared-recitation",
        title: "Shared recitation",
        artistId: "traditional",
        artistIds: ["zohaib-ashrafi"],
        status: "published",
        createdAt: "2025-01-01T00:00:00Z",
    };

    assert.deepEqual(getLyricsByArtist([...lyrics, multiReciter], "traditional").map((item) => item.id).includes("shared-recitation"), true);
    assert.deepEqual(getLyricsByArtist([...lyrics, multiReciter], "zohaib-ashrafi").map((item) => item.id).includes("shared-recitation"), true);
});

test("reciter filters include all assigned reciters without duplicating lyrics", () => {
    const assigned = {
        id: "shared-recitation",
        title: "Shared recitation",
        artistId: "traditional",
        reciterIds: ["owais-raza-qadri", "zohaib-ashrafi"],
        status: "published",
        createdAt: "2025-01-01T00:00:00Z",
    };
    const list = [...lyrics, assigned];

    assert.deepEqual(getLyricsByArtist(list, "owais-raza-qadri").filter((item) => item.id === "shared-recitation").length, 1);
    assert.deepEqual(getLyricsByArtist(list, "zohaib-ashrafi").filter((item) => item.id === "shared-recitation").length, 1);
    assert.deepEqual(getLyricsByArtist(list, "traditional").some((item) => item.id === "shared-recitation"), false);
});
