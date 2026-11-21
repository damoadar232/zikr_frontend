import { useEffect, useState } from "react";
import { lyricCategories, normalizeLyricLanguageCode } from "../../../lyricsData";
import { interfaceAttributeText, LocalizedText, useInterfaceText } from "../../../app/providers/interfaceLanguage";
import { getRouteQueryParam } from "../../../app/utils/getRouteQueryParam";
import { DirectoryHeader, SearchBox } from "../../../components/common/PagePrimitives";
import { SectionHead } from "../../../components/common/SectionHead";
import { Icon } from "../../../components/ui";
import { LyricsCard } from "../components/LyricsCard";
import { ArtistProfileAvatar } from "../components/ArtistProfileAvatar";
import { LyricsArtistProfileDrawer, type LyricsArtistSelection } from "../components/LyricsArtistProfileDrawer";
import { artistsApi } from "../../artists/services/artistsApiService.js";
import type { ApiPublicArtistPage, ApiPublicArtistProfile } from "../../artists/services/artistsApiService.js";
import { lyricsApi } from "../services/lyricsApiService.js";
import type { ApiArtistProfile, ApiLyricLanguage, ApiPage, ApiPublicLyric, ApiPublicSubject } from "../services/lyricsApiService.js";
import { booksApi } from "../../books/services/booksApiService.js";
import type { ApiBook } from "../../books/services/booksApiService.js";
import { buildAvailableBrowseEntries } from "../utils/lyricsBrowseUtils.js";
import { getLyricArtistProfiles } from "../utils/lyricsPresentation";

export const lyricsRoutePaths = ["lyrics", "lyrics-category", "lyrics-artists", "lyrics-poets", "lyrics-books", "lyrics-languages", "lyrics-subjects"];

const lyricsBrowseItems = [
    ["All Lyrics", "lyrics"],
    ["Categories", "lyrics-category"],
    ["Naat-Khwaan / Reciters", "lyrics-artists"],
    ["Poets", "lyrics-poets"],
    ["Books", "lyrics-books"],
    ["Language", "lyrics-languages"],
    ["Subject / Occasion", "lyrics-subjects"],
] as const;

const mainListingLanguages: Array<[string, string]> = [
    ["ur", "Urdu"],
    ["hi", "Hindi"],
    ["roman", "Roman English"],
];

type LyricsBrowseEntry = { id: string; name: string; lyrics: any[]; profileImageUrl?: string | null };
type LyricsBrowseConfig = { title: string; heading: string; parameter: string; noun: string; entries: LyricsBrowseEntry[] };

function getVisiblePageNumbers(currentPage: number, totalPages: number) {
    const visibleCount = Math.min(5, totalPages);
    const firstPage = Math.max(0, Math.min(currentPage - 2, totalPages - visibleCount));
    return Array.from({ length: visibleCount }, (_, index) => firstPage + index);
}

function matchesLyricsLetter(value: string, letter: string) {
    if (letter === "All") return true;
    const firstMeaningful = (value || "").match(/[A-Za-z0-9]/)?.[0] || "";
    if (!firstMeaningful) return false;
    return letter === "0-9" ? /\d/.test(firstMeaningful) : firstMeaningful.toUpperCase() === letter;
}

function isApiLyricLanguage(value: string): value is ApiLyricLanguage {
    return value === "ur" || value === "hi" || value === "roman";
}

function LyricsBrowseControl({ go, active }: { go: (route: string) => void; active: string }) {
    const t = useInterfaceText();
    return <nav className="category-row tabs lyrics-category-tabs" role="tablist" aria-label={interfaceAttributeText("Lyrics browse destinations")}>
        {lyricsBrowseItems.map(([label, route]) => <button key={route} type="button" role="tab" aria-selected={active === route} className={active === route ? "active" : ""} onClick={() => go(route)}>{t(label)}</button>)}
    </nav>;
}

function renderLyricCards(items: any[], go: (route: string) => void, displayLanguage?: string, mainListing = false) {
    return <div className={`lyrics-list${mainListing ? " lyrics-list--main" : ""}`}>{items.map((item, index) => <LyricsCard item={item} index={index} key={item.id} go={go} displayLanguage={displayLanguage} presentation={mainListing ? "listing" : "default"} onClick={() => go(`lyric-detail?id=${encodeURIComponent(item.id)}`)} />)}</div>;
}

