import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useContentCollection } from "../../../app/hooks/useContentCollection";
import { lyrics as initialLyrics } from "../../../lyricsData";
import { reciterProfiles, type ReciterProfile } from "../data/reciterProfiles";
import type { LyricRecord } from "../types";
import { getLyricArtistNames, getLyricReciterIds } from "../utils/lyricsPresentation";

type PositionedProfile = { profile: ReciterProfile; left: number; top: number };

function safeSocialLink(value: string) {
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) ? { href: url.href, label: url.hostname } : null;
    } catch {
        return null;
    }
}

export function ReciterDisclosure({ item, go }: { item: any; go?: (route: string) => void }) {
    const profiles = useContentCollection<ReciterProfile>("reciters", reciterProfiles);
    const lyrics = useContentCollection<LyricRecord>("lyrics", initialLyrics);
    const [selected, setSelected] = useState<ReciterProfile | null>(null);
    const [preview, setPreview] = useState<PositionedProfile | null>(null);
    const previewId = useId();
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggerRef = useRef<HTMLElement | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const publishedLyrics = useMemo(() => lyrics.filter((lyric) => lyric.status !== "draft" && lyric.status !== "archived")
        .sort((left, right) => Date.parse(right.createdAt || "") - Date.parse(left.createdAt || "")), [lyrics]);
    const related = useMemo(() => {
        if (!selected) return [];
        return publishedLyrics.filter((lyric) => getLyricReciterIds(lyric).includes(selected.id));
    }, [publishedLyrics, selected]);
    const ids: string[] = getLyricReciterIds(item);
    const explicitNames = getLyricArtistNames(item);
    const names: string[] = explicitNames.length
        ? explicitNames
        : ids.map((id) => profiles.find((profile) => profile.id === id)?.name).filter((name): name is string => !!name);
    const resolved = names.map((name) => profiles.find((profile) => profile.name.toLowerCase() === name.toLowerCase())).filter((profile): profile is ReciterProfile => !!profile);
    const uniqueProfiles = [...new Map(resolved.map((profile) => [profile.name.trim().toLowerCase(), profile])).values()];
    const unmatchedNames = names.filter((name) => !uniqueProfiles.some((profile) => profile.name.toLowerCase() === name.toLowerCase()));

    const cancelHide = () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = null;
    };
    const hidePreviewSoon = () => {
        cancelHide();
        hideTimer.current = setTimeout(() => setPreview(null), 180);
    };
    const showPreview = (profile: ReciterProfile, target: HTMLElement, immediate = false) => {
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches === false && !immediate) return;
        cancelHide();
        const rect = target.getBoundingClientRect();
        const width = 300;
        const height = 240;
        const below = rect.bottom + height + 8 <= window.innerHeight;
        setPreview({
            profile,
            left: Math.max(12, Math.min(window.innerWidth - width - 12, rect.left)),
            top: below ? rect.bottom + 8 : Math.max(12, rect.top - height - 8),
        });
    };

    useEffect(() => {
        if (!selected) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeButtonRef.current?.focus();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                setSelected(null);
                return;
            }
            if (event.key !== "Tab") return;
            const dialog = document.querySelector<HTMLElement>(".reciter-profile-dialog");
            const focusable = dialog?.querySelectorAll<HTMLElement>("button:not([disabled]),a[href]");
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
            triggerRef.current?.focus();
        };
    }, [selected]);

    useEffect(() => () => cancelHide(), []);

    if (!names.length) return null;

    const openProfile = (profile: ReciterProfile, trigger: HTMLElement) => {
        triggerRef.current = trigger;
        setPreview(null);
        setSelected(profile);
    };
    const profilePopup = preview && createPortal(
        <aside
            className="reciter-hover-preview"
            id={previewId}
            style={{ left: preview.left, top: preview.top }}
            role="tooltip"
            aria-label={`${preview.profile.name} profile preview`}
            onMouseEnter={cancelHide}
            onMouseLeave={hidePreviewSoon}
        >
            {preview.profile.profileImage && <img src={preview.profile.profileImage} alt="" />}
            <div><b>{preview.profile.name}</b><small>{preview.profile.roles.join(" · ")}</small><p>{preview.profile.biography}</p><small>{publishedLyrics.filter((lyric) => getLyricReciterIds(lyric).includes(preview.profile.id)).length} associated lyrics</small></div>
        </aside>,
        document.body,
    );
    const dialog = selected && createPortal(
        <div className="reciter-profile-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }} onClick={(event) => event.stopPropagation()}>
            <section className="reciter-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="reciter-profile-title">
                <button ref={closeButtonRef} type="button" className="reciter-profile-close" aria-label="Close reciter profile" onClick={() => setSelected(null)}>×</button>
                {selected.profileImage && <img className="reciter-profile-image" src={selected.profileImage} alt="" />}
                <span className="eyebrow">RECITED BY</span>
                <h2 id="reciter-profile-title">{selected.name}</h2>
                <p className="reciter-profile-roles">{selected.roles.join(" · ")}</p>
                {selected.biography && <p>{selected.biography}</p>}
                {(selected.languages.length > 0 || selected.location) && <p>{selected.languages.join(", ")}{selected.location ? ` · ${selected.location}` : ""}</p>}
                {selected.socialLinks?.length ? <p className="reciter-profile-socials">{selected.socialLinks.map(safeSocialLink).filter((link): link is { href: string; label: string } => !!link).map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer noopener">{link.label}</a>)}</p> : null}
                <p className="reciter-profile-count">{related.length} associated {related.length === 1 ? "lyric" : "lyrics"}</p>
                <h3>Related lyrics</h3>
                {related.length ? <ul>{related.map((lyric) => <li key={lyric.id}><button type="button" onClick={() => { setSelected(null); go?.(`lyric-detail?id=${lyric.id}`); }}>{lyric.title || lyric.id}</button></li>)}</ul> : <p>No published lyrics are currently associated with this reciter.</p>}
                {go && <button type="button" className="btn btn-primary" onClick={() => { setSelected(null); go(`lyrics-artists?artist=${encodeURIComponent(selected.id)}`); }}>View all lyrics by {selected.name}</button>}
            </section>
        </div>,
        document.body,
    );

    return <span className="reciter-disclosure">
        {uniqueProfiles.map((profile, index) => <span className="reciter-name-wrap" key={profile.id}>
            {index > 0 && <span aria-hidden="true">, </span>}
            <button
                type="button"
                className="reciter-name"
                aria-describedby={preview?.profile.id === profile.id ? previewId : undefined}
                onClick={(event) => { event.stopPropagation(); openProfile(profile, event.currentTarget); }}
                onMouseEnter={(event) => showPreview(profile, event.currentTarget)}
                onMouseLeave={hidePreviewSoon}
                onFocus={(event) => showPreview(profile, event.currentTarget, true)}
                onBlur={hidePreviewSoon}
            >{profile.name}</button>
        </span>)}
        {unmatchedNames.map((name, index) => <span key={`${name}-${index}`}>{uniqueProfiles.length > 0 || index > 0 ? ", " : ""}{name}</span>)}
        {profilePopup}
        {dialog}
    </span>;
}
