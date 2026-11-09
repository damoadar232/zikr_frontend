import type { AudioRecord } from "../../../audioData.js";
import type { AudioArtistCredit } from "../../../audioData.js";
import { isAvailableDownloadUrl } from "../../../app/utils/downloadUrl";
import { useInterfaceText } from "../../../app/providers/interfaceLanguage";
import { useReveal } from "../../../components/common/Reveal";
import { Btn, Icon } from "../../../components/ui";
import { AudioArtistLinks } from "./AudioArtistLinks";

export function getAudioCategoryLabel(item: AudioRecord) {
    return Array.isArray(item.categories) && item.categories.length ? item.categories.join(" • ") : item.category || "Devotional";
}

export function AudioCard({ item, index, onClick, onPlay, onPause, onDownload, onArtistSelect, activeAudioId = "", isAudioPlaying = false, showPublishedDate = true }: { item: AudioRecord; index: number; onClick: () => void; onPlay: (track: AudioRecord) => void; onPause: () => void; onDownload: (track: AudioRecord) => void; onArtistSelect?: (credit: AudioArtistCredit) => void; activeAudioId?: string; isAudioPlaying?: boolean; showPublishedDate?: boolean }) {
    const t = useInterfaceText();
    const ref = useReveal<HTMLElement>((index % 4) * 85);
    const isPlaying = activeAudioId === item.id && isAudioPlaying;
    const canDownload = item.downloadable && !item.isDemo && isAvailableDownloadUrl(item.downloadUrl);

    const togglePlayback = () => isPlaying ? onPause() : onPlay(item);

    return <article ref={ref} className="audio-card reveal"><div className={`audio-art ${item.color}`}><img src={item.image} alt="" loading="lazy" /><span className="media-overlay" /><div className="arch-art"><span>ذِكْر</span></div><button className="play-btn" onClick={(event) => { event.stopPropagation(); togglePlayback(); }} aria-label={`${t(isPlaying ? "Pause" : "Play")} ${item.title}`}>{isPlaying ? <span className="pause">Ⅱ</span> : <Icon name="play" />}</button></div><div className="audio-info"><span className="badge">{getAudioCategoryLabel(item).split(" • ").map(t).join(" • ")}</span>{item.featured ? <span className="featured-chip">{t("Featured")}</span> : null}<h3><button className="card-title-link" onClick={onClick}>{item.title}</button></h3><p><AudioArtistLinks credits={item.singerCredits} fallbackName={item.artist} onArtistSelect={onArtistSelect} />{item.writers?.length ? <> · Written by {item.writers.join(", ")}</> : null}{item.language ? <> · {item.language}</> : null}</p><div className="media-meta">{showPublishedDate && <span>{new Date(item.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>}<span>{item.duration}</span></div><div className="audio-card-actions"><button className="audio-inline-action" onClick={(event) => { event.stopPropagation(); togglePlayback(); }}>{t(isPlaying ? "Playing" : "Play")}</button>{item.downloadable && <button className="audio-inline-action secondary" disabled={!canDownload} onClick={(event) => { event.stopPropagation(); onDownload(item); }}>{t(canDownload ? "Download" : "Download unavailable")}</button>}</div></div></article>;
}