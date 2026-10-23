import { useEffect, useState } from "react";
import { lyricCategories, lyricBooks, lyricSubjects, normalizeLyricLanguageCode } from "../../../lyricsData";
import { interfaceAttributeText, LocalizedText, useInterfaceText } from "../../../app/providers/interfaceLanguage";
import { getRouteQueryParam } from "../../../app/utils/getRouteQueryParam";
import { DirectoryHeader, SearchBox } from "../../../components/common/PagePrimitives";
import { SectionHead } from "../../../components/common/SectionHead";
import { Icon } from "../../../components/ui";
import { LyricsCard } from "../components/LyricsCard";
import { lyricsApi } from "../services/lyricsApiService.js";
import type { ApiPublicLyric } from "../services/lyricsApiService.js";

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

type LyricsBrowseEntry = { id: string; name: string; lyrics: any[] };
type LyricsBrowseConfig = { title: string; heading: string; parameter: string; noun: string; entries: LyricsBrowseEntry[] };

function matchesLyricsLetter(value: string, letter: string) {
    if (letter === "All") return true;
    const firstMeaningful = (value || "").match(/[A-Za-z0-9]/)?.[0] || "";
    if (!firstMeaningful) return false;
    return letter === "0-9" ? /\d/.test(firstMeaningful) : firstMeaningful.toUpperCase() === letter;
}

function LyricsBrowseControl({ go, active }: { go: (route: string) => void; active: string }) {
    const t = useInterfaceText();
    return <nav className="category-row tabs lyrics-category-tabs" role="tablist" aria-label={interfaceAttributeText("Lyrics browse destinations")}>
        {lyricsBrowseItems.map(([label, route]) => <button key={route} type="button" role="tab" aria-selected={active === route} className={active === route ? "active" : ""} onClick={() => go(route)}>{t(label)}</button>)}
    </nav>;
}

function renderLyricCards(items: any[], go: (route: string) => void, displayLanguage?: string) {
    return <div className="lyrics-list">{items.map((item, index) => <LyricsCard item={item} index={index} key={item.id} go={go} displayLanguage={displayLanguage} onClick={() => go(`lyric-detail?id=${encodeURIComponent(item.id)}`)} />)}</div>;
}

