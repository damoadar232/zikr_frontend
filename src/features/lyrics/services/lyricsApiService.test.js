import test from "node:test";
import assert from "node:assert/strict";
import { createLyricsApi } from "./lyricsApiService.js";

function response(status, data) {
    return { status, ok: status >= 200 && status < 300, json: async () => data };
}

function createAuth(fetchImpl) {
    return { authenticatedFetch: fetchImpl };
}

test("admin list unwraps the PageSlice envelope and sends only supported filters", async () => {
    const calls = [];
    const api = createLyricsApi({
        baseUrl: "https://api.test/",
        auth: createAuth(async (url, options) => {
            calls.push({ url, options });
            return response(200, { data: { items: [], page: 0, size: 10, totalElements: 0, totalPages: 0 } });
        }),
    });

    const page = await api.listAdminLyrics({
        page: 0, size: 10, status: "DRAFT", query: "naat & zikr",
        categoryId: "naat-sharif", language: "hi", reciter: "Owais Raza",
    });

    assert.equal(page.totalElements, 0);
    assert.equal(calls[0].url, "/api/v1/admin/lyrics?page=0&size=10&status=DRAFT&query=naat+%26+zikr");
});

test("create submits the numeric combined request and unwraps the created lyric", async () => {
    const calls = [];
    const created = { id: 42, title: "New lyric", artistId: 17, artistIds: [17], writerId: 17 };
    const api = createLyricsApi({
        baseUrl: "https://api.test",
        auth: createAuth(async (url, options) => {
            calls.push({ url, options });
            return response(201, { data: created });
        }),
    });
    const request = {
        title: "New lyric",
        slug: "new-lyric",
        writerId: 17,
        reciterIds: [17],
        artistId: 17,
        categoryIds: [4],
        subjectIds: [3],
        tags: ["praise"],
        bookId: "collection",
        featured: false,
        mediaReferences: [],
    };

    const result = await api.createLyric(request);

    assert.equal(calls[0].url, "/api/v1/admin/lyrics");
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), request);
    assert.equal(result, created);
    assert.equal(result.id, 42);
});

test("update uses the numeric lyric ID and unwraps the updated lyric", async () => {
    const calls = [];
    const updated = { id: 42, title: "Updated lyric", artistId: 17, artistIds: [17], writerId: 17 };
    const api = createLyricsApi({
        baseUrl: "https://api.test",
        auth: createAuth(async (url, options) => {
            calls.push({ url, options });
            return response(200, { data: updated });
        }),
    });
    const request = {
        title: "Updated lyric",
        slug: "updated-lyric",
        writerId: 17,
        reciterIds: [17],
        categoryIds: [4],
        subjectIds: [3],
        tags: ["praise"],
        bookId: "collection",
        mediaReferences: [],
    };

    const result = await api.updateLyricMetadata("42", request);

    assert.equal(calls[0].url, "/api/v1/admin/lyrics/42");
    assert.equal(calls[0].options.method, "PUT");
    assert.deepEqual(JSON.parse(calls[0].options.body), request);
    assert.equal(result, updated);
    assert.equal(result.id, 42);
});

test("delete uses the numeric lyric ID and accepts a no-content response", async () => {
    const calls = [];
    const api = createLyricsApi({
        baseUrl: "https://api.test",
        auth: createAuth(async (url, options) => {
            calls.push({ url, options });
            return { status: 204, ok: true, json: async () => assert.fail("204 response must not be parsed") };
        }),
    });

    const result = await api.deleteLyric("42");

    assert.equal(calls[0].url, "/api/v1/admin/lyrics/42");
    assert.equal(calls[0].options.method, "DELETE");
    assert.equal(result, undefined);
});

test("delete surfaces conflict and other API error messages", async () => {
    for (const [status, body, expectedMessage, expectedCode] of [
        [409, { error: "CONFLICT", message: "Language versions prevent deletion." }, "Language versions prevent deletion.", "CONFLICT"],
        [500, { error: "INTERNAL_ERROR", message: "An unexpected error occurred." }, "An unexpected error occurred.", "INTERNAL_ERROR"],
    ]) {
        const api = createLyricsApi({
            baseUrl: "https://api.test",
            auth: createAuth(async () => response(status, body)),
        });

        await assert.rejects(api.deleteLyric("42"), (error) => {
            assert.equal(error.status, status);
            assert.equal(error.code, expectedCode);
            assert.equal(error.message, expectedMessage);
            return true;
        });
    }
});

test("language save removes unsupported code marks while preserving lyric text and supported formatting", async () => {
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
                marks: [
                    { type: "code" },
                    { type: "bold" },
                    { type: "textStyle", attrs: { color: "#D4AF65", fontSize: "24px" } },
                ],
            }],
        }, {
            type: "paragraph",
            content: [
                { type: "text", text: "Salam" },
                { type: "hardBreak" },
                { type: "text", text: "world", marks: [{ type: "italic" }, { type: "underline" }] },
            ],
        }],
    };

    await api.saveLanguageVersion("9", "roman", document, 7, "edit");

    assert.equal(calls[0].url, "/api/v1/admin/lyrics/9/languages/roman");
    const body = JSON.parse(calls[0].options.body);
    assert.deepEqual(body, {
        document: {
            type: "doc",
            content: [{
                type: "paragraph",
                attrs: { textAlign: "right", paragraphSpacing: "16px" },
                content: [{
                    type: "text",
                    text: "Muhammad",
                    marks: [{ type: "bold" }, { type: "textStyle", attrs: { color: "#D4AF65", fontSize: "24px" } }],
                }],
            }, {
                type: "paragraph",
                content: [
                    { type: "text", text: "Salam" },
                    { type: "hardBreak" },
                    { type: "text", text: "world", marks: [{ type: "italic" }, { type: "underline" }] },
                ],
            }],
        },
        expectedRowVersion: 7,
        changeNote: "edit",
    });
});

test("Hindi and Urdu language documents keep supported text marks when saved", async () => {
    const calls = [];
    const api = createLyricsApi({
        baseUrl: "https://api.test",
        auth: createAuth(async (url, options) => {
            calls.push({ url, options });
            return response(200, { data: {} });
        }),
    });
    const document = {
        type: "doc",
        content: [{
            type: "paragraph",
            content: [{ type: "text", text: "Translation", marks: [{ type: "bold" }, { type: "underline" }] }],
        }],
    };

    for (const language of ["hi", "ur"]) {
        await api.saveLanguageVersion("9", language, document, null);
        assert.equal(JSON.parse(calls.at(-1).options.body).document.content[0].content[0].text, "Translation");
        assert.deepEqual(JSON.parse(calls.at(-1).options.body).document.content[0].content[0].marks, [
            { type: "bold" },
            { type: "underline" },
        ]);
    }
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
