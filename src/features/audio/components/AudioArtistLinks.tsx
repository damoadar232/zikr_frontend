import type { AudioArtistCredit } from "../../../audioData.js";

type AudioArtistLinksProps = {
    credits?: AudioArtistCredit[];
    fallbackName: string;
    onArtistSelect?: (credit: AudioArtistCredit) => void;
};

export function AudioArtistLinks({ credits, fallbackName, onArtistSelect }: AudioArtistLinksProps) {
    if (!credits?.length) return <>{fallbackName}</>;

    return <span className="lyrics-artist-links">
        {credits.map((credit, index) => {
            const name = credit.displayName?.trim() || credit.fullName;
            const hasGlobalId = Number.isSafeInteger(credit.id) && credit.id > 0;
            return <span className="lyrics-artist-link-item" key={credit.id}>
                {index > 0 && <span aria-hidden="true">, </span>}
                {onArtistSelect && hasGlobalId
                    ? <button
                        type="button"
                        className="lyrics-artist-name-link"
                        onClick={() => onArtistSelect(credit)}
                    >
                        {name}
                    </button>
                    : name}
            </span>;
        })}
    </span>;
}
