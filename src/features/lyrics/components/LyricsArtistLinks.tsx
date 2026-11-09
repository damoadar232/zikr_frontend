import type { ApiArtistProfile, ApiPublicLyric } from "../services/lyricsApiService.js";
import { getLyricArtistProfiles, getLyricWriterName } from "../utils/lyricsPresentation";
import { ArtistProfileAvatar } from "./ArtistProfileAvatar";

type LyricsArtistLinksProps = {
    item: ApiPublicLyric;
    onArtistSelect: (artistId: number, relationship: "reciter" | "writer") => void;
};

function ArtistLink({ profile, name, onClick }: { profile?: ApiArtistProfile; name: string; onClick?: () => void }) {
    return <span className="lyrics-artist-name-wrap">
        {profile && <ArtistProfileAvatar imageUrl={profile.profileImageUrl} />}
        {onClick
            ? <button type="button" className="lyrics-artist-name-link" onClick={onClick}>{name}</button>
            : <span>{name}</span>}
    </span>;
}

export function ReciterArtistLinks({ item, onArtistSelect }: LyricsArtistLinksProps) {
    const profiles = getLyricArtistProfiles(item);
    const reciterProfiles = (item.reciterIds || [])
        .map((id) => profiles.find((profile) => profile.id === id))
        .filter((profile): profile is ApiArtistProfile => profile !== undefined);
    const profileNames = new Set(reciterProfiles.map((profile) =>
        (profile.displayName?.trim() || profile.fullName).trim().toLowerCase()));
    const legacyNames = (item.reciters || []).filter((name) =>
        !profileNames.has(name.trim().toLowerCase()));

    return <span className="lyrics-artist-links">
        {reciterProfiles.map((profile, index) => {
            const name = profile.displayName?.trim() || profile.fullName;
            const hasGlobalId = Number.isSafeInteger(profile.id) && profile.id > 0;
            return <span className="lyrics-artist-link-item" key={profile.id}>
                {index > 0 && <span aria-hidden="true">, </span>}
                <ArtistLink
                    profile={profile}
                    name={name}
                    onClick={hasGlobalId ? () => onArtistSelect(profile.id, "reciter") : undefined}
                />
            </span>;
        })}
        {legacyNames.map((name, index) => <span className="lyrics-artist-link-item" key={`${name}-${index}`}>
            {(reciterProfiles.length > 0 || index > 0) && <span aria-hidden="true">, </span>}
            <ArtistLink name={name} />
        </span>)}
    </span>;
}

export function WriterArtistLink({ item, onArtistSelect }: LyricsArtistLinksProps) {
    const name = getLyricWriterName(item);
    const artistId = item.writerId;
    const profile = getLyricArtistProfiles(item).find((candidate) => candidate.id === item.writerId);
    const hasGlobalId = typeof artistId === "number" && Number.isSafeInteger(artistId) && artistId > 0;
    if (name === "Unknown writer") return null;

    return <ArtistLink
        profile={profile}
        name={name}
        onClick={hasGlobalId ? () => onArtistSelect(artistId, "writer") : undefined}
    />;
}
