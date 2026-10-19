import test from "node:test";
import assert from "node:assert/strict";
import { getYouTubeVideoId, slugifyLyricsTitle } from "./youtubeVideo.js";

test("YouTube video IDs are extracted from supported HTTPS URL forms", () => {
    assert.equal(getYouTubeVideoId("https://youtu.be/02fd3o7Y7VQ?si=OOwuBhWq-2g6bAoB"), "02fd3o7Y7VQ");
    assert.equal(getYouTubeVideoId("https://youtu.be/zB1-Ru_GFkI?si=dVOg1ZgRBlKd0xIr"), "zB1-Ru_GFkI");
    assert.equal(getYouTubeVideoId("https://youtu.be/qoBLw2a8j0M?si=gtUSVyqdneTILlJ7"), "qoBLw2a8j0M");
    assert.equal(getYouTubeVideoId("https://www.youtube.com/watch?v=zB1-Ru_GFkI"), "zB1-Ru_GFkI");
    assert.equal(getYouTubeVideoId("https://youtube.com/embed/qoBLw2a8j0M"), "qoBLw2a8j0M");
    assert.equal(getYouTubeVideoId("https://youtube.com/watch?v=bad"), null);
    assert.equal(getYouTubeVideoId("javascript:alert(1)"), null);
});

test("lyrics slugs are normalized and empty non-Latin titles get a stable fallback", () => {
    assert.equal(slugifyLyricsTitle("  Karam & Mercy  "), "karam-mercy");
    assert.equal(slugifyLyricsTitle("دعائے نور"), "lyrics");
});