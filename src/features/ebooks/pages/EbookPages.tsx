import { useEffect, useMemo, useState } from "react";
import { LocalizedText, interfaceAttributeText, useInterfaceText } from "../../../app/providers/interfaceLanguage";
import { getRouteQueryParam } from "../../../app/utils/getRouteQueryParam";
import { Breadcrumbs, DirectoryHeader, SearchBox, Tabs } from "../../../components/common/PagePrimitives";
import { SectionHead } from "../../../components/common/SectionHead";
import { Btn, Icon } from "../../../components/ui";
import { BookCard } from "../components/BookCard";
import {
    getPublicEbook,
    getPublicEbookReadLink,
    listPublicEbooks,
    type EbookLibraryItem,
} from "../services/ebooksApiService";

function isNotFound(error: unknown) {
    return typeof error === "object" && error !== null && "status" in error && error.status === 404;
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export function Ebooks({ go, onDownloadBook }: { go: (route: string) => void; onDownloadBook: (book: EbookLibraryItem) => void }) {
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("All Books");
    const [books, setBooks] = useState<EbookLibraryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        void listPublicEbooks().then((result) => {
            if (active) setBooks(result);
        }).catch((loadError: unknown) => {
            if (active) setError(getErrorMessage(loadError, "Ebooks could not be loaded."));
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [retry]);

    const categories = useMemo(() => [
        "All Books",
        ...new Set(books.flatMap((book) => book.categories.map((category) => category.name))),
    ], [books]);
    const filteredBooks = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        return books.filter((book) => {
            const matchesSearch = !query || `${book.title} ${book.author}`.toLocaleLowerCase().includes(query);
            const matchesCategory = tab === "All Books" || book.categories.some((category) => category.name === tab);
            return matchesSearch && matchesCategory;
        });
    }, [books, search, tab]);

    return <main><DirectoryHeader go={go} title={interfaceAttributeText("Islamic E-Books Library")} text="A considered collection of devotional literature for reading, reflection, and learning." /><div className="container directory-controls"><div className="lyrics-search-row"><SearchBox value={search} setValue={setSearch} placeholder={interfaceAttributeText("Search books or authors")} /></div><Tabs items={categories} active={tab} setActive={setTab} /></div><section className="section container"><SectionHead eyebrow={`${filteredBooks.length} books • newest first`} title={interfaceAttributeText("Latest Uploads")} />{loading ? <div className="empty" role="status"><p><LocalizedText text={"Loading ebooks…"} /></p></div> : error ? <div className="empty" role="alert"><p>{error}</p><button className="btn btn-primary" onClick={() => setRetry((value) => value + 1)}><LocalizedText text={"Try again"} /></button></div> : filteredBooks.length ? <div className="book-grid">{filteredBooks.map((book, index) => <BookCard item={book} index={index} key={book.id} onClick={() => go(`book-detail?id=${book.id}`)} onDownload={onDownloadBook} />)}</div> : <div className="empty"><Icon name="book" size={32} /><h3><LocalizedText text={"No books match that search or category."} /></h3><p><LocalizedText text={"Try another keyword or reset the filter to browse the latest titles."} /></p><button className="btn btn-primary" onClick={() => { setSearch(""); setTab("All Books"); }}><LocalizedText text={"Clear filters"} /></button></div>}</section></main>;
}

