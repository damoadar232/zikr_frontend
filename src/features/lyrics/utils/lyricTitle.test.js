import test from "node:test";
import assert from "node:assert/strict";
import { splitLyricTitle } from "./lyricTitle.js";

test("combined lyric titles split into exact primary and transliterated values", () => {
    const title = "तुम ज़ात-ए-ख़ुदा से न जुदा हो न ख़ुदा हो / Tum Zaat-e-Khuda Se Na Juda Ho Na Khuda Ho";
    assert.deepEqual(splitLyricTitle(title), {
        primary: "तुम ज़ात-ए-ख़ुदा से न जुदा हो न ख़ुदा हो",
        secondary: "Tum Zaat-e-Khuda Se Na Juda Ho Na Khuda Ho",
    });
});

test("titles without a usable separator remain unchanged for display", () => {
    assert.equal(splitLyricTitle("Karam Mangta Hoon"), null);
    assert.equal(splitLyricTitle("Title / "), null);
    assert.deepEqual(splitLyricTitle("  देवनागरी  /  Roman  "), { primary: "देवनागरी", secondary: "Roman" });
});
