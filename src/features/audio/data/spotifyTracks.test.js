import test from "node:test";
import assert from "node:assert/strict";
import { getSpotifyTrackId, spotifyTrackReferences } from "./spotifyTracks.js";

test("the three supplied Spotify URLs preserve their actual track IDs", () => {
    assert.deepEqual(spotifyTrackReferences.map((track) => getSpotifyTrackId(track.url)), [
        "2bjELSr9NYibxVqSIeMnl7",
        "4NAMfnF5k9ljKc5KbZUYjG",
        "3AiKKRO8B1HwCz4r7camvA",
    ]);
});

test("Spotify ID parser rejects unrelated hosts and malformed track paths", () => {
    assert.equal(getSpotifyTrackId("http://open.spotify.com/track/2bjELSr9NYibxVqSIeMnl7"), null);
    assert.equal(getSpotifyTrackId("https://example.com/track/2bjELSr9NYibxVqSIeMnl7"), null);
    assert.equal(getSpotifyTrackId("https://open.spotify.com/track/not-a-track-id"), null);
});