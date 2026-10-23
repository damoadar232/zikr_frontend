import test from "node:test";
import assert from "node:assert/strict";
import { createContentRepository } from "./contentRepository.js";

function createMemoryStorage() {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) || null,
        setItem: (key, value) => values.set(key, value),
    };
}

test("demo content repository supports create, read, update, publish, delete, and refresh persistence", () => {
    const storage = createMemoryStorage();
    const repository = createContentRepository({ storage, eventTarget: null });
    const initial = [{ id: "existing", title: "Existing", status: "published" }];

    repository.create("lyrics", { id: "new", title: "New", status: "draft" }, initial);
    assert.equal(repository.list("lyrics", initial).length, 2);
    assert.throws(() => repository.create("lyrics", { id: "new" }, initial), /identifier already exists/);
    repository.update("lyrics", "new", { status: "published", title: "Updated" }, initial);
    assert.equal(repository.list("lyrics", initial)[1].status, "published");
    repository.remove("lyrics", "new", initial);
    assert.deepEqual(repository.list("lyrics", initial), initial);
    assert.deepEqual(createContentRepository({ storage, eventTarget: null }).list("lyrics", []), initial);
});

test("deactivating a reciter profile does not remove existing lyric associations", () => {
    const repository = createContentRepository({ storage: createMemoryStorage(), eventTarget: null });
    const reciters = [{ id: "reciter-one", name: "Reciter One", status: "active" }];
    const lyrics = [{ id: "shared-lyric", title: "Shared lyric", reciterIds: ["reciter-one"], status: "published" }];
    repository.replace("reciters", reciters);
    repository.replace("lyrics", lyrics);

    repository.update("reciters", "reciter-one", { status: "inactive" }, reciters);

    assert.equal(repository.list("reciters", [])[0].status, "inactive");
    assert.deepEqual(repository.list("lyrics", [])[0].reciterIds, ["reciter-one"]);
});