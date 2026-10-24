import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { interfaceAttributeText, LocalizedText, useInterfaceText } from "../../../app/providers/interfaceLanguage";
import { getRouteQueryParam } from "../../../app/utils/getRouteQueryParam";
import { Icon } from "../../../components/ui";
import { SectionHead } from "../../../components/common/SectionHead";
import { CategoryBrowseControl, DirectoryHeader, PageHero, SearchBox } from "../../../components/common/PagePrimitives";
import { audioSources, ayahAudioSources, juzStarts, mushafPageStarts, surahMeanings, translationResources, type TranslationLanguage } from "../data/quranData";
import { surahData, surahs } from "../data/surahMetadata";
import { QURAN_BOOKMARKS_UPDATED_EVENT, readQuranBookmarks, writeQuranBookmarks } from "../services/quranBookmarks";
import { useQuranSurahs } from "../hooks/useQuranSurahs";
import { useQuranSurahAyahs } from "../hooks/useQuranSurahAyahs";
import { getSurahLabel, useQuranJuzAyahs, useQuranJuzList } from "../hooks/useQuranJuz";
import { hasApiUrl } from "../services/quranApiService";
import { getJuzReaderRoute } from "../utils/quranBrowseUtils.js";

type Route = string;
const quranBrowseItems = [
  "Quran Home",
  "Surah Directory",
  "Para Directory",
  "Makki / Madani",
  "Topics",
  "Quranic Quotes",
  "Audio Quran",
] as const;

const quranBrowseMap: Record<(typeof quranBrowseItems)[number], Route> = {
  "Quran Home": "quran",
  "Surah Directory": "surahs",
  "Para Directory": "para",
  "Makki / Madani": "surahs",
  "Topics": "quran-topics?view=topics",
  "Quranic Quotes": "quran-topics?view=quotes",
  "Audio Quran": "audio",
};

const quranRouteToBrowseValue: Record<string, (typeof quranBrowseItems)[number]> = {
  quran: "Quran Home",
  surahs: "Surah Directory",
  para: "Para Directory",
  "quran-topics": "Topics",
  audio: "Audio Quran",
  "audio-detail": "Audio Quran",
  "surah-read": "Surah Directory",
};

function getQuranSearchPlaceholder(category: (typeof quranBrowseItems)[number]) {
  switch (category) {
    case "Quran Home":
      return "Search the Quran home collection";
    case "Surah Directory":
      return "Find a Surah by name or number";
    case "Para Directory":
      return "Find a Para by number or name";
    case "Makki / Madani":
      return "Filter Makki or Madani Surahs";
    case "Topics":
      return "Search Quran topics";
    case "Quranic Quotes":
      return "Search Quranic quotes";
    case "Audio Quran":
      return "Search Quran recitations";
    default:
      return "Search Quran";
  }
}

function filterQuranSurahs(items: string[][], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => `${item[0]} ${item[1]} ${item[2]} ${item[3]} ${item[4]}`.toLowerCase().includes(normalized));
}

function filterQuranParas<T extends { number: number; label: string; surahName: string; arabicName: string }>(items: T[], query: string): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => `${item.number} ${item.label} ${item.surahName} ${item.arabicName}`.toLowerCase().includes(normalized));
}

function QuranSearchAndBrowse({ search, setSearch, activeCategory, onSelectCategory }: { search: string; setSearch: (value: string) => void; activeCategory: (typeof quranBrowseItems)[number]; onSelectCategory: (value: (typeof quranBrowseItems)[number]) => void; }) {
  return <div className="container directory-controls"><div className="lyrics-search-row quran-home-search-row"><SearchBox value={search} setValue={setSearch} placeholder={getQuranSearchPlaceholder(activeCategory)} /><CategoryBrowseControl items={[...quranBrowseItems]} value={activeCategory} onChange={(value) => onSelectCategory(value as (typeof quranBrowseItems)[number])} /></div></div>;
}




export function QuranHome({ go }: { go: (r: Route) => void }) {
  const [search, setSearch] = useState("");
  const { items: allSurahs } = useQuranSurahs();
  const filteredSurahs = filterQuranSurahs(allSurahs, search).slice(0, 6);
  const handleBrowseSelect = (item: (typeof quranBrowseItems)[number]) => {
    setSearch("");
    go(quranBrowseMap[item]);
  };

  return <main><PageHero eyebrow="THE HOLY QURAN" title={interfaceAttributeText("Read. Reflect. Return.")} text="A calm and respectful space to explore the Quran, Surah by Surah."><QuranSearchAndBrowse search={search} setSearch={setSearch} activeCategory="Quran Home" onSelectCategory={handleBrowseSelect} /></PageHero><section className="section container"><div className="browse-cards"><button onClick={() => go("surahs")}><span>114</span><div><b><LocalizedText text={"Browse by Surah"} /></b><small><LocalizedText text={"Explore every chapter in order"} /></small></div><Icon name="arrow" /></button><button onClick={() => go("para")}><span>30</span><div><b><LocalizedText text={"Browse by Para"} /></b><small><LocalizedText text={"Read by Juz division"} /></small></div><Icon name="arrow" /></button></div><SectionHead eyebrow="Continue Exploring" title={interfaceAttributeText("Surahs of the Quran")} action="View all 114 Surahs" onAction={() => go("surahs")} /><SurahGrid go={go} items={search.trim() ? filteredSurahs : allSurahs.slice(0, 6)} /></section></main>;
}

function SurahGrid({ go, items = surahs }: { go: (r: Route) => void; items?: string[][] }) {
  const t = useInterfaceText();
  return <div className="surah-grid">{items.map(x => <button key={x[0]} onClick={() => go(`surah-read?surah=${Number(x[0])}&ayah=1`)}><span className="surah-no">{x[0]}</span><div><b>{x[2]}</b><small>{t(x[3])} • {t(x[4])}</small></div><strong lang="ar" dir="rtl">{x[1]}</strong></button>)}</div>;
}

