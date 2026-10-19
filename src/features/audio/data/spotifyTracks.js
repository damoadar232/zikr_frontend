export const spotifyTrackReferences = [
    { url: "https://open.spotify.com/track/2bjELSr9NYibxVqSIeMnl7?si=b46b70805e1d4694" },
    { url: "https://open.spotify.com/track/4NAMfnF5k9ljKc5KbZUYjG?si=9b6185a80d2e4a02" },
    { url: "https://open.spotify.com/track/3AiKKRO8B1HwCz4r7camvA?si=dad5d576f1f545be" },
];

export function getSpotifyTrackId(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "open.spotify.com") return null;
        const match = url.pathname.match(/^\/track\/([A-Za-z0-9]{22})\/?$/);
        return match?.[1] || null;
    } catch {
        return null;
    }
}
