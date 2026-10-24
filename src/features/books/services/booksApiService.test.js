import test from "node:test";
import assert from "node:assert/strict";
import { createBooksApi } from "./booksApiService.js";

function response(status, data) {
    return { status, ok: status >= 200 && status < 300, json: async () => data };
}

test("book listing uses the public API and returns numeric IDs with compatible slugs", async () => {
    const calls = [];
    const books = [{ id: 7, name: "Hadaiq-e-Bakhshish", author: "Imam Ahmed Raza Khan", slug: "hadaiq-e-bakhshish" }];
    const api = createBooksApi({
        baseUrl: "https://api.test",
        fetchImpl: async (...args) => {
            calls.push(args);
            return response(200, { data: books });
        },
    });

    assert.deepEqual(await api.listBooks(), books);
    assert.equal(calls[0][0], "https://api.test/api/v1/books");
    assert.equal(calls[0][1].headers.Accept, "application/json");
});

test("book listing reports invalid response envelopes", async () => {
    const api = createBooksApi({
        baseUrl: "https://api.test",
        fetchImpl: async () => response(200, { data: null }),
    });

    await assert.rejects(api.listBooks(), { code: "INVALID_RESPONSE" });
});
