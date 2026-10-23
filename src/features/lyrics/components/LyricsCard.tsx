import type { lyrics as lyricsData } from "../../../lyricsData";
import { useInterfaceText } from "../../../app/providers/interfaceLanguage";
import { Icon } from "../../../components/ui";
import { useReveal } from "../../../components/common/Reveal";
import { formatLyricDate, getLyricArtistNames, getLyricCategoryNames, getLyricWriterName, getPrimaryLanguage } from "../utils/lyricsPresentation";
import { ReciterDisclosure } from "./ReciterDisclosure";
import { LyricTitle } from "./LyricTitle";

export function LyricsCard({ item, index, onClick, go, displayLanguage }: { item: (typeof lyricsData)[number]; index: number; onClick: () => void; go?: (route: string) => void; displayLanguage?: string }) {
    const t = useInterfaceText();
    const ref = useReveal<HTMLElement>((index % 4) * 85);
    const writerName = getLyricWriterName(item);
    const categoryLabel = getLyricCategoryNames(item).map(t).join(" • ") || t("Devotional");
    const languageLabel = displayLanguage || getPrimaryLanguage(item);
    const itemDate = formatLyricDate(item.createdAt);

    return <article ref={ref} className="lyric-card editorial-lyric reveal" onClick={onClick} tabIndex={0} onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onClick(); } }}><img src={item.image} alt="" loading="lazy" /><span className="lyric-overlay" /><div className="lyric-content"><div className="lyric-top"><span className="editorial-label">{t(categoryLabel)} • {languageLabel}</span><span>{itemDate}</span></div><div className="lyric-bottom"><h3><LyricTitle title={item.title} /></h3>{getLyricArtistNames(item).length > 0 && <p>{t("Recited by")} <ReciterDisclosure item={item} go={go} /></p>}<small>{t("Written by")} {writerName}</small><button className="editorial-action" aria-label={`${t("Read Lyrics")}: ${item.title}`}>{t("Read Lyrics")} <Icon name="arrow" /></button></div></div></article>;
}