import type { audioLibrary as audioLibraryData } from "../../../audioData";
import { isAvailableDownloadUrl } from "../../../app/utils/downloadUrl";
import { useInterfaceText } from "../../../app/providers/interfaceLanguage";
import { useReveal } from "../../../components/common/Reveal";
import { Btn, Icon } from "../../../components/ui";

export function getAudioCategoryLabel(item: (typeof audioLibraryData)[number]) {
    return Array.isArray(item.categories) && item.categories.length ? item.categories.join(" • ") : item.category || "Devotional";
}

export function AudioCard({ item, index, onClick, onPlay, onDownload, activeAudioId = "" }: { item: (typeof audioLibraryData)[number]; index: number; onClick: () => void; onPlay: (track: (typeof audioLibraryData)[number]) => void; onDownload: (track: (typeof audioLibraryData)[number]) => void; activeAudioId?: string }) {
    const t = useInterfaceText();
    const ref = useReveal<HTMLElement>((index % 4) * 85);
    const isActive = activeAudioId === item.id;
    const canDownload = item.downloadable && !item.isDemo && isAvailableDownloadUrl(item.downloadUrl);

    return <article ref={ref} className="audio-card reveal"><div className={`audio-art ${item.color}`}><img src={item.image} alt="" loading="lazy" /><span className="media-overlay" /><div className="arch-art"><span>ذِكْر</span></div><button className="play-btn" onClick={(event) => { event.stopPropagation(); onPlay(item); }} aria-label={`${t(isActive ? "Pause" : "Play")} ${item.title}`}>{isActive ? <span className="pause">Ⅱ</span> : <Icon name="play" />}</button></div><div className="audio-info"><span className="badge">{getAudioCategoryLabel(item).split(" • ").map(t).join(" • ")}</span>{item.featured ? <span className="featured-chip">{t("Featured")}</span> : null}<h3><button className="card-title-link" onClick={onClick}>{item.title}</button></h3><p>{item.artist}</p><div className="media-meta"><span>{new Date(item.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span><span>{item.duration}</span></div><div className="audio-card-actions"><button className="audio-inline-action" onClick={(event) => { event.stopPropagation(); onPlay(item); }}>{t(isActive ? "Playing" : "Play")}</button>{item.downloadable && <button className="audio-inline-action secondary" disabled={!canDownload} onClick={(event) => { event.stopPropagation(); onDownload(item); }}>{t(canDownload ? "Download" : "Download unavailable")}</button>}</div></div></article>;
}