export function SurahDirectory({ go }: { go: (r: Route) => void }) {
  const [search, setSearch] = useState("");
  const [revelationFilter, setRevelationFilter] = useState<"Makki" | "Madani" | undefined>(undefined);
  const { items: surahItems, loading } = useQuranSurahs(revelationFilter);
  const shown = filterQuranSurahs(surahItems, search);
  const handleBrowseSelect = (item: (typeof quranBrowseItems)[number]) => {
    setSearch("");
    if (item === "Makki / Madani") {
      // Toggle through: none → Makki → Madani → none
      setRevelationFilter(prev => prev === undefined ? "Makki" : prev === "Makki" ? "Madani" : undefined);
      return;
    }
    setRevelationFilter(undefined);
    go(quranBrowseMap[item]);
  };
  const activeCategory: (typeof quranBrowseItems)[number] =
    revelationFilter ? "Makki / Madani" : "Surah Directory";
  const summaryLabel = revelationFilter
    ? `${shown.length} ${revelationFilter} Surahs`
    : `${shown.length}`;

  return <main><DirectoryHeader go={go} title={interfaceAttributeText("Surah Directory")} text="Browse all 114 Surahs of the Holy Quran in their established order." /><QuranSearchAndBrowse search={search} setSearch={setSearch} activeCategory={activeCategory} onSelectCategory={handleBrowseSelect} />{revelationFilter && <div className="container"><div className="revelation-filter-bar"><span className="badge">{revelationFilter}</span><button className="clear-filter-btn" onClick={() => setRevelationFilter(undefined)}><LocalizedText text={"Clear filter"} /></button></div></div>}<section className="section container"><div className="directory-summary"><span>{loading ? <LocalizedText text={"Loading…"} /> : <>{summaryLabel} <LocalizedText text={"Surahs"} /></>}</span><small><LocalizedText text={"Ordered from Al-Fatihah to An-Nas"} /></small></div><SurahGrid go={go} items={shown} /></section></main>;
}

