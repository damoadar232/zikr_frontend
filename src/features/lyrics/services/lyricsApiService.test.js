import test from "node:test";
import assert from "node:assert/strict";
import { createLyricsApi } from "./lyricsApiService.js";

function response(status, data) {
    return { status, ok: status >= 200 && status < 300, json: async () => data };
}

function createAuth(fetchImpl) {
    return { authenticatedFetch: fetchImpl };
}

test("list uses the Phase 3 admin page envelope and encodes filters", async () => {
    const calls = [];
    const api = createLyricsApi({
        baseUrl: "https://api.test/",
        auth: createAuth(async (url, options) => {
            calls.push({ url, options });
            return response(200, { data: { items: [], page: 0, size: 10, totalElements: 0, totalPages: 0 } });
        }),
    });

    const page = await api.listAdminLyrics({ page: 0, size: 10, status: "DRAFT", query: "naat & zikr" });

    assert.equal(page.totalElements, 0);
    assert.match(calls[0].url, /query=naat\+%26\+zikr/);
});

test("language save submits the original structured JSON and expected row version", async () => {
    const calls = [];
    const api = createLyricsApi({
        baseUrl: "https://api.test",
        auth: createAuth(async (url, options) => {
            calls.push({ url, options });
            return response(200, { data: { legacyId: "naat-1" } });
        }),
    });
    const document = {
        type: "doc",
        content: [{
            type: "paragraph",
            attrs: { textAlign: "right", paragraphSpacing: "16px" },
            content: [{
                type: "text", text: "Muhammad",
                marks: [{ type: "bold" }, { type: "textStyle", attrs: { color: "#D4AF65", fontSize: "24px" } }],
            }],
        }],
    };

    await api.saveLanguageVersion("naat-1", "roman", document, 7, "edit");

    assert.equal(calls[0].url, "/api/v1/admin/lyrics/naat-1/languages/roman");
    assert.deepEqual(JSON.parse(calls[0].options.body), { document, expectedRowVersion: 7, changeNote: "edit" });
});

test("conflicts remain distinguishable and do not rewrite submitted documents", async () => {
    const api = createLyricsApi({
        baseUrl: "https://api.test",
        auth: createAuth(async () => response(409, { error: "CONFLICT", message: "The language changed elsewhere." })),
    });

    await assert.rejects(api.saveLanguageVersion("naat-1", "ur", { type: "doc", content: [] }, 2), (error) => {
        assert.equal(error.status, 409);
        assert.equal(error.code, "CONFLICT");
        assert.equal(error.message, "The language changed elsewhere.");
        return true;
    });
});

test("an unconfigured API URL fails rather than falling back to browser demo storage", async () => {
    const api = createLyricsApi({ baseUrl: "", auth: createAuth(async () => assert.fail("No request expected")) });
    await assert.rejects(api.listAdminLyrics(), /API URL is not configured/);
});
