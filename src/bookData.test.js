import test from "node:test";
import assert from "node:assert/strict";
import { ebookLibrary, ebookCategories, filterEbooks, getEbookById } from "./bookData.js";

test("ebook library sorts newest first and supports title/author search with category filters", () => {
    assert.ok(ebookLibrary.length > 0);
    assert.equal(ebookLibrary[0].title, "Gardens of Devotion");

    const byTitle = filterEbooks(ebookLibrary, { search: "remembrance", category: "All Books" });
    assert.equal(byTitle.length, 1);
    assert.equal(byTitle[0].title, "Pathways of Remembrance");

    const byCategory = filterEbooks(ebookLibrary, { search: "", category: "Naat Books" });
    assert.ok(byCategory.every((item) => item.category === "Naat Books"));
    assert.ok(ebookCategories.some((category) => category.name === "Naat Books"));
});

test("ebook lookup returns the associated record and preserves a related book list", () => {
    const item = getEbookById("pathways-of-remembrance");
    assert.ok(item);
    assert.equal(item.title, "Pathways of Remembrance");
    assert.ok(Array.isArray(item.relatedBooks));
    assert.ok(item.relatedBooks.includes("gardens-of-devotion"));
});
