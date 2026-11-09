import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AudioRecord } from "../../../audioData.js";
import { getUserFacingError } from "../../../app/notifications/toastStore.js";
import { Icon } from "../../../components/ui";
import { artistsApi } from "../../artists/services/artistsApiService.js";
import type { ApiPublicArtistProfile } from "../../artists/services/artistsApiService.js";
import { ArtistProfileAvatar } from "../../lyrics/components/ArtistProfileAvatar";
import { listPublicAudiosByArtistId } from "../services/audioApiService.js";

export type AudioArtistSelection = {
    artistId: number;
    artistName: string;
    profileImageUrl?: string | null;
};

type AudioArtistProfileDrawerProps = {
    selection: AudioArtistSelection;
    onClose: () => void;
    onSelectAudio: (audio: AudioRecord) => void;
};

function formatPublishedDate(value: string) {
    if (!value) return "";
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function AudioArtistProfileDrawer({ selection, onClose, onSelectAudio }: AudioArtistProfileDrawerProps) {
    const [artist, setArtist] = useState<ApiPublicArtistProfile | null>(null);
    const [audios, setAudios] = useState<AudioRecord[]>([]);
    const [totalAudios, setTotalAudios] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        let active = true;
        setArtist(null);
        setAudios([]);
        setTotalAudios(0);
        setLoading(true);
        setError("");

        void Promise.all([
            artistsApi.getPublicArtistProfile(selection.artistId),
            listPublicAudiosByArtistId(selection.artistId, { page: 0, size: 10 }),
        ]).then(([profile, page]) => {
            if (!active) return;
            setArtist(profile);
            setAudios(page.items.slice(0, 10));
            setTotalAudios(page.totalElements);
        }).catch((requestError: unknown) => {
            if (active) {
                setError(getUserFacingError(requestError, "The artist profile and related audio could not be loaded."));
            }
        }).finally(() => {
            if (active) setLoading(false);
        });

        return () => { active = false; };
    }, [retry, selection.artistId]);

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
            const drawer = document.querySelector<HTMLElement>(".audio-artist-drawer");
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

    const artistName = artist?.displayName?.trim() || artist?.fullName || selection.artistName;

    return createPortal(
        <div
            className="lyrics-artist-drawer-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <aside className="lyrics-artist-drawer audio-artist-drawer" role="dialog" aria-modal="true" aria-labelledby="audio-artist-drawer-title">
                <div className="lyrics-artist-drawer-header">
                    <div className="lyrics-artist-profile">
                        <ArtistProfileAvatar imageUrl={artist ? artist.profileImageUrl : selection.profileImageUrl} size="profile" />
                        <div>
                            <span className="eyebrow">ARTIST PROFILE</span>
                            <h2 id="audio-artist-drawer-title">{artistName}</h2>
                            {artist?.biography && <p>{artist.biography}</p>}
                        </div>
                    </div>
                    <button ref={closeButtonRef} type="button" className="lyrics-artist-drawer-close" aria-label="Close artist profile" onClick={onClose}>
                        <Icon name="x" />
                    </button>
                </div>
                <section className="lyrics-artist-drawer-content" aria-labelledby="audio-artist-content-heading">
                    <h3 id="audio-artist-content-heading">Audio</h3>
                    {loading
                        ? <div className="lyrics-artist-drawer-state" role="status"><span className="lyrics-artist-loading-indicator" />Loading artist audio…</div>
                        : error
                            ? <div className="lyrics-artist-drawer-state" role="alert"><p>{error}</p><button type="button" className="btn btn-primary" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>
                            : audios.length
                                ? <>
                                    <p className="lyrics-artist-results-count">{totalAudios} {totalAudios === 1 ? "audio record" : "audio records"}</p>
                                    <ol className="lyrics-artist-list">
                                        {audios.map((audio, index) => (
                                            <li key={audio.id}>
                                                <span className="lyrics-artist-list-number">{index + 1}</span>
                                                {audio.image
                                                    ? <img className="lyrics-artist-list-thumbnail" src={audio.image} alt="" loading="lazy" />
                                                    : <span className="lyrics-artist-list-thumbnail audio-artist-list-placeholder" aria-hidden="true"><Icon name="headphones" /></span>}
                                                <div className="lyrics-artist-list-copy">
                                                    <button type="button" className="lyrics-artist-list-title" onClick={() => onSelectAudio(audio)}>{audio.title}</button>
                                                    <small>{[
                                                        audio.categories?.join(" • "),
                                                        audio.language || "",
                                                        audio.duration,
                                                        formatPublishedDate(audio.date),
                                                    ].filter(Boolean).join(" · ")}</small>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                </>
                                : <div className="lyrics-artist-drawer-state"><p>No audio records found for this artist.</p></div>}
                </section>
            </aside>
        </div>,
        document.body,
    );
}
