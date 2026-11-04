import { LocalizedText, useInterfaceText } from "../../../app/providers/interfaceLanguage";
import { useReveal } from "../../../components/common/Reveal";
import { Btn } from "../../../components/ui";
import type { EbookLibraryItem } from "../services/ebooksApiService";

export function BookCard({ item, index, onClick, onDownload }: { item: EbookLibraryItem; index: number; onClick: () => void; onDownload?: (book: EbookLibraryItem) => void }) {
    const t = useInterfaceText();
    const ref = useReveal<HTMLElement>((index % 4) * 85);
    const canDownload = item.downloadable && Boolean(onDownload);
    return <article ref={ref} className="book-card reveal">
        <button className=
            {`book-cover ${item.color}`} onClick={onClick}>{item.coverImageUrl && <img className="book-cover-image" src={item.coverImageUrl} alt={`${item.title} cover`} />

            }
            {/* <span className="cover-ornament">۞</span> */}
            <small><LocalizedText text={"ZIKR-E-ILAHI LIBRARY"} /></small><b>{item.title}</b></button>

        <span className="badge">{t(item.category)}</span><h3>{item.title}</h3><p>{item.author} <span aria-hidden="true">•</span> {item.date}</p><div className="book-actions"><Btn variant="outline" icon="book" onClick={onClick}><LocalizedText text={"Read Online"} /></Btn><Btn variant="outline" icon="download" disabled={!canDownload} onClick={() => canDownload && onDownload?.(item)}>{canDownload ? "Download PDF" : "Download unavailable"}</Btn></div></article>;
}