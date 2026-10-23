import test from "node:test";
import assert from "node:assert/strict";
import { createArtistsApi } from "./artistsApiService.js";
import { AdminAuthenticationError } from "../../auth/services/adminAuth.js";

function response(status, data) {
    return { status, ok: status >= 200 && status < 300, json: async () => data };
}

test("admin artist listing forwards encoded query, role, and status filters", async () => {
    const calls = [];
    const api = createArtistsApi({
        baseUrl: "https://api.test",
        auth: {
            authenticatedFetch: async (url, options) => {
                calls.push({ url, options });
                return response(200, { data: { items: [], page: 0, size: 10, totalElements: 0, totalPages: 0 } });
            },
        },
    });

    const result = await api.getArtists({ page: 1, size: 10, role: "NAAT_KHWAN", status: "ACTIVE", query: "Owais Raza" });

    assert.equal(result.totalElements, 0);
    assert.match(calls[0].url, /^\/api\/v1\/admin\/artists\?/);
    assert.match(calls[0].url, /page=1/);
    assert.match(calls[0].url, /size=10/);
    assert.match(calls[0].url, /query=Owais\+Raza/);
    assert.match(calls[0].url, /role=NAAT_KHWAN/);
    assert.match(calls[0].url, /status=ACTIVE/);
});

test("admin artist listing omits unspecified filters and string IDs are URL encoded", async () => {
    const calls = [];
    const api = createArtistsApi({
        baseUrl: "https://api.test",
        auth: {
            authenticatedFetch: async (url) => {
                calls.push(url);
                return response(200, { data: { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 } });
            },
        },
    });

    await api.getArtists();
    await api.getArtistById("नात-कलाकार/name");

    assert.equal(calls[0], "/api/v1/admin/artists");
    assert.equal(calls[1], "/api/v1/admin/artists/%E0%A4%A8%E0%A4%BE%E0%A4%A4-%E0%A4%95%E0%A4%B2%E0%A4%BE%E0%A4%95%E0%A4%BE%E0%A4%B0%2Fname");
});

test("artist CRUD, status, options, and role calls use the authenticated API contract", async () => {
    const calls = [];
    const api = createArtistsApi({
        baseUrl: "https://api.test",
        auth: {
            authenticatedFetch: async (url, options) => {
                calls.push({ url, options });
                if (options.method === "DELETE") return response(204, null);
                return response(200, { data: { id: "new-artist" } });
            },
        },
    });

    await api.getArtist("legacy-artist");
    await api.createArtist({ fullName: "New Artist", roles: ["SINGER", "POET"] });
    await api.updateArtist("new-artist", { fullName: "New Artist", roles: ["WRITER"] });
    await api.updateArtistStatus("new-artist", "INACTIVE");
    await api.getArtistOptions({ role: "RECITER", query: "Owais" });
    await api.getArtistRoles();
    assert.equal(await api.deleteArtist("new-artist"), undefined);

    assert.deepEqual(calls.map(({ url }) => url), [
        "/api/v1/admin/artists/legacy-artist",
        "/api/v1/admin/artists",
        "/api/v1/admin/artists/new-artist",
        "/api/v1/admin/artists/new-artist/status",
        "/api/v1/admin/artists/options?role=RECITER&query=Owais",
        "/api/v1/admin/artists/roles",
        "/api/v1/admin/artists/new-artist",
    ]);
    assert.equal(calls[1].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[1].options.body).roles, ["SINGER", "POET"]);
    assert.deepEqual(JSON.parse(calls[3].options.body), { status: "INACTIVE" });
    assert.equal(calls[6].options.method, "DELETE");
});

