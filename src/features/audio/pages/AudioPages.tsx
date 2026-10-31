import { useEffect, useMemo, useState } from "react";
import type { AudioRecord } from "../../../audioData.js";
import { LocalizedText, interfaceAttributeText } from "../../../app/providers/interfaceLanguage";
import { getRouteQueryParam } from "../../../app/utils/getRouteQueryParam";
import { getUserFacingError } from "../../../app/notifications/toastStore.js";
import { Breadcrumbs, DirectoryHeader, SearchBox, Tabs } from "../../../components/common/PagePrimitives";
import { SectionHead } from "../../../components/common/SectionHead";
import { Btn, Icon } from "../../../components/ui";
import { AudioCard, getAudioCategoryLabel } from "../components/AudioCard";
import { SpotifyTrackGrid } from "../components/SpotifyTrackGrid";
import {
    getPublicAudio,
    listPublicAudioCategories,
    listPublicAudios,
} from "../services/audioApiService.js";
import type { AudioCategoryOption } from "../services/audioApiService.js";

type AudioActions = {
    go: (route: string) => void;
    onPlayAudio: (track: AudioRecord) => void;
    onPauseAudio: () => void;
    onDownloadAudio: (track: AudioRecord) => void;
    onTracksLoaded: (tracks: AudioRecord[]) => void;
    activeAudioId: string | null;
    isAudioPlaying: boolean;
};

function formatPublishedDate(value: string) {
    const date = new Date(`${value}T00:00:00`);
    return value && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "Date not available";
}

export function AudioPage({ go, onPlayAudio, onPauseAudio, onDownloadAudio, onTracksLoaded, activeAudioId, isAudioPlaying }: AudioActions) {
    const [search, setSearch] = useState("");
    const [categoryKey, setCategoryKey] = useState("");
    const [categories, setCategories] = useState<AudioCategoryOption[]>([]);
    const [categoryError, setCategoryError] = useState("");
    const [categoryRetry, setCategoryRetry] = useState(0);
    const [tracks, setTracks] = useState<AudioRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        let active = true;
        setCategoryError("");
        void listPublicAudioCategories().then((result) => {
            if (active) setCategories(result);
        }).catch((requestError: unknown) => {
            if (active) setCategoryError(getUserFacingError(requestError, "Audio categories could not be loaded."));
        });
        return () => { active = false; };
    }, [categoryRetry]);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        void listPublicAudios({
            query: search,
            categoryKey: categoryKey || undefined,
        }).then((result) => {
            if (active) {
                setTracks(result);
                onTracksLoaded(result);
            }
        }).catch((requestError: unknown) => {
            if (active) setError(getUserFacingError(requestError, "Audio could not be loaded."));
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [categoryKey, onTracksLoaded, retry, search]);

    const tabItems = useMemo(() => ["All Audio", ...categories.map((category) => category.name)], [categories]);
    const activeTab = categoryKey ? categories.find((category) => category.categoryKey === categoryKey)?.name || "All Audio" : "All Audio";

    return <main>
        <DirectoryHeader go={go} title={interfaceAttributeText("Devotional Audio")} text="Listen to soulful recitations, Naats, Hamd, and timeless devotional works." />
        <div className="container directory-controls">
            <div className="lyrics-search-row"><SearchBox value={search} setValue={setSearch} placeholder={interfaceAttributeText("Search audio or artist")} /></div>
            <Tabs items={tabItems} active={activeTab} setActive={(label) => {
                setCategoryKey(categories.find((category) => category.name === label)?.categoryKey || "");
            }} />
        </div>
        {categoryError && <div className="container"><div className="empty" role="alert"><p>{categoryError}</p><button className="btn btn-primary" onClick={() => setCategoryRetry((current) => current + 1)}><LocalizedText text={"Try again"} /></button></div></div>}
        <section className="section container">
            <SectionHead eyebrow="Official Spotify players" title="Spotify tracks" body="Playback is provided by Spotify. Open a track there if the embedded player is unavailable." />
            <SpotifyTrackGrid />
        </section>
        <section className="section container">
            <SectionHead eyebrow={`${tracks.length} tracks • newest first`} title={interfaceAttributeText("Latest Audio")} />
            {loading ? <div className="empty" role="status"><p><LocalizedText text={"Loading audio…"} /></p></div>
                : error ? <div className="empty" role="alert"><Icon name="headphones" size={32} /><h3><LocalizedText text={"Audio could not be loaded"} /></h3><p>{error}</p><button className="btn btn-primary" onClick={() => setRetry((current) => current + 1)}><LocalizedText text={"Try again"} /></button></div>
                    : tracks.length ? <div className="audio-grid light">{tracks.map((track, index) => <AudioCard key={track.id} item={track} index={index} onClick={() => { onPlayAudio(track); go(`audio-detail?id=${encodeURIComponent(track.id)}`); }} onPlay={onPlayAudio} onPause={onPauseAudio} onDownload={onDownloadAudio} activeAudioId={activeAudioId || ""} isAudioPlaying={isAudioPlaying} />)}</div>
                        : <div className="empty"><Icon name="search" size={32} /><h3><LocalizedText text={"No audio matches that search."} /></h3><p><LocalizedText text={"Try another title, reciter name, or category filter."} /></p><button className="btn btn-primary" onClick={() => { setSearch(""); setCategoryKey(""); }}><LocalizedText text={"Clear filters"} /></button></div>}
        </section>
    </main>;
}

