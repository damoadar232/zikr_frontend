import test from "node:test";
import assert from "node:assert/strict";
import { dismissToast, getToasts, getUserFacingError, notify, subscribeToToasts } from "./toastStore.js";

test("publishes each notification type and supports manual dismissal", () => {
    const changes = [];
    const unsubscribe = subscribeToToasts(() => changes.push(getToasts()));
    const ids = [
        notify.success("Saved.", { duration: 0 }),
        notify.error("Failed.", { duration: 0 }),
        notify.warning("Check the value.", { duration: 0 }),
        notify.info("No changes.", { duration: 0 }),
    ];

    assert.deepEqual(getToasts().map(({ type }) => type), ["success", "error", "warning", "info"]);
    assert.equal(changes.length, 4);
    dismissToast(ids[0]);
    assert.deepEqual(getToasts().map(({ type }) => type), ["error", "warning", "info"]);
    unsubscribe();
    ids.slice(1).forEach(dismissToast);
});

test("deduplicates identical messages and maps unsafe or common HTTP errors safely", () => {
    const id = notify.error("Repeated failure.", { duration: 0 });
    assert.equal(notify.error("Repeated failure.", { duration: 0 }), null);
    assert.equal(getUserFacingError({ status: 401, message: "Unauthorized" }), "Your session has expired. Sign in again.");
    assert.equal(getUserFacingError({ status: 409, message: "Artist cannot be deleted while lyrics reference it." }), "Artist cannot be deleted while lyrics reference it.");
    assert.equal(getUserFacingError({ status: 500, message: "SQLSTATE bad connection" }), "The request failed. Please try again.");
    assert.equal(getUserFacingError(new Error("SQLSTATE bad connection")), "The request failed. Please try again.");
    assert.equal(getUserFacingError(new Error("A useful validation message.")), "A useful validation message.");
    assert.equal(getUserFacingError(new Error("Invalid input:\n ayah number is already in use.")), "Invalid input: ayah number is already in use.");
    dismissToast(id);
});
