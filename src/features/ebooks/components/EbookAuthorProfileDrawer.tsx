import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getUserFacingError } from "../../../app/notifications/toastStore.js";
import { Icon } from "../../../components/ui";
import { artistsApi } from "../../artists/services/artistsApiService.js";
import type { ApiPublicArtistProfile } from "../../artists/services/artistsApiService.js";
import { ArtistProfileAvatar } from "../../lyrics/components/ArtistProfileAvatar";
import {
    listPublicEbooksByAuthorId,
    type EbookLibraryItem,
} from "../services/ebooksApiService";

export type EbookAuthorSelection = {
    artistId: number;
    artistName: string;
    profileImageUrl?: string | null;
};

type EbookAuthorProfileDrawerProps = {
    selection: EbookAuthorSelection;
    onClose: () => void;
    onSelectEbook: (ebookId: string) => void;
};

function formatPublishedDate(value: string) {
    if (!value) return "";
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function EbookAuthorProfileDrawer({ selection, onClose, onSelectEbook }: EbookAuthorProfileDrawerProps) {
    const [artist, setArtist] = useState<ApiPublicArtistProfile | null>(null);
    const [ebooks, setEbooks] = useState<EbookLibraryItem[]>([]);
    const [totalEbooks, setTotalEbooks] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        let active = true;
        setArtist(null);
        setEbooks([]);
        setTotalEbooks(0);
        setLoading(true);
        setError("");

        void Promise.all([
            artistsApi.getPublicArtistProfile(selection.artistId),
            listPublicEbooksByAuthorId(selection.artistId, { page: 0, size: 10 }),
        ]).then(([profile, page]) => {
            if (!active) return;
            setArtist(profile);
            setEbooks(page.items.slice(0, 10));
            setTotalEbooks(page.totalElements);
        }).catch((requestError: unknown) => {
            if (active) {
                setError(getUserFacingError(requestError, "The author profile and related ebooks could not be loaded."));
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
            const drawer = document.querySelector<HTMLElement>(".ebook-author-drawer");
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

    const authorName = artist?.displayName?.trim() || artist?.fullName || selection.artistName;

    return createPortal(
        <div
            className="lyrics-artist-drawer-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <aside className="lyrics-artist-drawer ebook-author-drawer" role="dialog" aria-modal="true" aria-labelledby="ebook-author-drawer-title">
                <div className="lyrics-artist-drawer-header">
                    <div className="lyrics-artist-profile">
                        <ArtistProfileAvatar imageUrl={artist ? artist.profileImageUrl : selection.profileImageUrl} size="profile" />
                        <div>
                            <span className="eyebrow">AUTHOR PROFILE</span>
                            <h2 id="ebook-author-drawer-title">{authorName}</h2>
                            {artist?.biography && <p>{artist.biography}</p>}
                        </div>
                    </div>
                    <button ref={closeButtonRef} type="button" className="lyrics-artist-drawer-close" aria-label="Close author profile" onClick={onClose}>
                        <Icon name="x" />
                    </button>
                </div>
                <section className="lyrics-artist-drawer-content" aria-labelledby="ebook-author-content-heading">
                    <h3 id="ebook-author-content-heading">Ebooks by this Author</h3>
                    {loading
                        ? <div className="lyrics-artist-drawer-state" role="status"><span className="lyrics-artist-loading-indicator" />Loading author ebooks…</div>
                        : error
                            ? <div className="lyrics-artist-drawer-state" role="alert"><p>{error}</p><button type="button" className="btn btn-primary" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>
                            : ebooks.length
                                ? <>
                                    <p className="lyrics-artist-results-count">{totalEbooks} {totalEbooks === 1 ? "ebook" : "ebooks"}</p>
                                    <ol className="lyrics-artist-list">
                                        {ebooks.map((ebook, index) => (
                                            <li key={ebook.id}>
                                                <span className="lyrics-artist-list-number">{index + 1}</span>
                                                {ebook.coverImageUrl
                                                    ? <img className="lyrics-artist-list-thumbnail" src={ebook.coverImageUrl} alt="" loading="lazy" />
                                                    : <span className="lyrics-artist-list-thumbnail ebook-author-list-placeholder" aria-hidden="true"><Icon name="book" /></span>}
                                                <div className="lyrics-artist-list-copy">
                                                    <button type="button" className="lyrics-artist-list-title" onClick={() => onSelectEbook(ebook.id)}>{ebook.title}</button>
                                                    <small>{[
                                                        ebook.categories.map((category) => category.name).join(" • "),
                                                        ebook.language,
                                                        formatPublishedDate(ebook.publishedDate),
                                                    ].filter(Boolean).join(" · ")}</small>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                </>
                                : <div className="lyrics-artist-drawer-state"><p>No ebooks found for this author.</p></div>}
                </section>
            </aside>
        </div>,
        document.body,
    );
}
