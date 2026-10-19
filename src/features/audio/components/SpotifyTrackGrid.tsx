import { getSpotifyTrackId, spotifyTrackReferences, type SpotifyTrackReference } from "../data/spotifyTracks.js";

type Track = SpotifyTrackReference & { title?: string };

export function SpotifyTrackGrid({ tracks = spotifyTrackReferences }: { tracks?: Track[] }) {
    return <div className="spotify-track-grid">{tracks.map((track, index) => {
        const trackId = getSpotifyTrackId(track.url);
        const title = track.title || "Spotify track";
        return <article className="spotify-track-card" key={`${trackId || "invalid"}-${index}`}>
            {trackId ? <iframe title={`${title} ${index + 1} player`} src={`https://open.spotify.com/embed/track/${trackId}`} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" /> : <div className="spotify-track-unavailable">Spotify player unavailable for this URL.</div>}
            <div className="spotify-track-card-footer"><span>{title}</span><a href={track.url} target="_blank" rel="noopener noreferrer">Open in Spotify</a></div>
        </article>;
    })}</div>;
}
