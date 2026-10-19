import test from "node:test";
import assert from "node:assert/strict";
import { isLyricDocument, lyricDocumentToText, textToLyricDocument } from "./lyricDocument.js";

test("legacy lyric text converts to independent paragraph nodes and round-trips", () => {
    const document = textToLyricDocument("First line\n\nSecond line");

    assert.equal(document.content.length, 3);
    assert.equal(lyricDocumentToText(document), "First line\n\nSecond line");
    assert.equal(isLyricDocument(document), true);
});

test("formatted runs and hard breaks flatten without dropping lyric text", () => {
    const document = {
        type: "doc",
        content: [{
            type: "paragraph",
            content: [
                { type: "text", text: "Gold", marks: [{ type: "bold" }] },
                { type: "hardBreak" },
                { type: "text", text: "line" },
            ],
        }],
    };

    assert.equal(lyricDocumentToText(document), "Gold\nline");
    assert.equal(isLyricDocument({ type: "paragraph", content: [] }), false);
});