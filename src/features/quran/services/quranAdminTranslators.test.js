import test from "node:test";
import assert from "node:assert/strict";
import { createQuranTranslator, listQuranTranslators } from "./quranAdminTranslators.js";

test("loads and caches translators by language using the filtered admin endpoint", async () => {
    const calls = [];
    const api = {
        listTranslators: async (language) => {
            calls.push(language);
            return [{ id: language === "en" ? 2 : 1, name: "Z Translator", languageCode: language }];
        },
    };

    await listQuranTranslators("en", { force: true, api });
    await listQuranTranslators("en", { api });
    await listQuranTranslators("ur", { force: true, api });

    assert.deepEqual(calls, ["en", "ur"]);
});

test("creates translators with the supported request fields and invalidates only their language cache", async () => {
    const calls = [];
    const api = {
        listTranslators: async (language) => {
            calls.push(["list", language]);
            return [];
        },
        createTranslator: async (payload) => {
            calls.push(["create", payload]);
            return { id: 8, ...payload };
        },
    };

    await listQuranTranslators("hi", { force: true, api });
    await listQuranTranslators("en", { force: true, api });
    const created = await createQuranTranslator({
        name: " Translator ",
        languageCode: "hi",
        sourceRef: " Verified source ",
        license: " CC BY ",
        licenseNotes: " Attribution required ",
    }, api);
    await listQuranTranslators("hi", { api });
    await listQuranTranslators("en", { api });

    assert.equal(created.id, 8);
    assert.deepEqual(calls.find(([kind]) => kind === "create"), ["create", {
        name: "Translator",
        languageCode: "hi",
        sourceRef: "Verified source",
        license: "CC BY",
        licenseNotes: "Attribution required",
    }]);
    assert.deepEqual(calls.filter(([kind]) => kind === "list").map(([, language]) => language), ["hi", "en", "hi"]);
});

test("omits blank optional license notes and rejects unsupported languages", async () => {
    const calls = [];
    const api = { createTranslator: async (payload) => { calls.push(payload); return payload; } };
    await createQuranTranslator({
        name: "Translator",
        languageCode: "ur",
        sourceRef: "Source",
        license: "License",
        licenseNotes: "  ",
    }, api);
    assert.deepEqual(calls[0], {
        name: "Translator",
        languageCode: "ur",
        sourceRef: "Source",
        license: "License",
    });
    await assert.rejects(createQuranTranslator({
        name: "Bad",
        languageCode: "ta",
        sourceRef: "Source",
        license: "License",
    }, api), /must be en, hi, or ur/);
});