test("artist deletion preserves the backend restriction for artists referenced by lyrics", async () => {
    const api = createArtistsApi({
        baseUrl: "https://api.test",
        auth: {
            authenticatedFetch: async () => response(409, {
                error: "CONFLICT",
                message: "Artist is referenced by lyrics and cannot be deleted. Deactivate it instead.",
            }),
        },
    });

    await assert.rejects(api.deleteArtist("referenced-artist"), (error) => {
        assert.equal(error.status, 409);
        assert.equal(error.code, "CONFLICT");
        assert.equal(error.message, "Artist is referenced by lyrics and cannot be deleted. Deactivate it instead.");
        return true;
    });
});

test("public artist options and roles do not use administrator authentication", async () => {
    const calls = [];
    const api = createArtistsApi({
        baseUrl: "https://api.test",
        auth: { authenticatedFetch: async () => assert.fail("Public requests must not use administrator auth") },
        fetchImpl: async (url) => {
            calls.push(url);
            return response(200, { data: [] });
        },
    });

    await api.getPublicArtistOptions({ role: "SINGER" });
    await api.getPublicRoles();

    assert.deepEqual(calls, [
        "https://api.test/api/v1/artists/options?role=SINGER",
        "https://api.test/api/v1/artists/roles",
    ]);
});

test("artist API errors preserve server status and message", async () => {
    const api = createArtistsApi({
        baseUrl: "https://api.test",
        auth: {
            authenticatedFetch: async () => response(409, { error: "CONFLICT", message: "Artist ID already exists." }),
        },
    });

    await assert.rejects(api.createArtist({ fullName: "Existing", roles: ["SINGER"] }), (error) => {
        assert.equal(error.status, 409);
        assert.equal(error.code, "CONFLICT");
        assert.equal(error.message, "Artist ID already exists.");
        return true;
    });
});

test("artist validation errors include backend field details", async () => {
    const api = createArtistsApi({
        baseUrl: "https://api.test",
        auth: {
            authenticatedFetch: async () => response(400, {
                error: "VALIDATION_ERROR",
                message: "Request validation failed.",
                data: { fullName: "Full name is required.", roles: "At least one role is required." },
            }),
        },
    });

    await assert.rejects(api.createArtist({ fullName: "", roles: [] }), (error) => {
        assert.equal(error.status, 400);
        assert.equal(error.code, "VALIDATION_ERROR");
        assert.match(error.message, /fullName: Full name is required\./);
        assert.match(error.message, /roles: At least one role is required\./);
        return true;
    });
});

test("artist service rejects malformed successful envelopes and preserves auth/network failures", async () => {
    const invalidResponseApi = createArtistsApi({
        baseUrl: "https://api.test",
        auth: { authenticatedFetch: async () => response(200, { items: [] }) },
    });
    await assert.rejects(invalidResponseApi.getArtists(), (error) => {
        assert.equal(error.code, "INVALID_RESPONSE");
        return true;
    });

    const unauthorized = new AdminAuthenticationError("Your administrator session has expired.");
    const unauthorizedApi = createArtistsApi({
        baseUrl: "https://api.test",
        auth: { authenticatedFetch: async () => { throw unauthorized; } },
    });
    await assert.rejects(unauthorizedApi.getArtists(), (error) => error === unauthorized);

    const networkError = new Error("Network unavailable.");
    const networkApi = createArtistsApi({
        baseUrl: "https://api.test",
        fetchImpl: async () => { throw networkError; },
    });
    await assert.rejects(networkApi.getPublicRoles(), (error) => error === networkError);
});

test("artist service maps forbidden and not-found responses to API errors", async () => {
    for (const [status, code, message] of [
        [403, "FORBIDDEN", "Insufficient permissions."],
        [404, "NOT_FOUND", "Artist not found."],
    ]) {
        const api = createArtistsApi({
            baseUrl: "https://api.test",
            auth: {
                authenticatedFetch: async () => response(status, { error: code, message }),
            },
        });
        await assert.rejects(api.getArtistById("missing-artist"), (error) => {
            assert.equal(error.status, status);
            assert.equal(error.code, code);
            assert.equal(error.message, message);
            return true;
        });
    }
});
