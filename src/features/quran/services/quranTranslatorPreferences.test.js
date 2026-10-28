import test from "node:test";
import assert from "node:assert/strict";
import {
    QURAN_TRANSLATOR_SELECTION_KEY,
    readQuranTranslatorSelection,
    writeQuranTranslatorSelection,
} from "./quranTranslatorPreferences.js";

function installStorage(initialValue = null) {
    const values = new Map(initialValue === null ? [] : [[QURAN_TRANSLATOR_SELECTION_KEY, initialValue]]);
    globalThis.window = {
        localStorage: {
            getItem: (key) => values.get(key) ?? null,
            setItem: (key, value) => values.set(key, value),
        },
    };
    return values;
}

test("reads and writes unique stable translator IDs", () => {
    const storage = installStorage();
    writeQuranTranslatorSelection(["42", "7", "42"]);
    assert.deepEqual(readQuranTranslatorSelection(), ["42", "7"]);
    assert.equal(storage.get(QURAN_TRANSLATOR_SELECTION_KEY), '["42","7"]');
});

test("distinguishes no saved selection from an intentionally empty selection", () => {
    installStorage();
    assert.equal(readQuranTranslatorSelection(), null);
    writeQuranTranslatorSelection([]);
    assert.deepEqual(readQuranTranslatorSelection(), []);
});

test("rejects malformed or non-ID preferences rather than silently accepting them", () => {
    installStorage("{invalid");
    assert.throws(readQuranTranslatorSelection, /preferences are invalid/);
    installStorage('["translator name"]');
    assert.throws(readQuranTranslatorSelection, /preferences are invalid/);
    installStorage();
    assert.throws(() => writeQuranTranslatorSelection(["1", "name"]), /positive integer strings/);
});
