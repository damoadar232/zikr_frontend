import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
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

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

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
    const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
    const [pdfError, setPdfError] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);
    const [readerSize, setReaderSize] = useState({ width: 0, height: 0 });
    const [pageRendering, setPageRendering] = useState(true);
    const [zoom, setZoom] = useState(100);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fullscreenError, setFullscreenError] = useState("");
    const readerRef = useRef<HTMLElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const refreshedExpiredUrlRef = useRef(false);

    const handlePdfError = useCallback((error: Error) => {
        const status = getPdfResponseStatus(error);
        if ((status === 401 || status === 403) && !refreshedExpiredUrlRef.current) {
            refreshedExpiredUrlRef.current = true;
            void getPublicEbookReadLink(detailId).then((link) => {
                if (!link.url || link.url === readerUrl) {
                    throw new Error("The server did not provide a fresh signed PDF link.");
                }
                setPdfDocument(null);
                setTotalPages(0);
                setPageDimensions(null);
                setPdfError("");
                setPage(1);
                setPageRendering(true);
                setReaderUrl(link.url);
            }).catch((refreshError: unknown) => {
                setPdfError(getPdfErrorMessage(refreshError));
                setPdfDocument(null);
            });
            return;
        }
        setPdfError(getPdfErrorMessage(error));
        setPdfDocument(null);
    }, [detailId, readerUrl]);

    useEffect(() => {
        let active = true;
        refreshedExpiredUrlRef.current = false;
        setBook(null);
        setReaderUrl("");
        setPdfDocument(null);
        setTotalPages(0);
        setPageDimensions(null);
        setPdfError("");
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

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const updateSize = () => {
            const bounds = viewport.getBoundingClientRect();
            setReaderSize({
                width: Math.max(0, bounds.width - 32),
                height: Math.max(0, bounds.height - 32),
            });
        };
        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(viewport);
        return () => observer.disconnect();
    }, [readerUrl, loading, isFullscreen]);

    useEffect(() => {
        if (!pdfDocument || !totalPages) return;
        let active = true;
        setPageRendering(true);
        setPageDimensions(null);
        void pdfDocument.getPage(page).then((pdfPage) => {
            if (!active) return;
            const dimensions = pdfPage.getViewport({ scale: 1 });
            setPageDimensions({ width: dimensions.width, height: dimensions.height });
        }).catch((error: unknown) => {
            if (active) {
                handlePdfError(error instanceof Error ? error : new Error("The selected PDF page could not be loaded."));
            }
        });
        return () => { active = false; };
    }, [handlePdfError, pdfDocument, page, totalPages]);

    useEffect(() => {
        const updateFullscreen = () => setIsFullscreen(document.fullscreenElement === readerRef.current);
        document.addEventListener("fullscreenchange", updateFullscreen);
        return () => document.removeEventListener("fullscreenchange", updateFullscreen);
    }, []);

    const handlePdfLoad = useCallback((documentProxy: PDFDocumentProxy) => {
        setPdfDocument(documentProxy);
        setTotalPages(documentProxy.numPages);
        setPage(1);
        setPdfError("");
        setPageRendering(true);
    }, []);

    const toggleFullscreen = async () => {
        const reader = readerRef.current;
        if (!reader) return;
        try {
            if (document.fullscreenElement === reader) {
                await document.exitFullscreen();
            } else {
                await reader.requestFullscreen();
            }
        } catch (error) {
            setFullscreenError(error instanceof Error ? error.message : "Fullscreen mode could not be opened.");
        }
    };

    const retryPdf = () => {
        setPdfDocument(null);
        setPdfError("");
        setPage(1);
        setRetry((value) => value + 1);
    };

    const fitScale = pageDimensions && readerSize.width && readerSize.height
        ? Math.min(readerSize.width / pageDimensions.width, readerSize.height / pageDimensions.height)
        : 0;
    const pageWidth = pageDimensions && fitScale
        ? Math.floor(pageDimensions.width * fitScale * (zoom / 100))
        : 0;

    if (loading) {
        return <main className="book-reader"><div className="reader-bar"><button onClick={() => go("ebooks")}><LocalizedText text={"← Back to library"} /></button><b><LocalizedText text={"Opening ebook…"} /></b></div><div className="empty" role="status"><p><LocalizedText text={"Loading the secure PDF reader…"} /></p></div></main>;
    }
    if (!book || !readerUrl) {
        return <main className="book-reader"><div className="reader-bar"><button onClick={() => go("ebooks")}><LocalizedText text={"← Back to library"} /></button><b><LocalizedText text={notFound ? "Book unavailable" : "Reader unavailable"} /></b></div><div className="empty" role="alert"><Icon name="book" size={32} /><h3><LocalizedText text={notFound ? "Book not found" : "No reader content available."} /></h3><p>{loadError || "The requested title is not currently open for reading."}</p>{!notFound && <button className="btn btn-primary" onClick={() => setRetry((value) => value + 1)}><LocalizedText text={"Try again"} /></button>}</div></main>;
    }

    return <main className="book-reader" ref={readerRef}>
        <div className="reader-bar">
            <button onClick={() => go(`book-detail?id=${book.id}`)}><LocalizedText text={"← Return to book"} /></button>
            <b title={book.title}>{book.title}</b>
            <div className="reader-zoom-controls">
                <button aria-label={interfaceAttributeText("Zoom out")} onClick={() => { setZoom((current) => Math.max(70, current - 10)); setPageRendering(true); }} disabled={zoom <= 70}>−</button>
                <span>{zoom}%</span>
                <button aria-label={interfaceAttributeText("Zoom in")} onClick={() => { setZoom((current) => Math.min(140, current + 10)); setPageRendering(true); }} disabled={zoom >= 140}>+</button>
                <button aria-label={interfaceAttributeText(isFullscreen ? "Exit full screen" : "Full screen")} onClick={() => void toggleFullscreen()}>{isFullscreen ? "⛶" : "⛶"}</button>
            </div>
        </div>
        {fullscreenError && <p className="reader-action-error" role="alert">{fullscreenError}</p>}
        <div className="reader-viewport" ref={viewportRef}>
            {pdfError ? <div className="reader-message" role="alert"><Icon name="book" size={32} /><h3><LocalizedText text={"The PDF could not be displayed"} /></h3><p>{pdfError}</p><button className="btn btn-primary" onClick={retryPdf}><LocalizedText text={"Retry"} /></button></div> : (
                <Document
                    key={`${book.id}-${readerUrl}-${retry}`}
                    className="reader-pdf-document"
                    file={readerUrl}
                    loading={<div className="reader-message" role="status"><p><LocalizedText text={"Loading PDF…"} /></p></div>}
                    error={<div className="reader-message" role="alert"><p><LocalizedText text={"The PDF could not be loaded. The signed link may have expired or the network may be unavailable."} /></p><button className="btn btn-primary" onClick={retryPdf}><LocalizedText text={"Retry"} /></button></div>}
                    noData={<div className="reader-message" role="alert"><p><LocalizedText text={"No PDF file was provided."} /></p></div>}
                    onLoadSuccess={handlePdfLoad}
                    onLoadError={handlePdfError}
                    onSourceError={handlePdfError}
                    onLoadProgress={() => setPageRendering(true)}
                    suspense={false}
                >
                    {pdfDocument && pageDimensions && pageWidth > 0 && <div className="reader-page-frame">
                        {pageRendering && <div className="reader-page-loading" role="status"><LocalizedText text={"Rendering page…"} /></div>}
                        <Page
                            pageNumber={page}
                            width={pageWidth}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            loading={<div className="reader-page-loading" role="status"><LocalizedText text={"Rendering page…"} /></div>}
                            onRenderSuccess={() => {
                                refreshedExpiredUrlRef.current = false;
                                setPageRendering(false);
                            }}
                            onRenderError={(error) => {
                                setPageRendering(false);
                                handlePdfError(error);
                            }}
                            onLoadError={handlePdfError}
                        />
                    </div>}
                </Document>
            )}
        </div>
        <div className="page-controls">
            <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || pageRendering || !!pdfError}><LocalizedText text={"← Previous"} /></button>
            <span><LocalizedText text={"Page"} trailing=" " />{page} <LocalizedText text={"of"} trailing=" " />{totalPages || "—"}</span>
            <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={!totalPages || page >= totalPages || pageRendering || !!pdfError}><LocalizedText text={"Next →"} /></button>
        </div>
    </main>;
}

function getPdfErrorMessage(error: unknown) {
    const name = typeof error === "object" && error !== null && "name" in error
        ? String(error.name)
        : "";
    const message = error instanceof Error ? error.message.trim() : "";
    if (name === "InvalidPDFException") {
        return "This PDF appears to be corrupted or is not a supported PDF document.";
    }
    if (name === "MissingPDFException") {
        return "The PDF could not be found. Its signed link may have expired.";
    }
    if (/failed to fetch|networkerror|cors/i.test(message)) {
        return "The browser could not fetch the PDF from Cloudinary. Check the browser Network and Console panels for cross-origin, HTTP status, or range-request errors.";
    }
    return message
        ? `PDF.js could not load the document: ${message}`
        : "PDF.js could not load the document. Check the browser Network and Console panels for the request error.";
}

function getPdfResponseStatus(error: unknown): number | undefined {
    if (typeof error !== "object" || error === null) {
        return undefined;
    }
    if ("status" in error && typeof error.status === "number") {
        return error.status;
    }
    if ("httpStatus" in error && typeof error.httpStatus === "number") {
        return error.httpStatus;
    }
    return undefined;
}
