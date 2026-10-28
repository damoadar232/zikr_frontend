import test from "node:test";
import assert from "node:assert/strict";
import {
    loadAyahDetails,
    loadSurahAyahs,
    QuranAdminPartialSaveError,
    saveAyahRecord,
    saveAyahWithTranslations,
    saveTranslationRecord,
    validateAyahDraft,
    validateAyahRecord,
} from "./quranAdminManagement.js";

function createAyah(number) {
    return { surahNumber: 2, ayahNumber: number, arabicText: `Arabic ${number}`, status: "DRAFT" };
}

function createDrafts() {
    return {
        en: { text: "", translatorId: "", status: "DRAFT" },
        hi: { text: "", translatorId: "", status: "DRAFT" },
        ur: { text: "", translatorId: "", status: "DRAFT" },
    };
}

test("loads Ayahs with translations using bounded parallel requests and keeps canonical ordering", async () => {
    let active = 0;
    let maxActive = 0;
    const api = {
        listAyahs: async (surah) => {
            assert.equal(surah, 2);
            return [createAyah(4), createAyah(1), createAyah(3), createAyah(2)];
        },
        listTranslations: async (surah, ayah) => {
            assert.equal(surah, 2);
            active += 1;
            maxActive = Math.max(maxActive, active);
            await new Promise((resolve) => setTimeout(resolve, 2));
            active -= 1;
            return [{ languageCode: "en", text: `Translation ${ayah}`, translatorId: 7, status: "DRAFT" }];
        },
    };

    const rows = await loadSurahAyahs(2, 2, api);

    assert.deepEqual(rows.map((ayah) => ayah.ayahNumber), [1, 2, 3, 4]);
    assert.equal(rows[2].translations[0].text, "Translation 3");
    assert.equal(maxActive, 2);
});

test("loads existing Ayah and translations from the exact selected address", async () => {
    const calls = [];
    const api = {
        getAyah: async (surah, ayah) => {
            calls.push(["ayah", surah, ayah]);
            return createAyah(ayah);
        },
        listTranslations: async (surah, ayah) => {
            calls.push(["translations", surah, ayah]);
            return [];
        },
    };

    const result = await loadAyahDetails(2, 19, api);

    assert.equal(result.ayahNumber, 19);
    assert.deepEqual(calls, [["ayah", 2, 19], ["translations", 2, 19]]);
});

test("validates a standalone Ayah without requiring translations", () => {
    const records = [createAyah(1)];
    assert.equal(validateAyahRecord({
        surahNumber: 2,
        ayahNumber: 2,
        ayahCount: 286,
        arabicText: "Arabic text",
        existingAyahs: records,
    }), "");
    assert.match(validateAyahRecord({
        surahNumber: 2,
        ayahNumber: 287,
        ayahCount: 286,
        arabicText: "Arabic text",
        existingAyahs: records,
    }), /from 1 to 286/);
    assert.match(validateAyahRecord({
        surahNumber: 2,
        ayahNumber: 1,
        ayahCount: 286,
        arabicText: "Arabic text",
        existingAyahs: records,
    }), /already exists/);
});

test("creates an Ayah as draft without sending translation fields", async () => {
    let payload;
    await saveAyahRecord({
        surahNumber: 2,
        ayahNumber: 2,
        arabicText: " Arabic text ",
        status: "PUBLISHED",
        editing: false,
    }, {
        createAyah: async (request) => { payload = request; return request; },
    });
    assert.deepEqual(payload, {
        surahNumber: 2,
        ayahNumber: 2,
        arabicText: "Arabic text",
        status: "DRAFT",
    });
});

test("saves translations independently by language and translator ID", async () => {
    const calls = [];
    const api = {
        upsertTranslation: async (...args) => { calls.push(args); return args; },
    };
    await saveTranslationRecord({
        surahNumber: 2,
        ayahNumber: 2,
        languageCode: "en",
        translatorId: "7",
        text: "English text",
        status: "PUBLISHED",
    }, api);
    await saveTranslationRecord({
        surahNumber: 2,
        ayahNumber: 2,
        languageCode: "en",
        translatorId: "9",
        text: "Another English text",
        status: "DRAFT",
    }, api);
    assert.deepEqual(calls.map((call) => call[2]), ["en", "en"]);
    assert.deepEqual(calls.map((call) => call[3].translatorId), [7, 9]);
    assert.deepEqual(calls.map((call) => call[3].status), ["PUBLISHED", "DRAFT"]);
});