export function BookDetail({ go, onDownloadBook }: { go: (route: string) => void; onDownloadBook: (book: EbookLibraryItem) => void }) {
    const t = useInterfaceText();
    const detailId = getRouteQueryParam("id") || "";
    const [book, setBook] = useState<EbookLibraryItem | null>(null);
    const [relatedBooks, setRelatedBooks] = useState<EbookLibraryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [notFound, setNotFound] = useState(false);
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        let active = true;
        setBook(null);
        setRelatedBooks([]);
        setLoading(true);
        setLoadError("");
        setNotFound(false);
        if (!detailId) {
            setLoading(false);
            setLoadError("A book reference is required.");
            return () => { active = false; };
        }
        void getPublicEbook(detailId).then((result) => {
            if (!active) return;
            setBook(result);
            void listPublicEbooks().then((books) => {
                if (!active) return;
                const matchingCategoryKeys = new Set(result.categoryKeys);
                setRelatedBooks(books.filter((candidate) =>
                    candidate.id !== detailId && candidate.categoryKeys.some((key) => matchingCategoryKeys.has(key)),
                ).slice(0, 3));
            }).catch(() => {
                if (active) setRelatedBooks([]);
            });
        }).catch((error: unknown) => {
            if (active) {
                setNotFound(isNotFound(error));
                setLoadError(getErrorMessage(error, "The selected ebook could not be loaded."));
            }
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [detailId, retry]);

    if (loading) {
        return <main className="reading-bg"><div className="container"><Breadcrumbs items={["E-Books", "Loading"]} go={go} /><p role="status"><LocalizedText text={"Loading ebook…"} /></p></div></main>;
    }
    if (!book) {
        return <main className="reading-bg"><div className="container"><Breadcrumbs items={["E-Books", notFound ? "Not found" : "Unavailable"]} go={go} /><div className="empty"><Icon name="book" size={32} /><h3><LocalizedText text={notFound ? "Book not found" : "Book unavailable"} /></h3><p>{loadError || "The selected publication is not available in the current library."}</p>{!notFound && <button className="btn btn-primary" onClick={() => setRetry((value) => value + 1)}><LocalizedText text={"Try again"} /></button>}<button className="btn btn-primary" onClick={() => go("ebooks")}><LocalizedText text={"Back to library"} /></button></div></div></main>;
    }

    const accessLabel = t("Read and download online");
    const categoryLabel = book.categories.map((category) => category.name).join(" • ");

    return <main className="reading-bg"><div className="container"><Breadcrumbs items={["E-Books", book.title]} go={go} /><div className="book-detail"><div className={`book-cover ${book.color} large-cover`}>{book.coverImageUrl && <img className="book-cover-image" src={book.coverImageUrl} alt={`${book.title} cover`} />}<span className="cover-ornament">۞</span><small><LocalizedText text={"ZIKR-E-ILAHI LIBRARY"} /></small><b>{book.title}</b><i>{book.author}</i></div><div><span className="badge">{t(categoryLabel)}</span><h1>{book.title}</h1><p className="lead">{book.author}</p><div className="detail-meta"><span><small><LocalizedText text={"LANGUAGE"} /></small>{book.language}</span><span><small><LocalizedText text={"FORMAT"} /></small>{book.format}</span><span><small><LocalizedText text={"ACCESS"} /></small>{accessLabel}</span></div><h3><LocalizedText text={"About this book"} /></h3><p>{book.description}</p><div className="detail-meta"><span><small><LocalizedText text={"CATEGORIES"} /></small>{categoryLabel}</span><span><small><LocalizedText text={"PUBLISHED"} /></small>{book.publishedDate || "—"}</span><span><small><LocalizedText text={"AUTHORS"} /></small>{book.author || "—"}</span></div><div className="button-row"><Btn onClick={() => go(`book-reader?id=${book.id}`)} icon="book"><LocalizedText text={"Read Online"} /></Btn><Btn variant="outline" icon="download" onClick={() => onDownloadBook(book)}>Download PDF</Btn></div></div></div><section className="related"><SectionHead title={interfaceAttributeText("Related Books")} /><div className="book-grid">{relatedBooks.map((item, index) => <BookCard item={item} index={index} key={item.id} onClick={() => go(`book-detail?id=${item.id}`)} onDownload={onDownloadBook} />)}</div></section></div></main>;
}

export function BookReader({ go }: { go: (route: string) => void }) {
    const detailId = getRouteQueryParam("id") || "";
    const [book, setBook] = useState<EbookLibraryItem | null>(null);
    const [readerUrl, setReaderUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [notFound, setNotFound] = useState(false);
    const [retry, setRetry] = useState(0);
    const [page, setPage] = useState(1);
    const [zoom, setZoom] = useState(100);

    useEffect(() => {
        let active = true;
        setBook(null);
        setReaderUrl("");
        setPage(1);
        setLoading(true);
        setLoadError("");
        setNotFound(false);
        if (!detailId) {
            setLoading(false);
            setLoadError("A book reference is required.");
            return () => { active = false; };
        }
        void getPublicEbook(detailId).then(async (result) => {
            const link = await getPublicEbookReadLink(detailId);
            if (active) {
                setBook(result);
                setReaderUrl(link.url);
            }
        }).catch((error: unknown) => {
            if (active) {
                setNotFound(isNotFound(error));
                setLoadError(getErrorMessage(error, "The ebook could not be opened."));
            }
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [detailId, retry]);

    if (loading) {
        return <main className="book-reader"><div className="reader-bar"><button onClick={() => go("ebooks")}><LocalizedText text={"← Back to library"} /></button><b><LocalizedText text={"Opening ebook…"} /></b></div><div className="empty" role="status"><p><LocalizedText text={"Loading the secure PDF reader…"} /></p></div></main>;
    }
    if (!book || !readerUrl) {
        return <main className="book-reader"><div className="reader-bar"><button onClick={() => go("ebooks")}><LocalizedText text={"← Back to library"} /></button><b><LocalizedText text={notFound ? "Book unavailable" : "Reader unavailable"} /></b></div><div className="empty" role="alert"><Icon name="book" size={32} /><h3><LocalizedText text={notFound ? "Book not found" : "No reader content available."} /></h3><p>{loadError || "The requested title is not currently open for reading."}</p>{!notFound && <button className="btn btn-primary" onClick={() => setRetry((value) => value + 1)}><LocalizedText text={"Try again"} /></button>}</div></main>;
    }

    return <main className="book-reader"><div className="reader-bar"><button onClick={() => go(`book-detail?id=${book.id}`)}><LocalizedText text={"← Return to book"} /></button><b>{book.title}</b><div><button onClick={() => setZoom(Math.max(70, zoom - 10))}>−</button><span>{zoom}%</span><button onClick={() => setZoom(Math.min(140, zoom + 10))}>+</button><button aria-label={interfaceAttributeText("Full screen")}>⛶</button></div></div><div className="document pdf-document"><iframe className="reader-pdf-frame" title={`${book.title} PDF`} src={`${readerUrl}#toolbar=0&navpanes=0&page=${page}&zoom=${zoom}`} /></div><div className="page-controls"><button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}><LocalizedText text={"← Previous"} /></button><span><LocalizedText text={"Page"} trailing=" " />{page} <LocalizedText text={"of"} trailing=" " />—</span><button onClick={() => setPage((current) => current + 1)}><LocalizedText text={"Next →"} /></button></div></main>;
}
