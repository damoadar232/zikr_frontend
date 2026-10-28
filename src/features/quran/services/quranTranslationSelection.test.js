import test from "node:test";
import assert from "node:assert/strict";
import {
    filterQuranTranslators,
    groupQuranTranslators,
    selectQuranAyahTranslations,
} from "./quranTranslationSelection.js";

const translators = [
    { id: 1, name: "Translator A", languageCode: "en" },
    { id: 2, name: "Translator B", languageCode: "en" },
    { id: 3, name: "हिंदी अनुवादक", languageCode: "hi" },
];

test("groups actual translator records by language and preserves empty language groups", () => {
    assert.deepEqual(groupQuranTranslators(translators).map(({ code, translators: group }) => [
        code,
        group.map(({ id }) => id),
    ]), [
        ["en", [1, 2]],
        ["hi", [3]],
        ["ur", []],
    ]);
});

test("filters translators by name and by language label or code", () => {
    assert.deepEqual(filterQuranTranslators(translators, "translator b").map(({ id }) => id), [2]);
    assert.deepEqual(filterQuranTranslators(translators, "Hindi").map(({ id }) => id), [3]);
    assert.deepEqual(filterQuranTranslators(translators, "ur"), []);
});

test("shows multiple selected translators for one Ayah without changing their attribution", () => {
    const translations = [
        { surahNumber: 1, ayahNumber: 1, languageCode: "en", translatorId: 1, translatorName: "Translator A", text: "Text A" },
        { surahNumber: 1, ayahNumber: 1, languageCode: "en", translatorId: 2, translatorName: "Translator B", text: "Text B" },
        { surahNumber: 1, ayahNumber: 1, languageCode: "hi", translatorId: 3, translatorName: "हिंदी अनुवादक", text: "Hindi text" },
        { surahNumber: 1, ayahNumber: 2, languageCode: "en", translatorId: 1, translatorName: "Translator A", text: "Other Ayah" },
    ];

    assert.deepEqual(
        selectQuranAyahTranslations(translations, ["1", "2"], translators, 1, 1)
            .map(({ translatorId, translatorName, text }) => [translatorId, translatorName, text]),
        [[1, "Translator A", "Text A"], [2, "Translator B", "Text B"]],
    );
});

test("rejects selected translations whose language disagrees with the translator record", () => {
    const mismatched = [{
        surahNumber: 1,
        ayahNumber: 1,
        languageCode: "ur",
        translatorId: 1,
        translatorName: "Wrong attribution",
        text: "Must not display",
    }];
    assert.deepEqual(selectQuranAyahTranslations(mismatched, ["1"], translators, 1, 1), []);
});