test("validates canonical bounds, duplicate numbers, and translator language", () => {
    const input = {
        surahNumber: 2,
        ayahNumber: 5,
        ayahCount: 4,
        arabicText: "Arabic",
        existingAyahs: [createAyah(2)],
        translations: createDrafts(),
        translators: [],
        originalTranslations: {},
    };
    assert.match(validateAyahDraft(input), /from 1 to 4/);

    const duplicate = { ...input, ayahNumber: 2, ayahCount: 286 };
    assert.match(validateAyahDraft(duplicate), /already exists/);

    const wrongTranslator = createDrafts();
    wrongTranslator.en = { text: "Translation", translatorId: "9", status: "DRAFT" };
    assert.match(validateAyahDraft({
        ...input,
        ayahCount: 286,
        translations: wrongTranslator,
        translators: [{ id: 9, languageCode: "hi", name: "Hindi translator" }],
    }), /registered for EN/);
});

test("refuses to clear existing translations when no delete API exists", () => {
    const translations = createDrafts();
    translations.ur = { text: "", translatorId: "", status: "DRAFT" };
    assert.match(validateAyahDraft({
        surahNumber: 2,
        ayahNumber: 3,
        ayahCount: 286,
        arabicText: "Arabic",
        existingAyahs: [createAyah(3)],
        editingAyahNumber: 3,
        translations,
        translators: [],
        originalTranslations: { ur: { text: "Existing Urdu", translatorId: 4, status: "DRAFT" } },
    }), /cannot be removed/);
});

test("saves Ayah first and reports translation failures as partial saves", async () => {
    const calls = [];
    const translations = createDrafts();
    translations.en = { text: "English text", translatorId: "8", status: "DRAFT" };
    translations.hi = { text: "Hindi text", translatorId: "9", status: "DRAFT" };
    const api = {
        updateAyah: async (surah, ayah, payload) => {
            calls.push(["updateAyah", surah, ayah, payload]);
            return createAyah(ayah);
        },
        upsertTranslation: async (surah, ayah, language) => {
            calls.push(["translation", surah, ayah, language]);
            if (language === "hi") throw new Error("Hindi API failure");
        },
    };

    await assert.rejects(saveAyahWithTranslations({
        surahNumber: 2,
        ayahNumber: 5,
        arabicText: " Arabic text ",
        status: "PUBLISHED",
        editing: true,
        translations,
        originalTranslations: {},
    }, api), (error) => error instanceof QuranAdminPartialSaveError
        && error.message.includes("Ayah 2:5 was saved")
        && error.message.includes("Hindi API failure"));
    assert.deepEqual(calls.map((call) => call[0]), ["updateAyah", "translation", "translation"]);
    assert.equal(calls[0][3].status, "PUBLISHED");
    assert.equal(calls[1][3], "en");
});

test("does not submit unchanged existing translations", async () => {
    const calls = [];
    const translations = createDrafts();
    translations.en = { text: "Same text", translatorId: "8", status: "PUBLISHED" };
    const api = {
        updateAyah: async (_surah, _ayah, payload) => {
            calls.push(["ayah", payload]);
            return createAyah(5);
        },
        upsertTranslation: async () => calls.push(["translation"]),
    };

    await saveAyahWithTranslations({
        surahNumber: 2,
        ayahNumber: 5,
        arabicText: "Arabic",
        status: "DRAFT",
        editing: true,
        translations,
        originalTranslations: { en: { text: "Same text", translatorId: 8, status: "PUBLISHED" } },
    }, api);

    assert.deepEqual(calls.map((call) => call[0]), ["ayah"]);
});

test("saves edits to published translation text as draft for explicit republishing", async () => {
    let payload;
    const translations = createDrafts();
    translations.en = { text: "Revised text", translatorId: "8", status: "PUBLISHED" };
    const api = {
        updateAyah: async () => createAyah(5),
        upsertTranslation: async (_surah, _ayah, _language, request) => { payload = request; },
    };

    await saveAyahWithTranslations({
        surahNumber: 2,
        ayahNumber: 5,
        arabicText: "Arabic",
        status: "DRAFT",
        editing: true,
        translations,
        originalTranslations: { en: { text: "Original text", translatorId: 8, status: "PUBLISHED" } },
    }, api);

    assert.equal(payload.text, "Revised text");
    assert.equal(payload.status, "DRAFT");
});

test("saves published translation attribution changes as draft for explicit republishing", async () => {
    let payload;
    const translations = createDrafts();
    translations.en = { text: "Existing text", translatorId: "9", status: "PUBLISHED" };
    const api = {
        updateAyah: async () => createAyah(5),
        upsertTranslation: async (_surah, _ayah, _language, request) => { payload = request; },
    };

    await saveAyahWithTranslations({
        surahNumber: 2,
        ayahNumber: 5,
        arabicText: "Arabic",
        status: "DRAFT",
        editing: true,
        translations,
        originalTranslations: { en: { text: "Existing text", translatorId: 8, status: "PUBLISHED" } },
    }, api);

    assert.equal(payload.translatorId, 9);
    assert.equal(payload.status, "DRAFT");
});
