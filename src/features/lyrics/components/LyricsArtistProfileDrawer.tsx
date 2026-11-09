import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getUserFacingError } from "../../../app/notifications/toastStore.js";
import { Icon } from "../../../components/ui";
import { artistsApi } from "../../artists/services/artistsApiService.js";
import type { ApiPublicArtistProfile } from "../../artists/services/artistsApiService.js";
import { lyricsApi } from "../services/lyricsApiService.js";
import type { ApiPublicLyric } from "../services/lyricsApiService.js";
import { formatLyricDate, getLyricCategoryNames } from "../utils/lyricsPresentation";
import { ArtistProfileAvatar } from "./ArtistProfileAvatar";
import { LyricTitle } from "./LyricTitle";

export type LyricsArtistRelationship = "reciter" | "writer";

export type LyricsArtistSelection = {
    artistId: number;
    relationship: LyricsArtistRelationship;
    artistName?: string;
    profileImageUrl?: string | null;
};

type LyricsArtistProfileDrawerProps = {
    selection: LyricsArtistSelection;
    onClose: () => void;
    onSelectLyric: (lyricId: string) => void;
};

export function LyricsArtistProfileDrawer({ selection, onClose, onSelectLyric }: LyricsArtistProfileDrawerProps) {
    const [artist, setArtist] = useState<ApiPublicArtistProfile | null>(null);
    const [lyrics, setLyrics] = useState<ApiPublicLyric[]>([]);
    const [totalLyrics, setTotalLyrics] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        let active = true;
        setArtist(null);
        setLyrics([]);
        setTotalLyrics(0);
        setLoading(true);
        setError("");

        const lyricsRequest = selection.relationship === "reciter"
            ? lyricsApi.listPublicLyricsByReciter(selection.artistId, { page: 0, size: 10 })
            : lyricsApi.listPublicLyricsByWriter(selection.artistId, { page: 0, size: 10 });

        void Promise.all([
            artistsApi.getPublicArtistProfile(selection.artistId),
            lyricsRequest,
        ]).then(([profile, page]) => {
            if (!active) return;
            setArtist(profile);
            setLyrics(page.items.slice(0, 10));
            setTotalLyrics(page.totalElements);
        }).catch((requestError: unknown) => {
            if (active) {
                setError(getUserFacingError(requestError, "The artist profile and related lyrics could not be loaded."));
            }
        }).finally(() => {
            if (active) setLoading(false);
        });

        return () => { active = false; };
    }, [retry, selection.artistId, selection.relationship]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        document.body.style.overflow = "hidden";
        closeButtonRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                onClose();
                return;
            }
            if (event.key !== "Tab") return;
            const drawer = document.querySelector<HTMLElement>(".lyrics-artist-drawer");
            const focusable = drawer?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]");
            if (!focusable?.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
            previousFocus?.focus();
        };
    }, [onClose]);

    const artistName = artist?.displayName?.trim() || artist?.fullName || selection.artistName || "Artist";
    const heading = selection.relationship === "reciter"
        ? `Lyrics recited by ${artistName}`
        : `Lyrics written by ${artistName}`;

    return createPortal(
        <div
            className="lyrics-artist-drawer-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <aside className="lyrics-artist-drawer lyrics-artist-profile-drawer" role="dialog" aria-modal="true" aria-labelledby="lyrics-artist-drawer-title">
                <div className="lyrics-artist-drawer-header">
                    <div className="lyrics-artist-profile">
                        <ArtistProfileAvatar imageUrl={artist ? artist.profileImageUrl : selection.profileImageUrl} size="profile" />
                        <div>
                            <span className="eyebrow">ARTIST PROFILE</span>
                            <h2 id="lyrics-artist-drawer-title">{artistName}</h2>
                            {artist?.biography && <p>{artist.biography}</p>}
                        </div>
                    </div>
                    <button ref={closeButtonRef} type="button" className="lyrics-artist-drawer-close" aria-label="Close artist profile" onClick={onClose}>
                        <Icon name="x" />
                    </button>
                </div>
                <section className="lyrics-artist-drawer-content" aria-labelledby="lyrics-artist-content-heading">
                    <h3 id="lyrics-artist-content-heading">{heading}</h3>
                    {!loading && !error && <p className="lyrics-artist-results-count">{totalLyrics} {totalLyrics === 1 ? "lyric" : "lyrics"}</p>}
                    {loading
                        ? <div className="lyrics-artist-drawer-state" role="status"><span className="lyrics-artist-loading-indicator" />Loading artist lyrics…</div>
                        : error
                            ? <div className="lyrics-artist-drawer-state" role="alert"><p>{error}</p><button type="button" className="btn btn-primary" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>
                            : lyrics.length
                                ? <ol className="lyrics-artist-profile-list">
                                        {lyrics.map((lyric, index) => (
                                            <li className="lyrics-artist-profile-card" key={lyric.id}>
                                                <span className="lyrics-artist-profile-card-number" aria-label={`Lyric ${index + 1}`}>{index + 1}</span>
                                                <div className="lyrics-artist-profile-card-content">
                                                    <button type="button" className="lyrics-artist-profile-card-title" onClick={() => onSelectLyric(lyric.id)}>
                                                        <LyricTitle title={lyric.title} />
                                                    </button>
                                                    <div className="lyrics-artist-profile-card-metadata">
                                                        {[
                                                            { label: "Category", value: getLyricCategoryNames(lyric).join(" • ") || "Uncategorized" },
                                                            { label: "Language", value: lyric.languageVersions[0]?.label || "Unknown" },
                                                            { label: "Published", value: lyric.createdAt ? formatLyricDate(lyric.createdAt) : "Recently published" },
                                                        ].map(({ label, value }) => (
                                                            <span className="lyrics-artist-profile-card-metadata-item" key={label}>
                                                                <small>{label}</small>
                                                                <span>{value}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                : <div className="lyrics-artist-drawer-state"><p>No lyrics found for this artist.</p></div>}
                </section>
            </aside>
        </div>,
        document.body,
    );
}
