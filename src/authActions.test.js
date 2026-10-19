import test from "node:test";
import assert from "node:assert/strict";
import {
    clearPendingAction,
    createPendingAction,
    readPendingAction,
    safeReturnTo,
    savePendingAction,
} from "./authActions.js";

function createMemoryStorage() {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) || null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
    };
}

test("pending actions validate identifiers, action types, and same-app destinations", () => {
    const action = createPendingAction({
        action: "download-audio",
        contentType: "audio",
        contentId: "karam-mangta-hoon",
        returnTo: "#audio-detail?id=karam-mangta-hoon",
    });
    assert.deepEqual(action, {
        version: 1,
        action: "download-audio",
        contentType: "audio",
        contentId: "karam-mangta-hoon",
        returnTo: "#audio-detail?id=karam-mangta-hoon",
    });

    assert.equal(createPendingAction({
        action: "download-audio",
        contentType: "book",
        contentId: "sample",
        returnTo: "#audio",
    }), null);
    assert.equal(createPendingAction({
        action: "bookmark-quran",
        contentType: "quran-ayah",
        contentId: "1:1",
        returnTo: "#lyrics",
    }), null);
    assert.equal(safeReturnTo("https://evil.example", "download-audio"), null);
    assert.equal(safeReturnTo("#login", "download-audio"), null);
});

test("pending actions persist once in session storage and malformed data is ignored", () => {
    const storage = createMemoryStorage();
    const action = {
        action: "bookmark-quran",
        contentType: "quran-ayah",
        contentId: "2:255",
        returnTo: "#surah-read?surah=2&ayah=255",
    };

    assert.equal(savePendingAction(action, storage), true);
    assert.deepEqual(readPendingAction(storage), { version: 1, ...action });
    storage.setItem("zikr-pending-auth-action", JSON.stringify({ ...action, returnTo: "#https://evil.example" }));
    assert.equal(readPendingAction(storage), null);
    assert.equal(clearPendingAction(storage), true);
    assert.equal(readPendingAction(storage), null);
});
