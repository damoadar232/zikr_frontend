import test from "node:test";
import assert from "node:assert/strict";
import { ADMIN_SESSION_KEY, createAdminAuth, AdminAuthenticationError } from "./adminAuth.js";

function createStorage() {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) || null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
    };
}

function response(status, data) {
    return { status, ok: status >= 200 && status < 300, json: async () => data };
}

test("admin login stores only a role-authorized session in the supplied session storage", async () => {
    const storage = createStorage();
    const calls = [];
    const auth = createAdminAuth({
        baseUrl: "https://api.test",
        storage,
        eventTarget: null,
        now: () => 1000,
        fetchImpl: async (url, options) => {
            calls.push({ url, options });
            return response(200, { data: { accessToken: "access", refreshToken: "refresh", expiresIn: 600, role: "ADMIN", displayName: "Editor" } });
        },
    });

    assert.deepEqual(await auth.login("admin@example.test", "not-a-source-secret"), {
        role: "ADMIN", displayName: "Editor", expiresAt: 601000,
    });
    assert.equal(JSON.parse(storage.getItem(ADMIN_SESSION_KEY)).refreshToken, "refresh");
    assert.equal(calls[0].url, "https://api.test/api/v1/auth/login");
    assert.equal(calls[0].options.body, JSON.stringify({ email: "admin@example.test", password: "not-a-source-secret" }));
});

test("unauthorized roles are not stored as administrator sessions", async () => {
    const storage = createStorage();
    const auth = createAdminAuth({
        baseUrl: "https://api.test", storage, eventTarget: null,
        fetchImpl: async () => response(200, { data: { accessToken: "viewer", refreshToken: "refresh", expiresIn: 60, role: "VIEWER" } }),
    });

    await assert.rejects(auth.login("viewer@example.test", "password123"), AdminAuthenticationError);
    assert.equal(storage.getItem(ADMIN_SESSION_KEY), null);
});

test("expired access token refreshes once and retries the authenticated request", async () => {
    const storage = createStorage();
    const calls = [];
    const auth = createAdminAuth({
        baseUrl: "https://api.test", storage, eventTarget: null, now: () => 50_000,
        fetchImpl: async (url, options) => {
            calls.push({ url, options });
            if (url.endsWith("/api/v1/auth/login")) {
                return response(200, { data: { accessToken: "access-old", refreshToken: "refresh-old", expiresIn: 1, role: "ADMIN" } });
            }
            if (url.endsWith("/api/v1/auth/refresh")) {
                return response(200, { data: { accessToken: "access-new", refreshToken: "refresh-new", expiresIn: 600, role: "ADMIN" } });
            }
            return response(calls.filter((call) => call.url.endsWith("/api/v1/lyrics")).length === 1 ? 401 : 200, { data: [] });
        },
    });
    await auth.login("admin@example.test", "password123");
    calls.length = 0;

    const result = await auth.authenticatedFetch("/api/v1/admin/lyrics");

    assert.equal(result.status, 200);
    assert.equal(calls.filter((call) => call.url.endsWith("/api/v1/auth/refresh")).length, 1);
    assert.equal(calls.at(-1).options.headers.Authorization, "Bearer access-new");
});

test("refresh failure clears session and never embeds tokens in the error", async () => {
    const storage = createStorage();
    const auth = createAdminAuth({
        baseUrl: "https://api.test", storage, eventTarget: null,
        fetchImpl: async (url) => url.endsWith("/login")
            ? response(200, { data: { accessToken: "access", refreshToken: "secret-refresh", expiresIn: 1, role: "ADMIN" } })
            : response(401, { error: "UNAUTHORIZED", message: "expired" }),
    });
    await auth.login("admin@example.test", "password123");

    await assert.rejects(auth.authenticatedFetch("/api/v1/admin/lyrics"), (error) => {
        assert.equal(error instanceof AdminAuthenticationError, true);
        assert.equal(error.message.includes("secret-refresh"), false);
        return true;
    });
    assert.equal(storage.getItem(ADMIN_SESSION_KEY), null);
});