export function AudioDetail({ go, onPlayAudio, onPauseAudio, onDownloadAudio, onTracksLoaded, activeAudioId, isAudioPlaying }: AudioActions) {
    const detailId = getRouteQueryParam("id") || "";
    const [track, setTrack] = useState<AudioRecord | null>(null);
    const [relatedTracks, setRelatedTracks] = useState<AudioRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notFound, setNotFound] = useState(false);
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        let active = true;
        setTrack(null);
        setLoading(true);
        setError("");
        setNotFound(false);
        if (!detailId) {
            setError("An audio reference is required.");
            setLoading(false);
            return () => { active = false; };
        }

        void getPublicAudio(detailId).then((result) => {
            if (!active) return;
            setTrack(result);
            onTracksLoaded([result]);
        }).catch((requestError: unknown) => {
            if (!active) return;
            const status = typeof requestError === "object" && requestError !== null
                && "status" in requestError && typeof requestError.status === "number"
                ? requestError.status
                : 0;
            setNotFound(status === 404);
            setError(getUserFacingError(requestError, "The selected audio could not be loaded."));
        }).finally(() => {
            if (active) setLoading(false);
        });

        void listPublicAudios().then((result) => {
            if (!active) return;
            setRelatedTracks(result);
            onTracksLoaded(result);
        }).catch(() => {
            if (active) setRelatedTracks([]);
        });

        return () => { active = false; };
    }, [detailId, onTracksLoaded, retry]);

    if (loading) {
        return <main className="reading-bg"><div className="container"><div className="empty" role="status"><p><LocalizedText text={"Loading audio…"} /></p></div></div></main>;
    }
    if (error || !track) {
        return <main className="reading-bg"><div className="container"><Breadcrumbs items={["Audio", notFound ? "Not found" : "Unavailable"]} go={go} /><div className="empty" role="alert"><Icon name="headphones" size={32} /><h3><LocalizedText text={notFound ? "Audio not found" : "Audio could not be loaded"} /></h3><p>{error || "The selected devotional track is not available in the public library."}</p><button className="btn btn-primary" onClick={() => setRetry((current) => current + 1)}><LocalizedText text={"Try again"} /></button><button className="btn btn-outline" onClick={() => go("audio")}><LocalizedText text={"Back to audio"} /></button></div></div></main>;
    }

    const moreAudio = relatedTracks.filter((entry) => entry.id !== track.id).slice(0, 2);
    const trackIsPlaying = activeAudioId === track.id && isAudioPlaying;
    const toggleTrackPlayback = () => trackIsPlaying ? onPauseAudio() : onPlayAudio(track);
    const playRelatedTrack = (item: AudioRecord) => {
        onPlayAudio(item);
        go(`audio-detail?id=${encodeURIComponent(item.id)}`);
    };

    const artistMetadata = [
        track.artist,
        track.writers?.length ? `Written by ${track.writers.join(", ")}` : "",
        track.language || "",
    ].filter(Boolean).join(" · ");

    return <main className="reading-bg"><div className="container"><Breadcrumbs items={["Audio", track.title]} go={go} /><div className="audio-detail"><div className={`audio-art ${track.color} large`}><img src={track.image} alt="" loading="lazy" /><span className="media-overlay" /><div className="arch-art"><span>ذِكْر</span></div><button className="play-btn" onClick={toggleTrackPlayback} aria-label={trackIsPlaying ? "Pause audio" : `Play ${track.title}`}>{trackIsPlaying ? <span className="pause">Ⅱ</span> : <Icon name="play" />}</button></div><div><span className="badge">{getAudioCategoryLabel(track)}</span><h1>{track.title}</h1><p className="lead"><LocalizedText text={"Recited by"} trailing=" " />{artistMetadata}</p><div className="detail-meta"><span><small><LocalizedText text={"PUBLISHED"} /></small>{formatPublishedDate(track.date)}</span><span><small><LocalizedText text={"DURATION"} /></small>{track.duration}</span></div><div className="player"><button className="play-main" onClick={toggleTrackPlayback} aria-label={trackIsPlaying ? "Pause audio" : `Play ${track.title}`}>{trackIsPlaying ? <span>Ⅱ</span> : <Icon name="play" size={24} />}</button><span>0:00</span><input type="range" min="0" max="100" defaultValue="0" aria-label={interfaceAttributeText("Audio progress")} /><span>{track.duration}</span><Icon name="volume" /></div><p className="prototype-note">Audio stream is available for public preview.</p><p className="audio-description">{track.description}</p><div className="button-row"><Btn variant="outline" icon="share" onClick={() => navigator.share?.({ title: track.title, url: `${window.location.origin}${window.location.pathname}#audio-detail?id=${track.id}` })}><LocalizedText text={"Share"} /></Btn><Btn variant="outline" icon="download" disabled><LocalizedText text={"Download locked"} /></Btn></div></div></div><section className="related"><SectionHead title={interfaceAttributeText("Related Audio")} action="View All Audio" onAction={() => go("audio")} /><div className="audio-grid light">{moreAudio.map((item, index) => <AudioCard key={item.id} item={item} index={index} onClick={() => playRelatedTrack(item)} onPlay={onPlayAudio} onPause={onPauseAudio} onDownload={onDownloadAudio} activeAudioId={activeAudioId || ""} isAudioPlaying={isAudioPlaying} />)}</div></section></div></main>;
}
