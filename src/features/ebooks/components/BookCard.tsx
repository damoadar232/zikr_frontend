import type { ebookLibrary as ebookLibraryData } from "../../../bookData";
import { LocalizedText, useInterfaceText } from "../../../app/providers/interfaceLanguage";
import { isAvailableDownloadUrl } from "../../../app/utils/downloadUrl";
import { useReveal } from "../../../components/common/Reveal";
import { Btn } from "../../../components/ui";

export function BookCard({ item, index, onClick, onDownload }: { item: (typeof ebookLibraryData)[number]; index: number; onClick: () => void; onDownload?: (book: (typeof ebookLibraryData)[number]) => void }) {
    const t = useInterfaceText();
    const ref = useReveal<HTMLElement>((index % 4) * 85);
    const canDownload = item.downloadable && isAvailableDownloadUrl(item.downloadUrl) && Boolean(onDownload);
    return <article ref={ref} className="book-card reveal"><button className={`book-cover ${item.color}`} onClick={onClick}><span className="cover-ornament">۞</span><small><LocalizedText text={"ZIKR-E-ILAHI LIBRARY"} /></small><b>{item.title}</b><i><LocalizedText text={"Volume"} trailing=" " />{index + 1}</i></button><span className="badge">{t(item.category)}</span><h3>{item.title}</h3><p>{item.author} <span aria-hidden="true">•</span> {item.date}</p><div className="book-actions"><Btn variant="outline" icon="book" onClick={onClick}><LocalizedText text={"Read Online"} /></Btn><Btn variant="outline" icon="download" disabled={!canDownload} onClick={() => canDownload && onDownload?.(item)}>{canDownload ? "Download PDF" : "Download unavailable"}</Btn></div></article>;
}