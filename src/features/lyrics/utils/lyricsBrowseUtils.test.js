import test from "node:test";
import assert from "node:assert/strict";
import { buildAvailableBrowseEntries } from "./lyricsBrowseUtils.js";

test("browse entries include only associated lyrics and count a lyric once per option", () => {
    const lyrics = [
        { title: "First", categoryIds: ["hamd", "hamd", "naat-sharif"] },
        { title: "Second", categoryIds: ["hamd"] },
    ];
    const options = [
        { id: "hamd", name: "Hamd" },
        { id: "naat-sharif", name: "Naat Sharif" },
        { id: "manqabat", name: "Manqabat" },
    ];

    assert.deepEqual(
        buildAvailableBrowseEntries(options, lyrics, (lyric) => lyric.categoryIds),
        [
            { id: "hamd", name: "Hamd", lyrics: [lyrics[0], lyrics[1]] },
            { id: "naat-sharif", name: "Naat Sharif", lyrics: [lyrics[0]] },
        ],
    );
});

test("browse entries support multiple reciters and omit names with no published lyrics", () => {
    const lyrics = [
        { title: "First", reciters: ["Reciter A", "Reciter B"] },
        { title: "Second", reciters: ["Reciter A"] },
    ];
    const options = [
        { id: "Reciter A", name: "Reciter A" },
        { id: "Reciter B", name: "Reciter B" },
        { id: "Reciter C", name: "Reciter C" },
    ];

    const entries = buildAvailableBrowseEntries(options, lyrics, (lyric) => lyric.reciters);

    assert.deepEqual(entries.map(({ id, lyrics: associated }) => [id, associated.length]), [
        ["Reciter A", 2],
        ["Reciter B", 1],
    ]);
});