export function LyricsPage({ go, route }: { go: (route: string) => void; route: string }) {
    const t = useInterfaceText();
    const [published, setPublished] = useState<ApiPublicLyric[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [retry, setRetry] = useState(0);
    const [search, setSearch] = useState("");
    const [letter, setLetter] = useState("All");
    const activeRoute = route.split("?")[0];
    useEffect(() => {
        let active = true;
        setLoading(true);
        setLoadError("");
        void lyricsApi.listAllPublicLyrics().then((items) => {
            if (active) setPublished(items);
        }).catch(() => {
            if (active) setLoadError("Lyrics could not be loaded.");
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [retry]);
    const query = search.trim().toLowerCase();
    const languageOptions = Array.from(new Map<string, string>(published.flatMap(lyric => lyric.languageVersions || []).map(version => [normalizeLyricLanguageCode(version.code || version.label || version.script), version.label] as [string, string])).entries());
    const defaultLanguage = languageOptions.some(([code]) => code === "hi") ? "hi" : "all";
    const requestedLanguage = activeRoute === "lyrics" ? getRouteQueryParam("language") || defaultLanguage : "";
    const languageFilter = requestedLanguage === "all" ? "" : languageOptions.some(([code]) => code === normalizeLyricLanguageCode(requestedLanguage)) ? normalizeLyricLanguageCode(requestedLanguage) : defaultLanguage === "all" ? "" : defaultLanguage;
    const optionConfig: Record<string, LyricsBrowseConfig> = {
        "lyrics-category": { title: "Categories", heading: "Browse by Category", parameter: "category", noun: "categories", entries: lyricCategories.map(entry => ({ id: entry.id, name: entry.name, lyrics: published.filter(lyric => lyric.categoryIds.includes(entry.id)) })) },
        "lyrics-artists": { title: "Naat-Khwaan / Reciters", heading: "Browse by Reciter", parameter: "artist", noun: "reciters", entries: Array.from(new Set(published.flatMap(lyric => lyric.reciters))).map(name => ({ id: name, name, lyrics: published.filter(lyric => lyric.reciters.includes(name)) })) },
        "lyrics-poets": { title: "Poets", heading: "Browse by Poet", parameter: "poet", noun: "poets", entries: Array.from(new Set(published.map(lyric => lyric.writer).filter((name): name is string => Boolean(name?.trim())))).map(name => ({ id: name, name, lyrics: published.filter(lyric => lyric.writer === name) })) },
        "lyrics-books": { title: "Books", heading: "Browse by Source", parameter: "book", noun: "books", entries: lyricBooks.map(entry => ({ id: entry.id, name: entry.title, lyrics: published.filter(lyric => lyric.bookId === entry.id) })) },
        "lyrics-languages": { title: "Language", heading: "Browse by Language", parameter: "language", noun: "languages", entries: Array.from(new Map<string, string>(published.flatMap(lyric => lyric.languageVersions || []).map(version => [version.code, version.label] as [string, string])).entries()).map(([id, name]) => ({ id, name, lyrics: published.filter(lyric => lyric.languageVersions.some(version => normalizeLyricLanguageCode(version.code) === normalizeLyricLanguageCode(id))) })) },
        "lyrics-subjects": { title: "Subject / Occasion", heading: "Browse by Subject or Occasion", parameter: "subject", noun: "subjects", entries: lyricSubjects.map(entry => ({ id: entry.id, name: entry.name, lyrics: published.filter(lyric => lyric.subjectIds.includes(entry.id)) })) },
    };
    const config = optionConfig[activeRoute];
    const selectedId = config ? getRouteQueryParam(config.parameter) : "";
    const selected = config?.entries.find(entry => entry.id === selectedId);
    const overview = activeRoute !== "lyrics" && (!config || !selected);

    useEffect(() => {
        setSearch("");
        setLetter("All");
    }, [activeRoute, selectedId]);

    const placeholder = activeRoute === "lyrics" ? "Search lyric titles" : selected ? `Search ${selected.name} lyrics` : config ? `Search ${config.title.toLowerCase()} and lyrics` : "Search lyric titles";
    const matchesSearchAndLetter = (item: any) => {
        const entityName = selected?.name.toLowerCase() || "";
        return (!query || item.title.toLowerCase().includes(query) || entityName.includes(query)) && matchesLyricsLetter(item.title, letter);
    };
    const selectedLyrics = selected ? selected.lyrics.filter(matchesSearchAndLetter) : [];
    const directoryEntries = config?.entries.filter(entry => matchesLyricsLetter(entry.name, letter) && (!query || entry.name.toLowerCase().includes(query) || entry.lyrics.some(item => item.title.toLowerCase().includes(query)))) || [];
    const languageFilteredLyrics = languageFilter ? published.filter(lyric => lyric.languageVersions.some(version => normalizeLyricLanguageCode(version.code || version.label || version.script) === languageFilter)) : published;
    const allLyrics = languageFilteredLyrics.filter(lyric =>
        (!query || lyric.title.toLowerCase().includes(query)) && matchesLyricsLetter(lyric.title, letter));
    const selectRoute = (nextRoute: string) => {
        setSearch("");
        setLetter("All");
        go(nextRoute);
    };
    const returnToOverview = () => selectRoute(activeRoute);
    const clearFilters = () => {
        setSearch("");
        setLetter("All");
        if (selected) go(activeRoute);
        else if (activeRoute === "lyrics" && (languageFilter || "all") !== defaultLanguage) go(`lyrics?language=${defaultLanguage}`);
    };
    const resultLyrics = activeRoute === "lyrics" ? allLyrics : selectedLyrics;
    const resultLanguageLabel = activeRoute === "lyrics" && languageFilter ? languageOptions.find(([code]) => code === languageFilter)?.[1] : undefined;
    const resultTitle = activeRoute === "lyrics" ? "Recently Published" : selected ? `${selected.name} lyrics` : "Matching Lyrics";
    const resultEyebrow = `${resultLyrics.length} ${resultLyrics.length === 1 ? "work" : "works"}`;
    const emptyMessage = activeRoute === "lyrics" ? "No lyrics match those filters." : `No lyrics match this ${config?.title.toLowerCase() || "category"} selection.`;
    const renderEmpty = (message: string, help: string) => <div className="empty"><Icon name="search" size={32} /><h3>{message}</h3><p><LocalizedText text={help} /></p><button className="btn btn-primary" onClick={clearFilters}><LocalizedText text={"Clear filters"} /></button></div>;

    return <main><DirectoryHeader go={go} title={interfaceAttributeText("Devotional Lyrics")} text="Discover words of praise and devotion across languages, traditions, and beloved voices." /><div className="container directory-controls"><div className="lyrics-search-row"><SearchBox value={search} setValue={setSearch} placeholder={placeholder} />{activeRoute === "lyrics" && <label className="lyrics-language-filter"><span className="sr-only"><LocalizedText text={"Select lyric language"} /></span><select aria-label={interfaceAttributeText("Select lyric language")} value={languageFilter || "all"} onChange={event => go(event.target.value === "all" ? "lyrics?language=all" : `lyrics?language=${encodeURIComponent(event.target.value)}`)}><option value="all">{t("All languages")}</option>{languageOptions.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>}</div><LyricsBrowseControl go={selectRoute} active={activeRoute} /><div className="alphabet" aria-label={interfaceAttributeText("Filter by first letter")}><button className={letter === "All" ? "active" : ""} onClick={() => setLetter("All")}><LocalizedText text={"All"} /></button>{["0-9", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map(option => <button key={option} className={letter === option ? "active" : ""} onClick={() => setLetter(option)}>{option === "0-9" ? "0–9" : option}</button>)}</div></div>
        {loading ? <section className="section container"><p role="status"><LocalizedText text={"Loading lyrics..."} /></p></section> : loadError ? <section className="section container"><div className="empty"><p role="alert"><LocalizedText text={loadError} /></p><button className="btn btn-primary" onClick={() => setRetry((count) => count + 1)}><LocalizedText text={"Try again"} /></button></div></section> : activeRoute === "lyrics" ? <section className="section container"><SectionHead eyebrow={resultEyebrow} title={resultTitle} />{resultLyrics.length ? renderLyricCards(resultLyrics, go, resultLanguageLabel) : renderEmpty(emptyMessage, "Try another title or letter, or reset the filters.")}</section> : <>
            {overview && config && <section className="section container"><SectionHead eyebrow={`${directoryEntries.length} ${config.noun}`} title={config.heading} />{directoryEntries.length ? <div className="library-directory-grid">{directoryEntries.map(entry => <button key={entry.id} onClick={() => selectRoute(`${activeRoute}?${config.parameter}=${encodeURIComponent(entry.id)}`)}><span>{entry.name}</span><small>{entry.lyrics.length} {entry.lyrics.length === 1 ? "title" : "titles"}</small></button>)}</div> : renderEmpty(`No ${config.noun} match those filters.`, "Try another search or letter.")}</section>}
            {selected && <section className="section container"><SectionHead eyebrow={resultEyebrow} title={resultTitle} action={`Back to ${config.heading}`} onAction={returnToOverview} />{resultLyrics.length ? renderLyricCards(resultLyrics, go) : renderEmpty(emptyMessage, "Try another title or letter, or return to the overview.")}</section>}
            {!config && <section className="section container"><SectionHead eyebrow="Lyrics library" title={interfaceAttributeText("Recently Published")} />{allLyrics.length ? renderLyricCards(allLyrics, go) : renderEmpty(emptyMessage, "Try another title or letter, or reset the filters.")}</section>}
        </>}</main>;
}
