import test from "node:test";
import assert from "node:assert/strict";
import { lyricCategories } from "../../../lyricsData.js";
import { filterSearchableOptions, toggleSelectedValue } from "./searchableMultiSelectUtils.js";

const categoryOptions = lyricCategories.map(({ id, name }) => ({ value: id, label: name }));

test("category search filters labels without changing category IDs", () => {
    assert.deepEqual(
        filterSearchableOptions(categoryOptions, "  DUA ").map(({ value, label }) => ({ value, label })),
        [{ value: "dua", label: "Dua" }],
    );
    assert.deepEqual(
        filterSearchableOptions(categoryOptions, "kalam").map(({ value }) => value),
        ["sufi-kalam", "other-kalam"],
    );
});

test("category selection toggles the stable option ID", () => {
    assert.deepEqual(toggleSelectedValue(["dua"], "other-kalam"), ["dua", "other-kalam"]);
    assert.deepEqual(toggleSelectedValue(["dua", "other-kalam"], "other-kalam"), ["dua"]);
});