export function SurahRead({ go, isLoggedIn, onRequireAuthentication }: { go: (r: Route) => void; isLoggedIn: boolean; onRequireAuthentication: (action: string, contentType: string, contentId: string) => boolean }) {
  const navigate = useNavigate();
  const location = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const requestedSurah = Number(location.get("surah")) || 1;
  const initialSurah = Math.min(surahData.length, Math.max(1, requestedSurah));
  const requestedJuz = Number(location.get("juz"));
  const initialJuz = Number.isInteger(requestedJuz) && requestedJuz >= 1 && requestedJuz <= 30
    ? requestedJuz
    : null;
  const [surahNumber, setSurahNumber] = useState(initialSurah);
  const [juzNumber, setJuzNumber] = useState<number | null>(initialJuz);
  const [ayahNumber, setAyahNumber] = useState(() => {
    const chapter = surahData[initialSurah - 1];
    const requestedAyah = Number(location.get("ayah")) || 1;
    return Math.min(chapter[2], Math.max(1, requestedAyah));
  });
  const [selectedTranslation, setSelectedTranslation] = useState<TranslationLanguage>(() =>
    translationResources.find((resource) => resource.languageCode !== "ta" && resource.languageCode === getRouteQueryParam("translation"))?.languageCode || "en",
  );
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
    if (params.get("translation") === selectedTranslation) return;
    params.set("translation", selectedTranslation);
    navigate(`/surah-read?${params.toString()}`, { replace: true });
  }, [navigate, selectedTranslation]);
  const [navOpen, setNavOpen] = useState(false);
  const [translationOpen, setTranslationOpen] = useState(false);
  const [navTab, setNavTab] = useState("Surah");
  const [surahSearch, setSurahSearch] = useState("");
  const [translationSearch, setTranslationSearch] = useState("");
  const [mode, setMode] = useState<"verses" | "reading">("verses");
  const [infoOpen, setInfoOpen] = useState(false);
  const [highlightedAyah, setHighlightedAyah] = useState(0);
  const [notice, setNotice] = useState("");
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try { return readQuranBookmarks(); }
    catch { return []; }
  });
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [activeAudioTitle, setActiveAudioTitle] = useState("");
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const ayahRefs = useRef<Record<string, HTMLElement | null>>({});
  const pendingNavigation = useRef<string | null>(null);
  const pendingAudioSeek = useRef<number | null>(null);
  const lastPlaybackAyah = useRef<number | null>(null);
  const chapter = surahData[surahNumber - 1];
  const chapterNumber = surahNumber;
  const [arabicName, transliteratedName, ayahCount, revelation] = chapter;
  const {
    chapterContent,
    loading: chapterLoading,
    error: chapterError,
    retry: retryChapter,
  } = useQuranSurahAyahs(chapterNumber, selectedTranslation, juzNumber === null);
  const {
    ayahs: juzAyahs,
    loading: juzLoading,
    error: juzError,
    retry: retryJuz,
    apiConfigured: juzApiConfigured,
  } = useQuranJuzAyahs(juzNumber, selectedTranslation);
  const { items: juzEntries } = useQuranJuzList();
  const juzContentByReference = Object.fromEntries(juzAyahs.map((ayah) => [
    `${ayah.surahNumber}:${ayah.ayahNumber}`,
    {
      arabic: ayah.arabicText,
      translations: ayah.translation
        ? { [ayah.translation.languageCode]: ayah.translation.text }
        : {},
    },
  ]));
  const readerAyahRows = juzNumber === null
    ? hasApiUrl()
      ? Object.keys(chapterContent).map(Number).sort((left, right) => left - right).map((number) => ({
        surahNumber: chapterNumber,
        ayahNumber: number,
      }))
      : Array.from({ length: ayahCount }, (_, index) => ({
        surahNumber: chapterNumber,
        ayahNumber: index + 1,
      }))
    : juzAyahs.map(({ surahNumber: rowSurah, ayahNumber: rowAyah }) => ({
      surahNumber: rowSurah,
      ayahNumber: rowAyah,
    }));
  const filteredSurahs = surahData.map((item, index) => ({ item, number: index + 1 })).filter(({ item, number }) => `${number} ${item[0]} ${item[1]} ${surahMeanings[number - 1]}`.toLowerCase().includes(surahSearch.toLowerCase()));
  const filteredTranslations = translationResources.filter(resource => resource.languageCode !== "ta" && `${resource.language} ${resource.name} ${resource.attribution}`.toLowerCase().includes(translationSearch.toLowerCase()));
  const activeJuz = juzNumber ?? ([...juzStarts].reverse().find(start => chapterNumber > start.surah || (chapterNumber === start.surah && ayahNumber >= start.ayah))?.juz || 1);
  const mappedPage = mushafPageStarts.find(start => start.surah === chapterNumber && start.ayah === ayahNumber)?.page;

  useEffect(() => {
    try { writeQuranBookmarks(bookmarks); }
    catch { setNotice("Bookmarks are available for this session, but local storage is unavailable."); }
  }, [bookmarks]);

  useEffect(() => {
    const syncBookmarks = () => {
      try { setBookmarks(readQuranBookmarks()); }
      catch { setNotice("Bookmarks could not be loaded from this browser."); }
    };
    const showAuthActionFeedback = (event: Event) => setNotice((event as CustomEvent<string>).detail || "");
    window.addEventListener(QURAN_BOOKMARKS_UPDATED_EVENT, syncBookmarks);
    window.addEventListener("zikr-auth-action-feedback", showAuthActionFeedback);
    return () => {
      window.removeEventListener(QURAN_BOOKMARKS_UPDATED_EVENT, syncBookmarks);
      window.removeEventListener("zikr-auth-action-feedback", showAuthActionFeedback);
    };
  }, []);

  useEffect(() => {
    const target = pendingNavigation.current;
    if (!target) return;
    const node = document.getElementById(`ayah-${target.replace(":", "-")}`);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    pendingNavigation.current = null;
    const timeout = window.setTimeout(() => setHighlightedAyah(0), 2200);
    return () => window.clearTimeout(timeout);
  }, [chapterNumber, ayahNumber]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
      const nextSurah = Math.min(surahData.length, Math.max(1, Number(params.get("surah")) || 1));
      const nextAyah = Math.min(surahData[nextSurah - 1][2], Math.max(1, Number(params.get("ayah")) || 1));
      const nextJuzValue = Number(params.get("juz"));
      const nextJuz = Number.isInteger(nextJuzValue) && nextJuzValue >= 1 && nextJuzValue <= 30
        ? nextJuzValue
        : null;
      setJuzNumber(nextJuz);
      const nextTranslation = params.get("translation");
      setSurahNumber(nextSurah);
      setAyahNumber(nextAyah);
      setSelectedTranslation(translationResources.some((resource) => resource.languageCode !== "ta" && resource.languageCode === nextTranslation) ? nextTranslation as TranslationLanguage : "en");
      setHighlightedAyah(nextAyah);
      pendingNavigation.current = `${nextSurah}:${nextAyah}`;
      audioRef.current?.pause();
      if (audioRef.current) { audioRef.current.removeAttribute("src"); audioRef.current.load(); }
      setActiveAudioTitle("");
      setAudioUnavailable(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!navOpen && !translationOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setNavOpen(false); setTranslationOpen(false); }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [navOpen, translationOpen]);

  const updateLocation = (nextSurah: number, nextAyah: number, replace = false) => {
    setJuzNumber(null);
    const params = new URLSearchParams({ surah: String(nextSurah), ayah: String(nextAyah), translation: selectedTranslation });
    navigate(`/surah-read?${params.toString()}`, { replace });
  };
  const stopAudio = () => {
    const player = audioRef.current;
    player?.pause();
    if (player) { player.removeAttribute("src"); player.load(); }
    setAudioPlaying(false);
    setAudioProgress(0);
    setAudioDuration(0);
    setActiveAudioTitle("");
    setAudioUnavailable(false);
    pendingAudioSeek.current = null;
    lastPlaybackAyah.current = null;
  };
  const selectSurah = (nextSurah: number) => {
    const nextChapter = surahData[nextSurah - 1];
    setSurahNumber(nextSurah);
    setAyahNumber(1);
    setHighlightedAyah(1);
    pendingNavigation.current = `${nextSurah}:1`;
    stopAudio();
    setNotice("");
    setNavOpen(false);
    updateLocation(nextSurah, 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!nextChapter) setNotice("That Surah is not available in the local catalog.");
  };
  const selectVerseSurah = (nextSurah: number) => {
    const nextAyah = Math.min(ayahNumber, surahData[nextSurah - 1][2]);
    setSurahNumber(nextSurah);
    setAyahNumber(nextAyah);
    setHighlightedAyah(nextAyah);
    pendingNavigation.current = `${nextSurah}:${nextAyah}`;
    stopAudio();
    updateLocation(nextSurah, nextAyah);
  };
  const navigateToAyah = (nextSurah: number, nextAyah: number) => {
    if (!Number.isInteger(nextSurah) || !Number.isInteger(nextAyah) || nextSurah < 1 || nextSurah > surahData.length || nextAyah < 1 || nextAyah > surahData[nextSurah - 1][2]) {
      return;
    }
    setSurahNumber(nextSurah);
    setAyahNumber(nextAyah);
    setHighlightedAyah(nextAyah);
    pendingNavigation.current = `${nextSurah}:${nextAyah}`;
    setNavOpen(false);
    updateLocation(nextSurah, nextAyah);
    if (nextSurah === chapterNumber) {
      window.requestAnimationFrame(() => document.getElementById(`ayah-${nextSurah}-${nextAyah}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }
  };
  const toggleBookmark = (reference: number, referenceSurah: number, referenceAyah: number) => {
    if (!isLoggedIn) {
      onRequireAuthentication("bookmark-quran", "quran-ayah", `${referenceSurah}:${referenceAyah}`);
      return;
    }
    setBookmarks(current => current.includes(reference) ? current.filter(item => item !== reference) : [...current, reference]);
  };
  const ayahTextFor = (number: number, referenceSurah = chapterNumber) => {
    const content = juzNumber === null
      ? chapterContent[number]
      : juzContentByReference[`${referenceSurah}:${number}`];
    const translation = content?.translations[selectedTranslation];
    return { content, translation };
  };
  const copyAyah = async (number: number, referenceSurah = chapterNumber) => {
    const { content, translation } = ayahTextFor(number, referenceSurah);
    const text = [content?.arabic, translation].filter(Boolean).join("\n");
    if (!text) { setNotice("This Ayah has no text in the local mock dataset to copy."); return; }
    try { await navigator.clipboard.writeText(text); setNotice(`${referenceSurah}:${number} copied.`); }
    catch { setNotice("Clipboard access is unavailable in this browser."); }
  };
  const shareAyah = async (number: number, referenceSurah = chapterNumber) => {
    const { content, translation } = ayahTextFor(number, referenceSurah);
    const text = [content?.arabic, translation, `${referenceSurah}:${number}`].filter(Boolean).join("\n");
    if (!text) { setNotice("This Ayah has no text in the local mock dataset to share."); return; }
    try {
      if (navigator.share) await navigator.share({ title: `${referenceSurah}:${number} - ${surahData[referenceSurah - 1][1]}`, text });
      else { await navigator.clipboard.writeText(text); setNotice("Ayah copied for sharing."); }
    } catch { setNotice("Sharing was cancelled or is unavailable."); }
  };
  const audioTimingFor = (surah: number, ayah: number) => audioSources[surah]?.timings.find(segment => segment.ayahNumber === ayah);
  const startAudio = (number?: number, targetSurah = chapterNumber) => {
    const chapterAudio = audioSources[targetSurah];
    const verseAudio = number ? ayahAudioSources[`${targetSurah}:${number}`] : undefined;
    const timing = number ? audioTimingFor(targetSurah, number) : undefined;
    const source = verseAudio?.source || chapterAudio?.source || "";
    const targetAyah = number || 1;
    setActiveAudioTitle(number ? `${surahData[targetSurah - 1][1]} · Ayah ${targetAyah}` : surahData[targetSurah - 1][1]);
    setAudioUnavailable(!source);
    setAudioProgress(0);
    setAudioDuration(0);
    setNotice("");
    lastPlaybackAyah.current = targetAyah;
    if (!source) {
      audioRef.current?.pause();
      if (audioRef.current) { audioRef.current.removeAttribute("src"); audioRef.current.load(); }
      setAudioPlaying(false);
      setNotice(number ? `Recitation audio for ${targetSurah}:${number} is not available locally.` : "Surah recitation audio is not available locally.");
      return;
    }
    setSurahNumber(targetSurah);
    setAyahNumber(targetAyah);
    setHighlightedAyah(targetAyah);
    pendingNavigation.current = `${targetSurah}:${targetAyah}`;
    updateLocation(targetSurah, targetAyah, true);
    const player = audioRef.current;
    if (!player) { setNotice("The audio player is unavailable in this browser."); return; }
    player.pause();
    player.src = source;
    player.volume = volume;
    pendingAudioSeek.current = verseAudio ? 0 : number ? timing?.startTime ?? 0 : 0;
    if (player.readyState >= 1) {
      player.currentTime = pendingAudioSeek.current;
      pendingAudioSeek.current = null;
    }
    player.load();
    void player.play().catch(() => { setAudioPlaying(false); setNotice("The configured recitation could not be played."); });
  };
  const handleAudioTimeUpdate = (player: HTMLAudioElement) => {
    setAudioProgress(player.currentTime);
    if (Number.isFinite(player.duration)) setAudioDuration(player.duration);
    const segment = audioSources[chapterNumber]?.timings.find(item => player.currentTime >= item.startTime && player.currentTime < item.endTime);
    if (!segment || segment.ayahNumber === lastPlaybackAyah.current) return;
    lastPlaybackAyah.current = segment.ayahNumber;
    setAyahNumber(segment.ayahNumber);
    setHighlightedAyah(segment.ayahNumber);
    pendingNavigation.current = `${chapterNumber}:${segment.ayahNumber}`;
    updateLocation(chapterNumber, segment.ayahNumber, true);
  };
  const audioSegments = Object.values(audioSources).flatMap(metadata => metadata.timings).sort((left, right) => left.surahNumber - right.surahNumber || left.ayahNumber - right.ayahNumber);
  const currentAudioSegmentIndex = audioSegments.findIndex(segment => segment.surahNumber === chapterNumber && segment.ayahNumber === ayahNumber);
  const moveAudioByAyah = (direction: -1 | 1) => {
    const target = audioSegments[currentAudioSegmentIndex + direction];
    if (target) startAudio(target.ayahNumber, target.surahNumber);
  };
  const seekAudio = (time: number) => {
    const player = audioRef.current;
    if (!player || !Number.isFinite(player.duration)) return;
    player.currentTime = Math.min(player.duration, Math.max(0, time));
    handleAudioTimeUpdate(player);
  };
  const selectJuz = (juz: number) => {
    const entry = juzEntries.find(item => item.number === juz);
    if (!entry) return;
    setJuzNumber(juz);
    setSurahNumber(entry.startSurah);
    setAyahNumber(entry.startAyah);
    setHighlightedAyah(entry.startAyah);
    setNavOpen(false);
    stopAudio();
    navigate(`/${getJuzReaderRoute(entry)}&translation=${selectedTranslation}`);
  };
  const selectPage = (page: number) => {
    const start = mushafPageStarts.find(item => item.page === page);
    if (start) navigateToAyah(start.surah, start.ayah);
  };

  return <main className="quran-reading-page">
    <div className="quran-reader-top">
      <button className="reader-current-surah" onClick={() => { setNavTab(juzNumber === null ? "Surah" : "Juz"); setNavOpen(true); }} aria-label={interfaceAttributeText(juzNumber === null ? "Open Surah navigation" : "Open Juz navigation")}>{juzNumber === null ? `${String(chapterNumber).padStart(2, "0")} · ${transliteratedName}` : `Juz ${juzNumber}`}<span>⌄</span></button>
      <div className="reader-location">{mappedPage ? `Page ${mappedPage}` : "Page mapping unavailable"}<i /><LocalizedText text={"Juz"} trailing=" " />{activeJuz} <LocalizedText text={"/ Hizb mapping unavailable"} /></div>
      <div className="reader-modes" role="group" aria-label={interfaceAttributeText("Reader mode")}><button className={mode === "verses" ? "active" : ""} onClick={() => setMode("verses")}><LocalizedText text={"Verse by Verse"} /></button><button className={mode === "reading" ? "active" : ""} onClick={() => setMode("reading")}><LocalizedText text={"Reading"} /></button></div>
    </div>
    <div className="quran-reader-body">
      <section className="quran-reader-content">
        <div className="reader-toolbar-actions"><button className="reader-nav-open" onClick={() => { setNavTab("Surah"); setNavOpen(true); }}><Icon name="menu" size={17} /> <LocalizedText text={"Browse"} /></button><button className="reader-translation-open" onClick={() => setTranslationOpen(true)}><LocalizedText text={"Translation:"} trailing=" " />{translationResources.find(item => item.languageCode === selectedTranslation)?.language}<span>⌄</span></button></div>
        <section className="reader-chapter-card">
          {juzNumber === null && <strong className="reader-chapter-arabic" lang="ar" dir="rtl">{arabicName}</strong>}
          <div className="reader-chapter-copy">{juzNumber === null ? <><span><LocalizedText text={"Surah"} trailing=" " />{chapterNumber}</span><h1>{transliteratedName} <em>{surahMeanings[chapterNumber - 1]}</em></h1><p>{revelation} • {ayahCount} <LocalizedText text={hasApiUrl() ? "Ayat" : "Ayat • Local reader mock data"} /></p></> : <><span><LocalizedText text={"Juz / Para"} trailing=" " />{juzNumber}</span><h1><LocalizedText text={"Para"} trailing=" " />{juzNumber}</h1><p>{juzEntries.find((entry) => entry.number === juzNumber)?.startRef || "Boundary metadata unavailable"}{juzEntries.find((entry) => entry.number === juzNumber)?.endRef ? ` – ${juzEntries.find((entry) => entry.number === juzNumber)?.endRef}` : ""}</p></>}</div>
          <div className="reader-chapter-actions"><button onClick={() => startAudio()}><Icon name="play" size={15} /> <LocalizedText text={"Listen"} /></button><button onClick={() => setInfoOpen(open => !open)}><span aria-hidden="true">ⓘ</span> <LocalizedText text={"Info"} /></button><button className="translation-desktop" onClick={() => setTranslationOpen(true)}><LocalizedText text={"Translation:"} trailing=" " />{translationResources.find(item => item.languageCode === selectedTranslation)?.name} <span>⌄</span></button></div>
        </section>
        {infoOpen && <div className="reader-info-panel"><b><LocalizedText text={juzNumber === null ? "About this Surah" : "About this Juz"} /></b>{juzNumber === null ? <><span><LocalizedText text={"Chapter"} trailing=" " />{chapterNumber} <LocalizedText text={"in canonical order"} /></span><span>{revelation} <LocalizedText text={"revelation •"} trailing=" " />{ayahCount} <LocalizedText text={"Ayat"} /></span><span><LocalizedText text={"English meaning:"} trailing=" " />{surahMeanings[chapterNumber - 1]}</span></> : <span><LocalizedText text={"Juz verses follow canonical Surah and Ayah order."} /></span>}</div>}
        {juzNumber !== null && juzLoading && <div className="reader-data-note" role="status"><Icon name="book" size={16} /><p><LocalizedText text={"Loading published Ayahs for this Juz…"} /></p></div>}
        {juzNumber !== null && juzError && <div className="reader-data-note" role="alert"><Icon name="book" size={16} /><p><LocalizedText text={"Juz Ayahs could not be loaded."} /> {juzError} <button className="clear-filter-btn" onClick={retryJuz}><LocalizedText text={"Retry"} /></button></p></div>}
        {juzNumber !== null && !juzApiConfigured && <div className="reader-data-note" role="note"><Icon name="book" size={16} /><p><LocalizedText text={"Connect the Quran API to read Juz ranges. Local Quran data is an incomplete prototype sample."} /></p></div>}
        {juzNumber === null && chapterLoading && <div className="reader-data-note" role="status"><Icon name="book" size={16} /><p><LocalizedText text={"Loading published Ayahs…"} /></p></div>}
        {juzNumber === null && chapterError && <div className="reader-data-note" role="alert"><Icon name="book" size={16} /><p><LocalizedText text={"Ayahs could not be loaded."} /> {chapterError} <button className="clear-filter-btn" onClick={retryChapter}><LocalizedText text={"Retry"} /></button></p></div>}
        {juzNumber === null && <div className="reader-data-note" role="note"><Icon name="book" size={16} /><p><LocalizedText text={hasApiUrl() ? "Only published Ayahs returned by the Quran service are shown." : "Ayah numbering follows chapter metadata. Local text is only a prototype sample and is not a complete Quran."} /></p></div>}
        <div className={`reader-ayah-list ${mode === "reading" ? "reading-mode" : "verse-mode"}`}>
          {readerAyahRows.map(({ surahNumber: rowSurah, ayahNumber: number }, index) => {
            const reference = rowSurah * 1000 + number;
            const { content, translation } = ayahTextFor(number, rowSurah);
            const resource = translationResources.find(item => item.languageCode === selectedTranslation);
            const isBookmarked = bookmarks.includes(reference);
            const priorSurah = readerAyahRows[index - 1]?.surahNumber;
            return <article id={`ayah-${rowSurah}-${number}`} key={`${rowSurah}:${number}`} className={`reader-ayah ${highlightedAyah === number && chapterNumber === rowSurah ? "is-highlighted" : ""} ${!content ? "content-unavailable" : ""}`}>
              {juzNumber !== null && rowSurah !== priorSurah && <p className="reader-ayah-context"><LocalizedText text={"Surah"} trailing=" " />{rowSurah} · {getSurahLabel(rowSurah)}</p>}
              <div className="reader-ayah-actions"><div><span className="ayah-reference">{rowSurah}:{number}</span><button aria-label={`Play Ayah ${rowSurah}:${number}`} onClick={() => startAudio(number, rowSurah)}>{audioPlaying && ayahNumber === number && chapterNumber === rowSurah ? <span>Ⅱ</span> : <Icon name="play" size={17} />}</button><button aria-label={`${isBookmarked ? "Remove bookmark from" : "Bookmark"} Ayah ${rowSurah}:${number}`} className={isBookmarked ? "bookmarked" : ""} onClick={() => toggleBookmark(reference, rowSurah, number)}><Icon name="heart" size={17} /></button></div><div><button aria-label={`Copy Ayah ${rowSurah}:${number}`} onClick={() => void copyAyah(number, rowSurah)}><Icon name="copy" size={17} /></button><button aria-label={`Share Ayah ${rowSurah}:${number}`} onClick={() => void shareAyah(number, rowSurah)}><Icon name="share" size={17} /></button></div></div>
              {content?.arabic ? <p className="reader-arabic" lang="ar" dir="rtl" translate="no">{content.arabic}</p> : <p className="ayah-unavailable"><LocalizedText text={"Quran text unavailable in the local mock data."} /></p>}
              {translation ? <p className={`reader-translation-text language-${selectedTranslation}`} lang={selectedTranslation} dir={selectedTranslation === "ur" ? "rtl" : "ltr"}>{translation}</p> : <p className="translation-unavailable">{content ? `No ${resource?.language || "selected language"} translation is available for this Ayah.` : "Translation unavailable for this Ayah in the local mock data."}</p>}
              {content && <small className="content-attribution"><LocalizedText text={"Existing prototype sample • translation attribution not recorded"} /></small>}
            </article>;
          })}
          {juzNumber !== null && !juzLoading && !juzError && juzApiConfigured && readerAyahRows.length === 0 && <div className="empty"><Icon name="book" size={32} /><h3><LocalizedText text={"No published Ayahs are available for this Juz."} /></h3><p><LocalizedText text={"Quran content coverage is incomplete or no verses in this range are published yet."} /></p></div>}
          {juzNumber === null && hasApiUrl() && !readerAyahRows.length && <div className="empty"><Icon name="book" size={32} /><h3><LocalizedText text={"No published Ayahs are available for this Surah."} /></h3></div>}
        </div>
        <nav className="reader-surah-pager" aria-label={interfaceAttributeText("Surah navigation")}><button disabled={chapterNumber === 1} onClick={() => selectSurah(chapterNumber - 1)}><LocalizedText text={"← Previous Surah"} /></button><button onClick={() => { setNavTab("Surah"); setNavOpen(true); }}><LocalizedText text={"All Surahs"} /></button><button disabled={chapterNumber === surahData.length} onClick={() => selectSurah(chapterNumber + 1)}><LocalizedText text={"Next Surah →"} /></button></nav>
      </section>
    </div>
    {notice && <div className="reader-notice" role="status"><span><LocalizedText text={notice} /></span><button aria-label={interfaceAttributeText("Dismiss message")} onClick={() => setNotice("")}><Icon name="x" size={15} /></button></div>}

    {navOpen && <div className="quran-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setNavOpen(false); }}><aside className="quran-drawer quran-nav-drawer" role="dialog" aria-modal="true" aria-label={interfaceAttributeText("Quran navigation")}>
      <div className="drawer-heading"><div><small><LocalizedText text={"QURAN NAVIGATION"} /></small><h2>{String(chapterNumber).padStart(2, "0")} · {transliteratedName}</h2></div><button aria-label={interfaceAttributeText("Close navigation")} onClick={() => setNavOpen(false)}><Icon name="x" /></button></div>
      <div className="drawer-tabs" role="tablist" aria-label={interfaceAttributeText("Navigate by")}><button role="tab" aria-selected={navTab === "Surah"} className={navTab === "Surah" ? "active" : ""} onClick={() => setNavTab("Surah")}><LocalizedText text={"Surah"} /></button><button role="tab" aria-selected={navTab === "Verse"} className={navTab === "Verse" ? "active" : ""} onClick={() => setNavTab("Verse")}><LocalizedText text={"Verse"} /></button><button role="tab" aria-selected={navTab === "Juz"} className={navTab === "Juz" ? "active" : ""} onClick={() => setNavTab("Juz")}><LocalizedText text={"Juz"} /></button><button role="tab" aria-selected={navTab === "Page"} className={navTab === "Page" ? "active" : ""} onClick={() => setNavTab("Page")}><LocalizedText text={"Page"} /></button></div>
      {navTab === "Surah" && <><label className="drawer-search"><Icon name="search" size={17} /><input autoFocus value={surahSearch} onChange={event => setSurahSearch(event.target.value)} placeholder={interfaceAttributeText("Search Surah")} /></label><div className="surah-drawer-list">{filteredSurahs.map(({ item, number }) => <button key={number} className={chapterNumber === number ? "selected" : ""} onClick={() => selectSurah(number)}><span>{number}</span><b>{item[1]}</b><small>{surahMeanings[number - 1]}</small><strong lang="ar" dir="rtl">{item[0]}</strong></button>)}{!filteredSurahs.length && <p className="drawer-empty"><LocalizedText text={"No Surahs match that search."} /></p>}</div></>}
      {navTab === "Verse" && <div className="verse-navigation">
        <section className="verse-surah-column" aria-label={interfaceAttributeText("Select Surah")}>
          <label className="drawer-search"><Icon name="search" size={17} /><input autoFocus value={surahSearch} onChange={event => setSurahSearch(event.target.value)} placeholder={interfaceAttributeText("Search Surah")} /></label>
          <div className="verse-surah-list">{filteredSurahs.map(({ item, number }) => <button key={number} className={chapterNumber === number ? "selected" : ""} aria-current={chapterNumber === number ? "true" : undefined} onClick={() => selectVerseSurah(number)}><span>{number}</span><b>{item[1]}</b></button>)}{!filteredSurahs.length && <p className="drawer-empty"><LocalizedText text={"No Surahs match that search."} /></p>}</div>
        </section>
        <section className="verse-ayah-column" aria-label={`Ayat in ${transliteratedName}`}>
          <h3><LocalizedText text={"Ayah"} trailing=" " /><small>{chapterNumber}. {transliteratedName}</small></h3>
          <div className="verse-ayah-list">{Array.from({ length: ayahCount }, (_, index) => index + 1).map(number => <button key={`${chapterNumber}:${number}`} className={ayahNumber === number ? "selected" : ""} aria-current={ayahNumber === number ? "true" : undefined} onClick={() => navigateToAyah(chapterNumber, number)}>{number}</button>)}</div>
        </section>
      </div>}
      {navTab === "Juz" && <><p className="drawer-description"><LocalizedText text={"Select a Juz to read its published verses across Surah boundaries."} /></p><div className="juz-drawer-list">{juzEntries.map(entry => <button key={entry.number} onClick={() => selectJuz(entry.number)} className={activeJuz === entry.number ? "selected" : ""}><span><LocalizedText text={"Juz"} trailing=" " />{entry.number}</span><small><LocalizedText text={"Starts at"} trailing=" " />{entry.startRef} · {getSurahLabel(entry.startSurah)}</small><Icon name="chevron" size={16} /></button>)}</div>{!juzEntries.length && <p className="drawer-empty"><LocalizedText text={"No Juz metadata is available."} /></p>}</>}
      {navTab === "Page" && <div className="page-navigation"><h3><LocalizedText text={"Madani Mushaf sample mapping"} /></h3><p><LocalizedText text={"Only two local page-start mappings are included. This is not a complete page index."} /></p>{mushafPageStarts.map(start => <button key={start.page} className={mappedPage === start.page ? "selected" : ""} onClick={() => selectPage(start.page)}><span><LocalizedText text={"Page"} trailing=" " />{start.page}</span><small><LocalizedText text={"Starts at"} trailing=" " />{start.surah}:{start.ayah} · {surahData[start.surah - 1][1]}</small><Icon name="chevron" size={16} /></button>)}</div>}
    </aside></div>}

    {translationOpen && <div className="quran-drawer-backdrop translation-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setTranslationOpen(false); }}><aside className="quran-drawer translation-drawer" role="dialog" aria-modal="true" aria-label={interfaceAttributeText("Translations")}><div className="drawer-heading"><div><small><LocalizedText text={"DISPLAY SETTINGS"} /></small><h2><LocalizedText text={"Translations"} /></h2></div><button aria-label={interfaceAttributeText("Close translations")} onClick={() => setTranslationOpen(false)}><Icon name="x" /></button></div><label className="drawer-search"><Icon name="search" size={17} /><input autoFocus value={translationSearch} onChange={event => setTranslationSearch(event.target.value)} placeholder={interfaceAttributeText("Search translations")} /></label><div className="translation-options">{[...new Set(filteredTranslations.map(resource => resource.language))].map(language => <section key={language}><h3>{language}</h3>{filteredTranslations.filter(resource => resource.language === language).map(resource => <label key={resource.id} className={`translation-option ${selectedTranslation === resource.languageCode ? "selected" : ""}`}><input type="radio" name="translation" checked={selectedTranslation === resource.languageCode} onChange={() => setSelectedTranslation(resource.languageCode)} /><span><b>{resource.name}</b><small>{resource.attribution}</small></span><span className="translation-check">{selectedTranslation === resource.languageCode ? "Selected" : ""}</span></label>)}</section>)}{!filteredTranslations.length && <p className="drawer-empty"><LocalizedText text={"No translations match that search."} /></p>}</div><button className="drawer-done" onClick={() => setTranslationOpen(false)}><LocalizedText text={"Done"} /></button></aside></div>}

    <audio
      ref={audioRef}
      preload="none"
      onPlay={() => setAudioPlaying(true)}
      onPause={() => setAudioPlaying(false)}
      onLoadedMetadata={event => {
        const player = event.currentTarget;
        setAudioDuration(Number.isFinite(player.duration) ? player.duration : 0);
        if (pendingAudioSeek.current !== null) {
          player.currentTime = pendingAudioSeek.current;
          pendingAudioSeek.current = null;
        }
      }}
      onTimeUpdate={event => handleAudioTimeUpdate(event.currentTarget)}
      onEnded={() => setAudioPlaying(false)}
      onError={() => {
        setAudioPlaying(false);
        setAudioUnavailable(true);
        setNotice("The configured recitation could not be loaded.");
      }}
    />
    {activeAudioTitle && <div className="quran-bottom-player" aria-label={interfaceAttributeText("Quran audio player")}>
      <div className="quran-player-track"><b>{activeAudioTitle}</b><small>{audioUnavailable ? "Audio unavailable · no playable source configured" : audioSources[chapterNumber]?.reciter || ayahAudioSources[`${chapterNumber}:${ayahNumber}`]?.reciter || "Quran recitation"}</small></div>
      <button aria-label={interfaceAttributeText("Previous Ayah")} title={interfaceAttributeText("Previous Ayah")} disabled={audioUnavailable || currentAudioSegmentIndex <= 0} onClick={() => moveAudioByAyah(-1)}>‹</button>
      <button aria-label={audioPlaying ? "Pause recitation" : "Play recitation"} disabled={audioUnavailable} onClick={() => {
        const player = audioRef.current;
        if (!player) return;
        if (audioPlaying) player.pause();
        else void player.play().catch(() => setNotice("The configured recitation could not be played."));
      }}>{audioPlaying ? "Ⅱ" : <Icon name="play" />}</button>
      <button aria-label={interfaceAttributeText("Next Ayah")} title={interfaceAttributeText("Next Ayah")} disabled={audioUnavailable || currentAudioSegmentIndex < 0 || currentAudioSegmentIndex >= audioSegments.length - 1} onClick={() => moveAudioByAyah(1)}>›</button>
      <input type="range" min="0" max={audioDuration} value={Math.min(audioProgress, audioDuration)} disabled={audioUnavailable || !audioDuration} onChange={event => seekAudio(Number(event.target.value))} aria-label={interfaceAttributeText("Recitation progress")} />
      <span className="quran-player-time">{`${Math.floor(audioProgress / 60)}:${String(Math.floor(audioProgress % 60)).padStart(2, "0")}`} / {audioDuration ? `${Math.floor(audioDuration / 60)}:${String(Math.floor(audioDuration % 60)).padStart(2, "0")}` : "--:--"}</span>
      <label className="quran-player-volume" title={interfaceAttributeText("Volume")}><Icon name="volume" size={17} /><input type="range" min="0" max="1" step="0.05" value={volume} disabled={audioUnavailable} onChange={event => { const nextVolume = Number(event.target.value); setVolume(nextVolume); if (audioRef.current) audioRef.current.volume = nextVolume; }} aria-label={interfaceAttributeText("Volume")} /></label>
      <button aria-label={interfaceAttributeText("Close player")} onClick={stopAudio}>×</button>
    </div>}
  </main>;
}

export function ParaPage({ go }: { go: (r: Route) => void }) {
  const [search, setSearch] = useState("");
  const { items, loading, error, retry, apiConfigured } = useQuranJuzList();
  const paraEntries = items.map((item) => ({
    ...item,
    label: `Para ${item.number}`,
    surahName: getSurahLabel(item.startSurah),
  }));
  const shown = filterQuranParas(paraEntries, search);
  const handleBrowseSelect = (item: (typeof quranBrowseItems)[number]) => {
    setSearch("");
    go(quranBrowseMap[item]);
  };

  return <main><DirectoryHeader go={go} title={interfaceAttributeText("Para Directory")} text="Browse the Holy Quran through its 30 traditional Juz divisions." /><QuranSearchAndBrowse search={search} setSearch={setSearch} activeCategory="Para Directory" onSelectCategory={handleBrowseSelect} /><section className="section container"><div className="directory-summary"><span>{loading ? <LocalizedText text={"Loading…"} /> : `${items.length} Para / Juz`}</span><small><LocalizedText text={"Listed in Quran order"} /></small></div>{error && <div className="empty" role="alert"><h3><LocalizedText text={"Juz could not be loaded."} /></h3><p>{error}</p><button className="btn btn-primary" onClick={retry}><LocalizedText text={"Retry"} /></button></div>}{!error && <><div className="para-grid">{shown.map((item) => <button key={item.number} onClick={() => go(getJuzReaderRoute(item))}><span>{String(item.number).padStart(2, "0")}</span><div><b>{item.label}</b><small><LocalizedText text={"Juz"} trailing=" " />{item.number} • {item.surahName} • {item.startRef}</small></div>{item.arabicName && <strong lang="ar" dir="rtl">{item.arabicName}</strong>}<Icon name="chevron" /></button>)}</div>{!loading && !shown.length && <div className="empty"><Icon name="search" size={32} /><h3><LocalizedText text={search ? "No Para match that search." : "No Para are available."} /></h3><p>{apiConfigured ? <LocalizedText text={"No Juz metadata was returned by the Quran service."} /> : <LocalizedText text={"Connect the Quran service to load complete Juz boundaries and reading content."} />}</p></div>}</>}</section></main>;
}

export function QuranTopics({ go }: { go: (r: Route) => void }) {
  const t = useInterfaceText();
  const [search, setSearch] = useState("");
  const selectedView = getRouteQueryParam("view") === "quotes" ? "Quranic Quotes" : "Topics";
  const handleBrowseSelect = (item: (typeof quranBrowseItems)[number]) => {
    setSearch("");
    go(quranBrowseMap[item]);
  };
  const topics = [
    "Patience & Perseverance",
    "Mercy & Forgiveness",
    "Gratitude",
    "Prayer & Remembrance",
    "Family & Community",
    "Knowledge & Reflection",
  ];
  const shown = topics.filter((topic) => topic.toLowerCase().includes(search.trim().toLowerCase()));

  return <main><DirectoryHeader go={go} title="Quranic Topics & Quotes" text="Explore an editorial index designed to guide thoughtful study. Published content must use verified source text and attribution." /><QuranSearchAndBrowse search={search} setSearch={setSearch} activeCategory={selectedView as (typeof quranBrowseItems)[number]} onSelectCategory={handleBrowseSelect} /><section className="section container"><div className="topic-grid">{shown.map((x, i) => <button key={x}><span>0{i + 1}</span><b>{t(x)}</b><small><LocalizedText text={"Curated references"} /></small><Icon name="arrow" /></button>)}{!shown.length && <div className="empty"><Icon name="search" size={32} /><h3><LocalizedText text={"No Quran topic matches that search."} /></h3><p><LocalizedText text={"Try a different topic title or phrase."} /></p></div>}</div><div className="notice"><Icon name="book" /><div><b><LocalizedText text={"Respectful by design"} /></b><p><LocalizedText text={"Quranic quotations will only be displayed after verification against authoritative source data and translation attribution."} /></p></div></div></section></main>;
}
