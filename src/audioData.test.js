import test from "node:test";
import assert from "node:assert/strict";
import { audioLibrary, audioCategories, filterAudioLibrary, getAudioById } from "./audioData.js";

test("audio library stays newest-first and supports title/artist search with category filtering", () => {
    assert.ok(audioLibrary.length > 0);
    assert.equal(audioLibrary[0].title, "Karam Mangta Hoon");

    const byTitle = filterAudioLibrary(audioLibrary, { search: "mustafa", category: "All Audio" });
    assert.equal(byTitle.length, 1);
    assert.equal(byTitle[0].title, "Mustafa Jaan-e-Rehmat");

    const byArtist = filterAudioLibrary(audioLibrary, { search: "owais", category: "Naat Sharif" });
    assert.ok(byArtist.some((item) => item.artist.includes("Owais")));
    assert.ok(audioCategories.some((category) => category.name === "Naat Sharif"));
});

test("audio lookup returns the matching record and related lyrics by id", () => {
    const item = getAudioById("mustafa-jaan-e-rehmat");
    assert.ok(item);
    assert.equal(item.title, "Mustafa Jaan-e-Rehmat");
    assert.ok(item.relatedLyrics.includes("mustafa-jaan-e-rehmat"));
});
