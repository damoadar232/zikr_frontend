import { useState } from "react";
import { getSpotifyTrackId, spotifyTrackReferences, type SpotifyTrackReference } from "../data/spotifyTracks.js";

type Track = SpotifyTrackReference & { title?: string };

export function SpotifyTrackGrid({ tracks = spotifyTrackReferences }: { tracks?: Track[] }) {
    return <div className="spotify-track-grid">{tracks.map((track, index) => {
        const trackId = getSpotifyTrackId(track.url);
        const title = track.title || "Spotify track";
        return <SpotifyTrackCard key={`${trackId || "invalid"}-${index}`} track={track} title={title} trackId={trackId} index={index} />;
    })}</div>;
}

function SpotifyTrackCard({ track, title, trackId, index }: { track: Track; title: string; trackId: string | null; index: number }) {
    const [failed, setFailed] = useState(false);
    return <article className="spotify-track-card" key={`${trackId || "invalid"}-${index}`}>
            {trackId && !failed
                ? <iframe title={`${title} ${index + 1} player`} src={`https://open.spotify.com/embed/track/${trackId}`} loading="lazy" allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture" onError={() => setFailed(true)} />
                : <div className="spotify-track-unavailable">{failed ? "The Spotify embed did not load. Open the track on Spotify instead." : "Spotify player unavailable for this URL."}</div>}
            <div className="spotify-track-card-footer"><span>{title}</span><a href={track.url} target="_blank" rel="noopener noreferrer">Open in Spotify</a></div>
    </article>;
}
