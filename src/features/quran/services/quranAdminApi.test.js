import test from "node:test";
import assert from "node:assert/strict";
import { createQuranAdminApi, QuranAdminApiError } from "./quranAdminApi.js";

function createApi(responses) {
    const calls = [];
    const api = createQuranAdminApi({
        baseUrl: "https://api.example.test",
        auth: {
            authenticatedFetch: async (path, options) => {
                calls.push({ path, options });
                const next = responses.shift();
                return {
                    ok: next.ok ?? true,
                    status: next.status ?? 200,
                    json: async () => next.body,
                };
            },
        },
    });
    return { api, calls };
}

test("loads admin Quran data through authenticated requests", async () => {
    const { api, calls } = createApi([{ body: { data: [] } }, { body: { data: [] } }]);
    await api.listSurahs();
    await api.listAyahs(2);
    assert.deepEqual(calls.map((call) => call.path), [
        "/api/v1/admin/quran/surahs",
        "/api/v1/admin/quran/ayahs?surah=2",
    ]);
});

test("submits a preview batch and preserves structured validation errors", async () => {
    const report = { totalRows: 1, validRows: 0, errorCount: 1, errors: [{ row: 1, code: "MISSING_ARABIC" }] };
    const { api, calls } = createApi([{
        ok: false,
        status: 422,
        body: { data: report, error: "VALIDATION_FAILED", message: "Validation failed." },
    }]);
    await assert.rejects(
        api.validateImport({ rows: [] }),
        (error) => error instanceof QuranAdminApiError
            && error.status === 422
            && error.data.errorCount === 1,
    );
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), { rows: [] });
});

test("saves Ayahs and translations through language-specific admin routes", async () => {
    const { api, calls } = createApi([{ body: { data: { status: "DRAFT" } } }, { body: { data: { status: "DRAFT" } } }]);
    const ayah = { surahNumber: 2, ayahNumber: 5, arabicText: "verified", status: "DRAFT" };
    await api.createAyah(ayah);
    await api.upsertTranslation(2, 5, "ur", { text: "verified translation", translatorId: 8 });
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), ayah);
    assert.equal(calls[1].path, "/api/v1/admin/quran/ayahs/2/5/translations/ur");
    assert.equal(calls[1].options.method, "PUT");
    assert.deepEqual(JSON.parse(calls[1].options.body), { text: "verified translation", translatorId: 8 });
});

test("surfaces authenticated API failures instead of falling back to demo content", async () => {
    const { api } = createApi([{
        ok: false,
        status: 403,
        body: { message: "Insufficient permissions.", error: "FORBIDDEN" },
    }]);
    await assert.rejects(
        api.listSurahs(),
        (error) => error instanceof QuranAdminApiError
            && error.status === 403
            && error.message === "Insufficient permissions.",
    );
});
