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
                    { type: "textStyle", attrs: { color: "#D4AF65", fontFamily: "Noto Naskh Arabic", fontSize: "24px" } },
                ],
            }],
        }, {
            type: "paragraph",
            content: [
                { type: "text", text: "Salam", marks: [{ type: "textStyle", attrs: { fontFamily: "Noto Naskh Arabic" } }] },
                { type: "hardBreak" },
                { type: "text", text: "world", marks: [
                    { type: "italic" },
                    { type: "underline" },
                    { type: "textStyle", attrs: { fontFamily: "Noto Nastaliq Urdu" } },
                ] },
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
                    { type: "text", text: "world", marks: [
                        { type: "italic" },
                        { type: "underline" },
                        { type: "textStyle", attrs: { fontFamily: "Noto Nastaliq Urdu" } },
                    ] },
                ],
            }],
        },
        expectedRowVersion: 7,
        changeNote: "edit",
    });
});

test("public list loads every reported page and detail lookup uses the exact reference", async () => {
    const calls = [];
    const api = createLyricsApi({
        baseUrl: "https://api.test",
        auth: {
            authenticatedFetch: async () => assert.fail("public lyrics requests must not use admin authentication"),
        },
        fetchImpl: async (url, options) => {
            calls.push({ url, options });
            if (url.includes("?")) {
                const page = Number(new URL(url).searchParams.get("page"));
                return response(200, {
                    data: {
                        items: [{ id: `lyric-${page}`, title: `Lyric ${page}` }],
                        page,
                        size: 100,
                        totalElements: 3,
                        totalPages: 3,
                    },
                });
            }
            return response(200, { data: { id: "legacy/id", title: "Exact detail" } });
        },
    });

    const items = await api.listAllPublicLyrics({ size: 100 });
    const detail = await api.getPublicLyric("legacy/id");

    assert.deepEqual(items.map((item) => item.id), ["lyric-0", "lyric-1", "lyric-2"]);
    assert.equal(detail.title, "Exact detail");
    assert.deepEqual(calls.map(({ url }) => url), [
        "https://api.test/api/v1/lyrics?page=0&size=100",
        "https://api.test/api/v1/lyrics?page=1&size=100",
        "https://api.test/api/v1/lyrics?page=2&size=100",
        "https://api.test/api/v1/lyrics/legacy%2Fid",
    ]);
    assert.ok(calls.every(({ options }) => options.method === "GET"));
});

test("public detail lookup surfaces an HTTP 404 without returning a fallback record", async () => {
    const api = createLyricsApi({
        baseUrl: "https://api.test",
        fetchImpl: async () => response(404, { error: "NOT_FOUND", message: "Published lyric not found." }),
    });

    await assert.rejects(api.getPublicLyric("missing-lyric"), (error) => {
        assert.equal(error.status, 404);
        assert.equal(error.code, "NOT_FOUND");
        assert.equal(error.message, "Published lyric not found.");
        return true;
    });
});

test("all supported language saves sanitize fonts without losing text or valid formatting", async () => {
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
            attrs: { textAlign: "right", paragraphSpacing: "16px" },
            content: [{ type: "text", text: "Translation", marks: [
                { type: "bold" },
                { type: "underline" },
                { type: "textStyle", attrs: { color: "#D4AF65", fontFamily: "Noto Naskh Arabic" } },
            ] }],
        }],
    };

    for (const language of ["hi", "ur", "roman"]) {
        await api.saveLanguageVersion("9", language, document, null);
        const body = JSON.parse(calls.at(-1).options.body);
        assert.equal(body.document.content[0].content[0].text, "Translation");
        assert.deepEqual(body.document.content[0].attrs, { textAlign: "right", paragraphSpacing: "16px" });
        assert.deepEqual(body.document.content[0].content[0].marks, [
            { type: "bold" },
            { type: "underline" },
            { type: "textStyle", attrs: { color: "#D4AF65" } },
        ]);
    }
});

test("supported backend font families are retained and unsupported font-only marks are removed", async () => {
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
            content: [
                ...["Noto Nastaliq Urdu", "Noto Sans Devanagari", "DM Sans", "Georgia"].map((fontFamily) => ({
                    type: "text",
                    text: fontFamily,
                    marks: [{ type: "textStyle", attrs: { fontFamily } }],
                })),
                { type: "text", text: " plain", marks: [{ type: "textStyle", attrs: { fontFamily: "Noto Naskh Arabic" } }] },
            ],
        }],
    };

    await api.saveLanguageVersion("9", "roman", document, null);

    const content = JSON.parse(calls[0].options.body).document.content[0].content;
    assert.deepEqual(content.slice(0, 4).map((node) => node.marks[0].attrs.fontFamily), [
        "Noto Nastaliq Urdu", "Noto Sans Devanagari", "DM Sans", "Georgia",
    ]);
    assert.equal(content[4].text, " plain");
    assert.equal(content[4].marks, undefined);
});

test("language save surfaces HTTP 400 validation errors instead of reporting success", async () => {
    const api = createLyricsApi({
        baseUrl: "https://api.test",
        auth: createAuth(async () => response(400, {
            error: "INVALID_PARAMETER",
            message: "Unsupported font family.",
        })),
    });

    await assert.rejects(api.saveLanguageVersion("9", "roman", {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Translation" }] }],
    }, null), (error) => {
        assert.equal(error.status, 400);
        assert.equal(error.code, "INVALID_PARAMETER");
        assert.equal(error.message, "Unsupported font family.");
        return true;
    });
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
