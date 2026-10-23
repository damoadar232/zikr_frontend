import { useState } from "react";
import { LocalizedText, interfaceAttributeText, useInterfaceText } from "../../../app/providers/interfaceLanguage";
import { isAvailableDownloadUrl } from "../../../app/utils/downloadUrl";
import { getRouteQueryParam } from "../../../app/utils/getRouteQueryParam";
import { Breadcrumbs, DirectoryHeader, SearchBox, Tabs } from "../../../components/common/PagePrimitives";
import { SectionHead } from "../../../components/common/SectionHead";
import { Btn, Icon } from "../../../components/ui";
import { BookCard } from "../components/BookCard";
import { ebookCategories, ebookLibrary, filterEbooks, getEbookById } from "../../../bookData";

export function Ebooks({ go, onDownloadBook }: { go: (route: string) => void; onDownloadBook: (book: (typeof ebookLibrary)[number]) => void }) {
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("All Books");
    const categories = ebookCategories.map((entry) => entry.name);
    const filteredBooks = filterEbooks(ebookLibrary, { search, category: tab });

    return <main><DirectoryHeader go={go} title={interfaceAttributeText("Islamic E-Books Library")} text="A considered collection of devotional literature for reading, reflection, and learning." /><div className="container directory-controls"><div className="lyrics-search-row"><SearchBox value={search} setValue={setSearch} placeholder={interfaceAttributeText("Search books or authors")} /></div><Tabs items={categories} active={tab} setActive={setTab} /></div><section className="section container"><SectionHead eyebrow={`${filteredBooks.length} books • newest first`} title={interfaceAttributeText("Latest Uploads")} />{filteredBooks.length ? <div className="book-grid">{filteredBooks.map((book, index) => <BookCard item={book} index={index} key={book.id} onClick={() => go(`book-detail?id=${book.id}`)} onDownload={onDownloadBook} />)}</div> : <div className="empty"><Icon name="book" size={32} /><h3><LocalizedText text={"No books match that search or category."} /></h3><p><LocalizedText text={"Try another keyword or reset the filter to browse the latest titles."} /></p><button className="btn btn-primary" onClick={() => { setSearch(""); setTab("All Books"); }}><LocalizedText text={"Clear filters"} /></button></div>}</section></main>;
}

export function BookDetail({ go, isLoggedIn, onDownloadBook }: { go: (route: string) => void; isLoggedIn: boolean; onDownloadBook: (book: (typeof ebookLibrary)[number]) => void }) {
    const t = useInterfaceText();
    const detailId = getRouteQueryParam("id") || ebookLibrary[0]?.id || "";
    const book = getEbookById(detailId) || ebookLibrary[0];

    if (!book) {
        return <main className="reading-bg"><div className="container"><Breadcrumbs items={["E-Books", "Not found"]} go={go} /><div className="empty"><Icon name="book" size={32} /><h3><LocalizedText text={"Book not found"} /></h3><p><LocalizedText text={"The selected publication is not available in the current library."} /></p><button className="btn btn-primary" onClick={() => go("ebooks")}><LocalizedText text={"Back to library"} /></button></div></div></main>;
    }

    const relatedBooks = (book.relatedBooks || []).map((id) => getEbookById(id)).filter((item): item is NonNullable<typeof item> => !!item);
    const canDownload = book.downloadable && isAvailableDownloadUrl(book.downloadUrl);
    const accessLabel = t(canDownload ? (isLoggedIn ? book.access : "Login required to download") : "Download unavailable");

    return <main className="reading-bg"><div className="container"><Breadcrumbs items={["E-Books", book.title]} go={go} /><div className="book-detail"><div className={`book-cover ${book.color} large-cover`}><span className="cover-ornament">۞</span><small><LocalizedText text={"ZIKR-E-ILAHI LIBRARY"} /></small><b>{book.title}</b><i>{book.author}</i></div><div><span className="badge">{t(book.category)}</span><h1>{book.title}</h1><p className="lead">{book.author}</p><div className="detail-meta"><span><small><LocalizedText text={"LANGUAGE"} /></small>{book.language}</span><span><small><LocalizedText text={"FORMAT"} /></small>{book.format}</span><span><small><LocalizedText text={"ACCESS"} /></small>{accessLabel}</span></div><h3><LocalizedText text={"About this book"} /></h3><p>{book.description}</p><div className="button-row"><Btn onClick={() => go(`book-reader?id=${book.id}`)} icon="book"><LocalizedText text={"Read Online"} /></Btn>{canDownload ? <Btn variant="outline" icon="download" onClick={() => onDownloadBook(book)}>{isLoggedIn ? "Download PDF" : "Login to download"}</Btn> : <Btn variant="outline" icon="download" disabled><LocalizedText text={"Download unavailable"} /></Btn>}</div></div></div><section className="related"><SectionHead title={interfaceAttributeText("Related Books")} /><div className="book-grid">{relatedBooks.map((item, index) => <BookCard item={item} index={index} key={item.id} onClick={() => go(`book-detail?id=${item.id}`)} onDownload={onDownloadBook} />)}</div></section></div></main>;
}

export function BookReader({ go }: { go: (route: string) => void }) {
    const detailId = getRouteQueryParam("id") || ebookLibrary[0]?.id || "";
    const book = getEbookById(detailId) || ebookLibrary[0];
    const [page, setPage] = useState(1);
    const [zoom, setZoom] = useState(100);

    if (!book) {
        return <main className="book-reader"><div className="reader-bar"><button onClick={() => go("ebooks")}><LocalizedText text={"← Back to library"} /></button><b><LocalizedText text={"Book unavailable"} /></b></div><div className="empty"><Icon name="book" size={32} /><h3><LocalizedText text={"No reader content available."} /></h3><p><LocalizedText text={"The requested title is not currently open for reading."} /></p></div></main>;
    }

    const totalPages = book.pageCount || 48;

    return <main className="book-reader"><div className="reader-bar"><button onClick={() => go(`book-detail?id=${book.id}`)}><LocalizedText text={"← Return to book"} /></button><b>{book.title}</b><div><button onClick={() => setZoom(Math.max(70, zoom - 10))}>−</button><span>{zoom}%</span><button onClick={() => setZoom(Math.min(140, zoom + 10))}>+</button><button aria-label={interfaceAttributeText("Full screen")}>⛶</button></div></div><div className="document" style={{ transform: `scale(${zoom / 100})` }}><small><LocalizedText text={"ZIKR-E-ILAHI LIBRARY"} /></small><h1>{book.title}</h1><div className="doc-ornament">۞</div><p>{book.previewText}</p><div className="reader-page-copy"><p>{book.description}</p><p><LocalizedText text={"Author:"} trailing=" " />{book.author}</p><p><LocalizedText text={"Category:"} trailing=" " />{book.category}</p></div><span><LocalizedText text={"Sample page"} trailing=" " />{page}</span></div><div className="page-controls"><button onClick={() => setPage(Math.max(1, page - 1))}><LocalizedText text={"← Previous"} /></button><span><LocalizedText text={"Page"} trailing=" " />{page} <LocalizedText text={"of"} trailing=" " />{totalPages}</span><button onClick={() => setPage(Math.min(totalPages, page + 1))}><LocalizedText text={"Next →"} /></button></div></main>;
}