export function LyricsPage({ go, route }: { go: (route: string) => void; route: string }) {
    const t = useInterfaceText();
    const [published, setPublished] = useState<ApiPublicLyric[]>([]);
    const [books, setBooks] = useState<ApiBook[]>([]);
    const [mainPageState, setMainPageState] = useState<{ requestKey: string; data: ApiPage<ApiPublicLyric> } | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [retry, setRetry] = useState(0);
    const [search, setSearch] = useState("");
    const [letter, setLetter] = useState("All");
    const [artistSelection, setArtistSelection] = useState<LyricsArtistSelection | null>(null);
    const [pageSelection, setPageSelection] = useState<{ filterKey: string; page: number }>({ filterKey: "", page: 0 });
    const [reciterPage, setReciterPage] = useState<ApiPublicArtistPage<ApiPublicArtistProfile> | null>(null);
    const [reciterPageLoading, setReciterPageLoading] = useState(false);
    const [reciterPageError, setReciterPageError] = useState("");
    const [reciterPageNumber, setReciterPageNumber] = useState(0);
    const [reciterRetry, setReciterRetry] = useState(0);
    const [poetPage, setPoetPage] = useState<ApiPublicArtistPage<ApiPublicArtistProfile> | null>(null);
    const [poetPageLoading, setPoetPageLoading] = useState(false);
    const [poetPageError, setPoetPageError] = useState("");
    const [poetPageNumber, setPoetPageNumber] = useState(0);
    const [poetRetry, setPoetRetry] = useState(0);
    const [subjectPage, setSubjectPage] = useState<ApiPage<ApiPublicSubject> | null>(null);
    const [subjectPageLoading, setSubjectPageLoading] = useState(false);
    const [subjectPageError, setSubjectPageError] = useState("");
    const [subjectPageNumber, setSubjectPageNumber] = useState(0);
    const [subjectRetry, setSubjectRetry] = useState(0);
    const activeRoute = route.split("?")[0];
    const isMainListing = activeRoute === "lyrics";
    const query = search.trim().toLowerCase();
    const dynamicLanguageOptions = Array.from(new Map<string, string>(published.flatMap(lyric => lyric.languageVersions || []).map(version => [normalizeLyricLanguageCode(version.code || version.label || version.script), version.label] as [string, string])).entries());
    const languageOptions = isMainListing ? mainListingLanguages : dynamicLanguageOptions;
    const defaultLanguage = isMainListing ? "all" : languageOptions.some(([code]) => code === "hi") ? "hi" : "all";
    const requestedLanguage = activeRoute === "lyrics" ? getRouteQueryParam("language") || defaultLanguage : "";
    const languageFilter = requestedLanguage === "all" ? "" : languageOptions.some(([code]) => code === normalizeLyricLanguageCode(requestedLanguage)) ? normalizeLyricLanguageCode(requestedLanguage) : defaultLanguage === "all" ? "" : defaultLanguage;
    const mainListingLanguageFilter = isApiLyricLanguage(languageFilter) ? languageFilter : undefined;
    const pageFilterKey = JSON.stringify([activeRoute, search.trim(), letter, languageFilter]);
    const page = pageSelection.filterKey === pageFilterKey ? pageSelection.page : 0;
    const mainQuery = search.trim();
    const mainRequestKey = JSON.stringify([pageFilterKey, page, retry]);
    const mainPage = mainPageState?.requestKey === mainRequestKey ? mainPageState.data : null;

    useEffect(() => {
        setPageSelection(current => current.filterKey === pageFilterKey
            ? current
            : { filterKey: pageFilterKey, page: 0 });
    }, [pageFilterKey]);

    useEffect(() => {
        if (isMainListing) return;
        let active = true;
        setLoading(true);
        setLoadError("");
        setMainPageState(null);
        void Promise.all([
            lyricsApi.listAllPublicLyrics(),
            booksApi.listBooks(),
        ]).then(([items, availableBooks]) => {
            if (active) {
                setPublished(items);
                setBooks(availableBooks);
            }
        }).catch(() => {
            if (active) setLoadError("Lyrics could not be loaded.");
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [retry, isMainListing]);

    useEffect(() => {
        if (activeRoute !== "lyrics-artists") {
            setReciterPage(null);
            setReciterPageError("");
            setReciterPageNumber(0);
            return;
        }
        let active = true;
        setReciterPageLoading(true);
        setReciterPageError("");
        void artistsApi.getPublicRecitersPage({ page: reciterPageNumber, size: 18, letter }).then((page) => {
            if (active) setReciterPage(page);
        }).catch(() => {
            if (active) setReciterPageError("Reciters could not be loaded.");
        }).finally(() => {
            if (active) setReciterPageLoading(false);
        });
        return () => { active = false; };
    }, [activeRoute, letter, reciterPageNumber, reciterRetry]);

    useEffect(() => {
        if (activeRoute !== "lyrics-poets") {
            setPoetPage(null);
            setPoetPageError("");
            setPoetPageNumber(0);
            return;
        }
        let active = true;
        setPoetPageLoading(true);
        setPoetPageError("");
        void artistsApi.getPublicPoetsPage({ page: poetPageNumber, size: 18, letter }).then((page) => {
            if (active) setPoetPage(page);
        }).catch(() => {
            if (active) setPoetPageError("Poets could not be loaded.");
        }).finally(() => {
            if (active) setPoetPageLoading(false);
        });
        return () => { active = false; };
    }, [activeRoute, letter, poetPageNumber, poetRetry]);

    useEffect(() => {
        if (activeRoute !== "lyrics-subjects") {
            setSubjectPage(null);
            setSubjectPageError("");
            setSubjectPageNumber(0);
            return;
        }
        let active = true;
        setSubjectPageLoading(true);
        setSubjectPageError("");
        void lyricsApi.getPublicSubjectsPage({
            page: subjectPageNumber,
            size: 18,
            letter,
            query: query || undefined,
        }).then((page) => {
            if (active) setSubjectPage(page);
        }).catch(() => {
            if (active) setSubjectPageError("Subjects could not be loaded.");
        }).finally(() => {
            if (active) setSubjectPageLoading(false);
        });
        return () => { active = false; };
    }, [activeRoute, letter, query, subjectPageNumber, subjectRetry]);

    useEffect(() => {
        if (!isMainListing) return;
        let active = true;
        setLoading(true);
        setLoadError("");
        void lyricsApi.getPublicLyricsPage({
            page,
            size: 6,
            query: mainQuery || undefined,
            letter: letter === "All" ? undefined : letter,
            language: mainListingLanguageFilter,
        }).then((result) => {
            if (active) setMainPageState({ requestKey: mainRequestKey, data: result });
        }).catch(() => {
            if (active) setLoadError("Lyrics could not be loaded.");
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [isMainListing, page, mainQuery, letter, languageFilter, retry, mainRequestKey]);
    const buildEntries = (options: Array<{ id: string; name: string }>, getKeys: (lyric: ApiPublicLyric) => string[]) =>
        buildAvailableBrowseEntries(options, published, getKeys).map((entry) => {
            const name = entry.name.trim().toLowerCase();
            const profile: ApiArtistProfile | undefined = published
                .flatMap(getLyricArtistProfiles)
                .find((candidate) =>
                    candidate.fullName.trim().toLowerCase() === name
                    || candidate.displayName?.trim().toLowerCase() === name);
            return { ...entry, profileImageUrl: profile?.profileImageUrl };
        });
    const reciterDirectoryEntries = (reciterPage?.items ?? []).map((artist) => {
        const name = artist.displayName?.trim() || artist.fullName.trim();
        const lyrics = published.filter((lyric) => {
            const lyricArtistIds = new Set((lyric.artistIds || []).map((id) => Number(id)).filter((id) => Number.isFinite(id)));
            const lyricReciterIds = new Set((lyric.reciterIds || []).map((id) => Number(id)).filter((id) => Number.isFinite(id)));
            return lyricArtistIds.has(Number(artist.id)) || lyricReciterIds.has(Number(artist.id));
        });
        return {
            id: String(artist.id),
            globalArtistId: artist.id,
            name,
            lyrics,
            profileImageUrl: artist.profileImageUrl,
        };
    });
    const poetDirectoryEntries = (poetPage?.items ?? []).map((artist) => {
        const name = artist.displayName?.trim() || artist.fullName.trim();
        const artistNames = new Set([artist.fullName, artist.displayName]
            .filter((artistName): artistName is string => Boolean(artistName?.trim()))
            .map((artistName) => artistName.trim().toLowerCase()));
        const lyrics = published.filter((lyric) => {
            if (typeof lyric.writerId === "number") return lyric.writerId === artist.id;
            return artistNames.has((lyric.writer || "").trim().toLowerCase());
        });
        return {
            id: String(artist.id),
            globalArtistId: artist.id,
            name,
            lyrics,
            profileImageUrl: artist.profileImageUrl,
        };
    });
    const poetPageVisibleEntries = poetDirectoryEntries.filter((entry) =>
        !query || entry.name.toLowerCase().includes(query)
        || entry.lyrics.some((item) => item.title.toLowerCase().includes(query)));
    const legacyPoetEntries = buildEntries(
        Array.from(new Set(published.map((lyric) => lyric.writer?.trim()).filter((name): name is string => Boolean(name))))
            .map((name) => ({ id: name, name })),
        (lyric) => lyric.writer?.trim() ? [lyric.writer.trim()] : [],
    );
    const subjectPageEntries = (subjectPage?.items ?? []).map((subject) => ({
        id: subject.id,
        name: subject.name,
        lyrics: published.filter((lyric) => lyric.subjectIds.includes(subject.id)),
        profileImageUrl: undefined,
    }));
    const subjectPageVisibleEntries = subjectPageEntries.filter((entry) =>
        !query || entry.name.toLowerCase().includes(query)
        || entry.lyrics.some((item) => item.title.toLowerCase().includes(query)));
    const optionConfig: Record<string, LyricsBrowseConfig> = {
        "lyrics-category": { title: "Categories", heading: "Browse by Category", parameter: "category", noun: "categories", entries: buildEntries(lyricCategories, lyric => lyric.categoryIds) },
        "lyrics-artists": { title: "Naat-Khwaan / Reciters", heading: "Browse by Reciter", parameter: "artist", noun: "reciters", entries: reciterDirectoryEntries },
        "lyrics-poets": { title: "Poets", heading: "Browse by Poet", parameter: "poet", noun: "poets", entries: [...poetDirectoryEntries, ...legacyPoetEntries] },
        "lyrics-books": { title: "Books", heading: "Browse by Source", parameter: "book", noun: "books", entries: buildEntries(books.map(book => ({ id: book.slug, name: book.name })), lyric => lyric.bookId ? [lyric.bookId] : []) },
        "lyrics-languages": { title: "Language", heading: "Browse by Language", parameter: "language", noun: "languages", entries: buildEntries(languageOptions.map(([id, name]) => ({ id, name })), lyric => lyric.languageVersions.map(version => normalizeLyricLanguageCode(version.code || version.label || version.script))) },
        "lyrics-subjects": { title: "Subject / Occasion", heading: "Browse by Subject or Occasion", parameter: "subject", noun: "subjects", entries: subjectPageEntries },
    };
    const config = optionConfig[activeRoute];
    const selectedId = config ? getRouteQueryParam(config.parameter) : "";
    const selected = config?.entries.find(entry => entry.id === selectedId);
    const overview = activeRoute !== "lyrics" && (!config || !selected);
    const reciterPageVisibleEntries = activeRoute === "lyrics-artists"
        ? reciterDirectoryEntries.filter((entry) =>
            !query || entry.name.toLowerCase().includes(query)
            || entry.lyrics.some(item => item.title.toLowerCase().includes(query)))
        : [];

    useEffect(() => {
        if (activeRoute === "lyrics-subjects" && selectedId) return;
        setSearch("");
        if (activeRoute === "lyrics-poets" && selectedId) return;
        setLetter("All");
    }, [activeRoute, selectedId]);

    const placeholder = activeRoute === "lyrics" ? "Search lyric titles" : selected ? `Search ${selected.name} lyrics` : config ? `Search ${config.title.toLowerCase()} and lyrics` : "Search lyric titles";
    const matchesSearchAndLetter = (item: any) => {
        const entityName = selected?.name.toLowerCase() || "";
        return (!query || item.title.toLowerCase().includes(query) || entityName.includes(query)) && matchesLyricsLetter(item.title, letter);
    };
    const selectedLyrics = selected ? selected.lyrics.filter(matchesSearchAndLetter) : [];
    const directoryEntries = activeRoute === "lyrics-artists"
        ? reciterPageVisibleEntries
        : activeRoute === "lyrics-poets"
            ? poetPageVisibleEntries
            : activeRoute === "lyrics-subjects"
                ? subjectPageVisibleEntries
        : (config?.entries.filter(entry => matchesLyricsLetter(entry.name, letter) && (!query || entry.name.toLowerCase().includes(query) || entry.lyrics.some(item => item.title.toLowerCase().includes(query)))) || []);
    const languageFilteredLyrics = languageFilter ? published.filter(lyric => lyric.languageVersions.some(version => normalizeLyricLanguageCode(version.code || version.label || version.script) === languageFilter)) : published;
    const allLyrics = languageFilteredLyrics.filter(lyric =>
        (!query || lyric.title.toLowerCase().includes(query)) && matchesLyricsLetter(lyric.title, letter));
    const selectRoute = (nextRoute: string) => {
        setSearch("");
        setLetter("All");
        setReciterPageNumber(0);
        if (activeRoute !== "lyrics-poets") setPoetPageNumber(0);
        if (activeRoute !== "lyrics-subjects") setSubjectPageNumber(0);
        go(nextRoute);
    };
    const returnToOverview = () => selectRoute(activeRoute);
    const clearFilters = () => {
        setSearch("");
        setLetter("All");
        if (activeRoute === "lyrics-artists") setReciterPageNumber(0);
        if (activeRoute === "lyrics-poets") setPoetPageNumber(0);
        if (activeRoute === "lyrics-subjects") setSubjectPageNumber(0);
        if (selected) go(activeRoute);
        else if (activeRoute === "lyrics" && (languageFilter || "all") !== defaultLanguage) go(`lyrics?language=${defaultLanguage}`);
    };
    const changeLetter = (nextLetter: string) => {
        setLetter(nextLetter);
        if (activeRoute === "lyrics-artists") setReciterPageNumber(0);
        if (activeRoute === "lyrics-poets") setPoetPageNumber(0);
        if (activeRoute === "lyrics-subjects") setSubjectPageNumber(0);
    };
    const changeSearch = (value: string) => {
        setSearch(value);
        if (activeRoute === "lyrics-subjects") setSubjectPageNumber(0);
    };
    const reciterCurrentPage = reciterPage?.page ?? reciterPageNumber;
    const resultLyrics = isMainListing ? mainPage?.items || [] : selectedLyrics;
    const resultLanguageLabel = activeRoute === "lyrics" && languageFilter ? languageOptions.find(([code]) => code === languageFilter)?.[1] : undefined;
    const resultTitle = activeRoute === "lyrics" ? "Recently Published" : selected ? `${selected.name} lyrics` : "Matching Lyrics";
    const resultCount = isMainListing ? mainPage?.totalElements || 0 : resultLyrics.length;
    const resultEyebrow = `${resultCount} ${resultCount === 1 ? "work" : "works"}`;
    const emptyMessage = activeRoute === "lyrics" ? "No lyrics match those filters." : `No lyrics match this ${config?.title.toLowerCase() || "category"} selection.`;
    const renderEmpty = (message: string, help: string) => <div className="empty"><Icon name="search" size={32} /><h3>{message}</h3><p><LocalizedText text={help} /></p><button className="btn btn-primary" onClick={clearFilters}><LocalizedText text={"Clear filters"} /></button></div>;
    const visiblePages = mainPage ? getVisiblePageNumbers(page, mainPage.totalPages) : [];
    const mainListingLoading = loading || (isMainListing && !mainPage && !loadError);
    const reciterListingLoading = activeRoute === "lyrics-artists" && reciterPageLoading;
    const poetListingLoading = activeRoute === "lyrics-poets"
        && (poetPageLoading || (!poetPage && !poetPageError));
    const subjectListingLoading = activeRoute === "lyrics-subjects"
        && (loading || subjectPageLoading || (!subjectPage && !subjectPageError));

    const reciterVisiblePages = reciterPage ? getVisiblePageNumbers(reciterCurrentPage, reciterPage.totalPages) : [];
    const reciterRangeStart = reciterPage && reciterPage.totalElements > 0
        ? reciterPage.page * reciterPage.size + 1
        : 0;
    const reciterRangeEnd = reciterPage && reciterRangeStart > 0
        ? Math.min((reciterPage.page + 1) * reciterPage.size, reciterPage.totalElements)
        : 0;
    const reciterPaginationControls = activeRoute === "lyrics-artists" && reciterPage
        && reciterPage.totalElements > 0 && reciterPage.totalPages > 0
        ? <nav className="pagination lyrics-pagination" aria-label={interfaceAttributeText("Reciter pages")}>
            <button type="button" disabled={!reciterPage.hasPrevious || reciterPage.first} onClick={() => setReciterPageNumber(Math.max(0, reciterPage.page - 1))}><LocalizedText text={"Previous"} /></button>
            {reciterVisiblePages.map((pageNumber) => <button
                type="button"
                key={pageNumber}
                className={pageNumber === reciterCurrentPage ? "active" : ""}
                aria-current={pageNumber === reciterCurrentPage ? "page" : undefined}
                aria-label={`Page ${pageNumber + 1}`}
                onClick={() => setReciterPageNumber(pageNumber)}
            >{pageNumber + 1}</button>)}
            <button type="button" disabled={!reciterPage.hasNext || reciterPage.last} onClick={() => setReciterPageNumber(Math.min(reciterPage.totalPages - 1, reciterPage.page + 1))}><LocalizedText text={"Next"} /></button>
            <span className="lyrics-pagination-summary">
            Showing {reciterRangeStart}–{reciterRangeEnd} of {reciterPage.totalElements} reciters
            {reciterPage.totalPages > 1 && <> · Page {reciterCurrentPage + 1} of {reciterPage.totalPages}</>}
            </span>
        </nav>
        : null;
    const poetCurrentPage = poetPage?.page ?? poetPageNumber;
    const poetVisiblePages = poetPage ? getVisiblePageNumbers(poetCurrentPage, poetPage.totalPages) : [];
    const poetRangeStart = poetPage && poetPage.totalElements > 0
        ? poetPage.page * poetPage.size + 1
        : 0;
    const poetRangeEnd = poetPage && poetRangeStart > 0
        ? Math.min((poetPage.page + 1) * poetPage.size, poetPage.totalElements)
        : 0;
    const poetPaginationControls = activeRoute === "lyrics-poets" && poetPage
        && poetPage.totalElements > 0 && poetPage.totalPages > 0
        ? <nav className="pagination lyrics-pagination" aria-label={interfaceAttributeText("Poet pages")}>
            <button type="button" disabled={!poetPage.hasPrevious || poetPage.first} onClick={() => setPoetPageNumber(Math.max(0, poetPage.page - 1))}><LocalizedText text={"Previous"} /></button>
            {poetVisiblePages.map((pageNumber) => <button
                type="button"
                key={pageNumber}
                className={pageNumber === poetCurrentPage ? "active" : ""}
                aria-current={pageNumber === poetCurrentPage ? "page" : undefined}
                aria-label={`Page ${pageNumber + 1}`}
                onClick={() => setPoetPageNumber(pageNumber)}
            >{pageNumber + 1}</button>)}
            <button type="button" disabled={!poetPage.hasNext || poetPage.last} onClick={() => setPoetPageNumber(Math.min(poetPage.totalPages - 1, poetPage.page + 1))}><LocalizedText text={"Next"} /></button>
            <span className="lyrics-pagination-summary">
                Showing {poetRangeStart}–{poetRangeEnd} of {poetPage.totalElements} poets
                {poetPage.totalPages > 1 && <> · Page {poetCurrentPage + 1} of {poetPage.totalPages}</>}
            </span>
        </nav>
        : null;
    const subjectCurrentPage = subjectPage?.page ?? subjectPageNumber;
    const subjectVisiblePages = subjectPage ? getVisiblePageNumbers(subjectCurrentPage, subjectPage.totalPages) : [];
    const subjectRangeStart = subjectPage && subjectPage.totalElements > 0
        ? subjectPage.page * subjectPage.size + 1
        : 0;
    const subjectRangeEnd = subjectPage && subjectRangeStart > 0
        ? Math.min((subjectPage.page + 1) * subjectPage.size, subjectPage.totalElements)
        : 0;
    const subjectPaginationControls = activeRoute === "lyrics-subjects" && subjectPage
        && subjectPage.totalElements > 0 && subjectPage.totalPages > 0
        ? <nav className="pagination lyrics-pagination" aria-label={interfaceAttributeText("Subject pages")}>
            <button type="button" disabled={!(subjectPage.hasPrevious ?? subjectPage.page > 0) || subjectPage.first === true} onClick={() => setSubjectPageNumber(Math.max(0, subjectPage.page - 1))}><LocalizedText text={"Previous"} /></button>
            {subjectVisiblePages.map((pageNumber) => <button
                type="button"
                key={pageNumber}
                className={pageNumber === subjectCurrentPage ? "active" : ""}
                aria-current={pageNumber === subjectCurrentPage ? "page" : undefined}
                aria-label={`Page ${pageNumber + 1}`}
                onClick={() => setSubjectPageNumber(pageNumber)}
            >{pageNumber + 1}</button>)}
            <button type="button" disabled={!(subjectPage.hasNext ?? subjectPage.page + 1 < subjectPage.totalPages) || subjectPage.last === true} onClick={() => setSubjectPageNumber(Math.min(subjectPage.totalPages - 1, subjectPage.page + 1))}><LocalizedText text={"Next"} /></button>
            <span className="lyrics-pagination-summary">
                Showing {subjectRangeStart}–{subjectRangeEnd} of {subjectPage.totalElements} subjects
                {subjectPage.totalPages > 1 && <> · Page {subjectCurrentPage + 1} of {subjectPage.totalPages}</>}
            </span>
        </nav>
        : null;
    const paginationControls = isMainListing && mainPage && mainPage.totalPages > 1
        ? <nav className="pagination lyrics-pagination" aria-label={interfaceAttributeText("Lyrics pages")}>
            <button type="button" disabled={!(mainPage.hasPrevious ?? page > 0)} onClick={() => setPageSelection({ filterKey: pageFilterKey, page: Math.max(0, page - 1) })}><LocalizedText text={"Previous"} /></button>
            {visiblePages.map(pageNumber => <button
                type="button"
                key={pageNumber}
                className={pageNumber === page ? "active" : ""}
                aria-current={pageNumber === page ? "page" : undefined}
                aria-label={`Page ${pageNumber + 1}`}
                onClick={() => setPageSelection({ filterKey: pageFilterKey, page: pageNumber })}
            >{pageNumber + 1}</button>)}
            <button type="button" disabled={!(mainPage.hasNext ?? page + 1 < mainPage.totalPages)} onClick={() => setPageSelection({ filterKey: pageFilterKey, page: Math.min(mainPage.totalPages - 1, page + 1) })}><LocalizedText text={"Next"} /></button>
            <span className="lyrics-pagination-summary">Page {page + 1} of {mainPage.totalPages} · {mainPage.totalElements} lyrics</span>
        </nav>
        : null;

    return <>
        <main>
        <DirectoryHeader go={go} title={interfaceAttributeText("Devotional Lyrics")} text="Discover words of praise and devotion across languages, traditions, and beloved voices." />
        <div className="container directory-controls">
            <div className="lyrics-search-row">
                <SearchBox value={search} setValue={changeSearch} placeholder={placeholder} />
                {isMainListing && <label className="lyrics-language-filter">
                    <span className="sr-only"><LocalizedText text={"Select lyric language"} /></span>
                    <select
                        aria-label={interfaceAttributeText("Select lyric language")}
                        value={languageFilter || "all"}
                        onChange={event => go(event.target.value === "all" ? "lyrics?language=all" : `lyrics?language=${encodeURIComponent(event.target.value)}`)}
                    >
                        <option value="all">{t("All languages")}</option>
                        {languageOptions.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                    </select>
                </label>}
            </div>
            <LyricsBrowseControl go={selectRoute} active={activeRoute} />
            <div className="alphabet" aria-label={interfaceAttributeText("Filter by first letter")}>
                <button className={letter === "All" ? "active" : ""} onClick={() => changeLetter("All")}><LocalizedText text={"All"} /></button>
                {["0-9", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map(option => <button key={option} className={letter === option ? "active" : ""} onClick={() => changeLetter(option)}>{option === "0-9" ? "0–9" : option}</button>)}
            </div>
        </div>
        {mainListingLoading
            ? <section className="section container"><p role="status"><LocalizedText text={"Loading lyrics..."} /></p></section>
            : loadError
                ? <section className="section container"><div className="empty"><p role="alert"><LocalizedText text={loadError} /></p><button className="btn btn-primary" onClick={() => setRetry(count => count + 1)}><LocalizedText text={"Try again"} /></button></div></section>
                : isMainListing
                    ? <section className="section container">
                        <SectionHead eyebrow={resultEyebrow} title={resultTitle} />
                        {resultLyrics.length
                            ? renderLyricCards(resultLyrics, go, resultLanguageLabel, true)
                            : renderEmpty(emptyMessage, "Try another title or letter, or reset the filters.")}
                        {paginationControls}
                    </section>
                    : activeRoute === "lyrics-artists"
                        ? <section className="section container">
                            {reciterListingLoading
                                ? <p role="status"><LocalizedText text={"Loading reciters..."} /></p>
                                : reciterPageError
                                    ? <div className="empty"><p role="alert"><LocalizedText text={reciterPageError} /></p><button className="btn btn-primary" onClick={() => setReciterRetry((current) => current + 1)}><LocalizedText text={"Try again"} /></button></div>
                                    : <>
                                        <SectionHead eyebrow={reciterPage ? `${reciterPage.totalElements} reciters` : "Reciters"} title={config?.heading || "Browse by Reciter"} />
                                        {reciterPageVisibleEntries.length
                                            ? <div className="library-directory-grid lyrics-reciter-grid">{reciterPageVisibleEntries.map(entry => <button
                                                key={entry.id}
                                                type="button"
                                                className="lyrics-reciter-card"
                                                onClick={() => setArtistSelection({
                                                    artistId: entry.globalArtistId,
                                                    relationship: "reciter",
                                                    artistName: entry.name,
                                                    profileImageUrl: entry.profileImageUrl,
                                                })}
                                            >
                                                <ArtistProfileAvatar imageUrl={entry.profileImageUrl} size="directory" />
                                                <span className="lyrics-reciter-card-name">{entry.name}</span>
                                                <small className="lyrics-reciter-card-count">{entry.lyrics.length} {entry.lyrics.length === 1 ? "title" : "titles"}</small>
                                            </button>)}</div>
                                            : renderEmpty("No reciters match those filters.", "Try another search or letter.")}
                                        {reciterPaginationControls}
                                    </>}
                        </section>
                        : activeRoute === "lyrics-poets"
                            ? selected
                                ? <section className="section container">
                                    <SectionHead eyebrow={resultEyebrow} title={resultTitle} action={`Back to ${config?.heading || "Browse by Poet"}`} onAction={returnToOverview} />
                                    {resultLyrics.length ? renderLyricCards(resultLyrics, go) : renderEmpty(emptyMessage, "Try another title or letter, or return to the overview.")}
                                </section>
                                : <section className="section container">
                                    {poetListingLoading
                                        ? <p role="status"><LocalizedText text={"Loading poets..."} /></p>
                                        : poetPageError
                                            ? <div className="empty"><p role="alert"><LocalizedText text={poetPageError} /></p><button className="btn btn-primary" onClick={() => setPoetRetry((current) => current + 1)}><LocalizedText text={"Try again"} /></button></div>
                                            : <>
                                                <SectionHead eyebrow={poetPage ? `${poetPage.totalElements} poets` : "Poets"} title={config?.heading || "Browse by Poet"} />
                                                {poetPageVisibleEntries.length
                                                    ? <div className="library-directory-grid lyrics-reciter-grid">{poetPageVisibleEntries.map(entry => <button
                                                        key={entry.id}
                                                        type="button"
                                                        className="lyrics-reciter-card"
                                                        onClick={() => setArtistSelection({
                                                            artistId: entry.globalArtistId,
                                                            relationship: "writer",
                                                            artistName: entry.name,
                                                            profileImageUrl: entry.profileImageUrl,
                                                        })}
                                                    >
                                                        <ArtistProfileAvatar imageUrl={entry.profileImageUrl} size="directory" />
                                                        <span className="lyrics-reciter-card-name">{entry.name}</span>
                                                        <small className="lyrics-reciter-card-count">{entry.lyrics.length} {entry.lyrics.length === 1 ? "title" : "titles"}</small>
                                                    </button>)}</div>
                                                    : renderEmpty("No poets match those filters.", "Try another search or letter.")}
                                                {poetPaginationControls}
                                            </>}
                                </section>
                        : activeRoute === "lyrics-subjects"
                            ? selected
                                ? <section className="section container">
                                    <SectionHead eyebrow={resultEyebrow} title={resultTitle} action={`Back to ${config?.heading || "Browse by Subject or Occasion"}`} onAction={returnToOverview} />
                                    {resultLyrics.length ? renderLyricCards(resultLyrics, go) : renderEmpty(emptyMessage, "Try another title or letter, or return to the overview.")}
                                </section>
                                : <section className="section container">
                                    {subjectListingLoading
                                        ? <p role="status"><LocalizedText text={"Loading subjects..."} /></p>
                                        : subjectPageError
                                            ? <div className="empty"><p role="alert"><LocalizedText text={subjectPageError} /></p><button className="btn btn-primary" onClick={() => setSubjectRetry((current) => current + 1)}><LocalizedText text={"Try again"} /></button></div>
                                            : <>
                                                <SectionHead eyebrow={subjectPage ? `${subjectPage.totalElements} subjects` : "Subjects"} title={config?.heading || "Browse by Subject or Occasion"} />
                                                {subjectPageVisibleEntries.length
                                                    ? <div className="library-directory-grid">{subjectPageVisibleEntries.map(entry => <button
                                                        key={entry.id}
                                                        type="button"
                                                        onClick={() => go(`${activeRoute}?${config?.parameter || "subject"}=${encodeURIComponent(entry.id)}`)}
                                                    >
                                                        <span>{entry.name}</span>
                                                        <small>{entry.lyrics.length} {entry.lyrics.length === 1 ? "title" : "titles"}</small>
                                                    </button>)}</div>
                                                    : renderEmpty("No subjects match those filters.", "Try another search or letter.")}
                                                {subjectPaginationControls}
                                            </>}
                                </section>
                        : <>
                            {overview && config && <section className="section container">
                                <SectionHead eyebrow={`${directoryEntries.length} ${config.noun}`} title={config.heading} />
                                {directoryEntries.length
                                    ? <div className="library-directory-grid">{directoryEntries.map(entry => <button key={entry.id} onClick={() => selectRoute(`${activeRoute}?${config.parameter}=${encodeURIComponent(entry.id)}`)}>{activeRoute === "lyrics-artists" || activeRoute === "lyrics-poets"
                                        ? <span className="lyrics-artist-directory-entry"><ArtistProfileAvatar imageUrl={entry.profileImageUrl} size="directory" /><span><span>{entry.name}</span><small>{entry.lyrics.length} {entry.lyrics.length === 1 ? "title" : "titles"}</small></span></span>
                                        : <><span>{entry.name}</span><small>{entry.lyrics.length} {entry.lyrics.length === 1 ? "title" : "titles"}</small></>}</button>)}</div>
                                    : renderEmpty(`No ${config.noun} match those filters.`, "Try another search or letter.")}
                            </section>}
                            {selected && <section className="section container">
                                <SectionHead eyebrow={resultEyebrow} title={resultTitle} action={`Back to ${config.heading}`} onAction={returnToOverview} />
                                {resultLyrics.length ? renderLyricCards(resultLyrics, go) : renderEmpty(emptyMessage, "Try another title or letter, or return to the overview.")}
                            </section>}
                            {!config && <section className="section container">
                                <SectionHead eyebrow="Lyrics library" title={interfaceAttributeText("Recently Published")} />
                                {allLyrics.length ? renderLyricCards(allLyrics, go) : renderEmpty(emptyMessage, "Try another title or letter, or reset the filters.")}
                            </section>}
                        </>}
        </main>
        {artistSelection && <LyricsArtistProfileDrawer
            key={`${artistSelection.artistId}-${artistSelection.relationship}`}
            selection={artistSelection}
            onClose={() => setArtistSelection(null)}
            onSelectLyric={(lyricId) => {
                setArtistSelection(null);
                go(`lyric-detail?id=${encodeURIComponent(lyricId)}`);
            }}
        />}
    </>;
}
