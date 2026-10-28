import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Outlet, Route as RouterRoute, Routes, useLocation, useNavigate } from "react-router-dom";
import { InterfaceLanguageContext, interfaceAttributeText, LocalizedText, useInterfaceLanguage, useInterfaceText } from "./app/providers/interfaceLanguage";
import { photos } from "./app/config/media";
import { isAvailableDownloadUrl } from "./app/utils/downloadUrl";
import { Footer } from "./components/layout/Footer";
import { Header } from "./components/layout/Header";
import { Btn, Icon, SectionThemeControl, type IconName, Logo } from "./components/ui";
import { Reveal } from "./components/common/Reveal";
import { SectionHead } from "./components/common/SectionHead";
import { Breadcrumbs, CategoryBrowseControl, DirectoryHeader, PageHero, SearchBox, Tabs } from "./components/common/PagePrimitives";
import { BackButton } from "./components/common/BackButton";
import { Home } from "./features/home/pages/Home";
import { ServicesPage } from "./features/services-page/pages/ServicesPage";
import { AboutPage } from "./features/about/pages/AboutPage";
import { ContactPage } from "./features/contact/pages/ContactPage";
import { AuthPage } from "./features/auth/pages/AuthPage";
import { AudioPage, AudioDetail } from "./features/audio/pages/AudioPages";
import { Ebooks, BookDetail, BookReader } from "./features/ebooks/pages/EbookPages";
import { AudioCard, getAudioCategoryLabel } from "./features/audio/components/AudioCard";
import { BookCard } from "./features/ebooks/components/BookCard";
import { LyricTitle } from "./features/lyrics/components/LyricTitle";
import { ReciterDisclosure } from "./features/lyrics/components/ReciterDisclosure";
import { YouTubeVideoGrid } from "./features/lyrics/components/YouTubeVideoGrid";
import { LyricsPage, lyricsRoutePaths } from "./features/lyrics/pages/LyricsPage";
import { QuranHome, ParaPage, QuranTopics, SurahDirectory, SurahRead } from "./features/quran/pages/QuranPages";
import { formatLyricDate, getLyricArtistNames, getLyricBookName, getLyricCategoryNames, getLyricWriterName } from "./features/lyrics/utils/lyricsPresentation";
import { getRouteQueryParam } from "./app/utils/getRouteQueryParam";
import { lyricsApi } from "./features/lyrics/services/lyricsApiService.js";
import type { ApiPublicLyric } from "./features/lyrics/services/lyricsApiService.js";
import { audioCategories, audioLibrary, filterAudioLibrary, getAudioById } from "./audioData";
import { ebookCategories, ebookLibrary, filterEbooks, getEbookById } from "./bookData";
import { clearPendingAction, createPendingAction, readPendingAction, savePendingAction, safeReturnTo } from "./authActions.js";
import { adminAuth } from "./features/auth/services/adminAuth.js";
import { FONT_SCALE_KEY, GLOBAL_LANGUAGE_KEY, THEME_KEY, readPreference, translateInterface } from "./interfacePreferences";
import { lookupWordMeanings } from "./wordMeaningService";
import { surahData } from "./features/quran/data/surahMetadata";
import { toggleStoredQuranBookmark } from "./features/quran/services/quranBookmarks";
import { lyricSubjects } from "./lyricsData";

type Route = string;
const LYRICS_THEME_KEY = "zikr-lyrics-theme";
const QURAN_THEME_KEY = "zikr-quran-theme";
const quranRoutePaths = ["quran", "surahs", "surah-read", "para", "quran-topics"];

const AdminContentPage = lazy(() => import("./features/admin/pages/AdminContentPage").then((module) => ({ default: module.AdminContentPage })));
const LyricDocumentView = lazy(() => import("./features/lyrics/components/LyricRichText").then((module) => ({ default: module.LyricDocumentView })));

function PublicLayout({ route, routePath, go, language, setLanguage, fontScale, setFontScale, theme, setTheme }: { route: Route; routePath: string; go: (r: Route) => void; language: string; setLanguage: (value: string) => void; fontScale: number; setFontScale: (value: number) => void; theme: string; setTheme: (value: string) => void }) {
  return <>
  <Header route={route} go={go} language={language} setLanguage={setLanguage} fontScale={fontScale} setFontScale={setFontScale} />
  {routePath !== "home" && <div className="app-page-toolbar"><div className="container app-page-toolbar-inner"><BackButton routePath={routePath} />{(lyricsRoutePaths.includes(routePath) || routePath === "lyric-detail" || quranRoutePaths.includes(routePath)) && <SectionThemeControl theme={theme} setTheme={setTheme} />}</div></div>}
  <Outlet />
  <Footer go={go} />
  </>;
}

function BareLayout({ routePath }: { routePath: string }) {
  return <>{routePath === "book-reader" && <div className="app-page-toolbar"><div className="container app-page-toolbar-inner"><BackButton routePath={routePath} /></div></div>}<Outlet /></>;
}

function NotFound({ go }: { go: (r: Route) => void }) {
  return <main className="reading-bg"><div className="container narrow"><div className="empty"><h1>Page not found</h1><p><LocalizedText text={"The page you requested could not be found."} /></p><button className="btn btn-primary" onClick={() => go("home")}><LocalizedText text={"Back to Home"} /></button></div></div></main>;
}

function LyricWordEnhancer({ language }: { language: string }) {
  useEffect(() => {
    const textContainer = document.querySelector<HTMLElement>(".lyric-detail-page .lyrics-content");
    if (!textContainer) return;
    let activeController: AbortController | null = null;
    let panel: HTMLDivElement | null = null;
    const wordPattern = /[\p{L}\p{M}\p{N}]+(?:[-'’][\p{L}\p{M}\p{N}]+)*/gu;

    const closePanel = () => {
      activeController?.abort();
      activeController = null;
      panel?.remove();
      panel = null;
    };
    const showPanel = async (word: string, rect: DOMRect) => {
      closePanel();
      panel = document.createElement("div");
      panel.className = "word-meaning-popover";
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", `Meanings for ${word}`);
      panel.setAttribute("aria-live", "polite");
      const title = document.createElement("div");
      title.className = "word-meaning-heading";
      const selectedWord = document.createElement("b");
      selectedWord.lang = textContainer.lang;
      selectedWord.textContent = word;
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.setAttribute("aria-label", translateInterface(language, "Close"));
      closeButton.textContent = "×";
      closeButton.addEventListener("click", closePanel);
      title.append(selectedWord, closeButton);
      panel.append(title);
      for (const [code, label] of [["en", "English"], ["hi", "Hindi"], ["ur", "Urdu"]]) {
        const row = document.createElement("p");
        row.lang = code;
        row.dir = code === "ur" ? "rtl" : "ltr";
        const languageLabel = document.createElement("span");
        languageLabel.textContent = label;
        const value = document.createElement("b");
        value.textContent = translateInterface(language, "Loading");
        row.append(languageLabel, value);
        panel.append(row);
      }
      const attribution = document.createElement("small");
      attribution.textContent = "Translations via MyMemory";
      panel.append(attribution);
      document.body.append(panel);
      const activePanel = panel;
      panel.style.left = `${Math.max(12, Math.min(window.innerWidth - 332, rect.left + rect.width / 2 - 160))}px`;
      panel.style.top = `${Math.min(window.innerHeight - 220, rect.bottom + 8)}px`;

      activeController = new AbortController();
      try {
        const meanings = await lookupWordMeanings(word, textContainer.lang || "en", activeController.signal);
        if (panel !== activePanel) return;
        panel.querySelectorAll("p b").forEach((value, index) => {
          value.textContent = meanings[(["en", "hi", "ur"] as const)[index]] || translateInterface(language, "Meaning not available");
        });
      } catch {
        if (panel === activePanel) panel.querySelectorAll("p b").forEach((value) => { value.textContent = translateInterface(language, "Meaning not available"); });
      }
    };

    const openAtTextOffset = (node: Node | null, offset: number) => {
      if (!node || node.nodeType !== Node.TEXT_NODE || !textContainer.contains(node)) return;
      if ((node.parentElement as HTMLElement | null)?.closest("aside")) return;
      const source = node.textContent || "";
      wordPattern.lastIndex = 0;
      for (const match of source.matchAll(wordPattern)) {
        const start = match.index ?? 0;
        const end = start + match[0].length;
        if (offset < start || offset > end) continue;
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        void showPanel(match[0], range.getBoundingClientRect());
        return;
      }
    };
    const onClick = (event: MouseEvent) => {
      const caretRange = document.caretRangeFromPoint?.(event.clientX, event.clientY);
      const caretPosition = document.caretPositionFromPoint?.(event.clientX, event.clientY);
      openAtTextOffset(caretRange?.startContainer || caretPosition?.offsetNode || null, caretRange?.startOffset ?? caretPosition?.offset ?? 0);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePanel();
        return;
      }
      if (!textContainer.contains(event.target as Node)) return;
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "c") return;
      const selection = window.getSelection();
      if (selection?.anchorNode && textContainer.contains(selection.anchorNode)) {
        event.preventDefault();
      }
    };
    const onCopy = (event: ClipboardEvent) => event.preventDefault();
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    const onOutsideClick = (event: PointerEvent) => {
      if (panel && !panel.contains(event.target as Node)) closePanel();
    };

    textContainer.tabIndex = 0;
    textContainer.setAttribute("role", "group");
    textContainer.setAttribute("aria-label", "Click a lyric word to look up its meaning. Text selection and copying are disabled.");
    textContainer.addEventListener("click", onClick);
    textContainer.addEventListener("copy", onCopy);
    textContainer.addEventListener("contextmenu", onContextMenu);
    textContainer.addEventListener("copy", onCopy);
    textContainer.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onOutsideClick);
    return () => {
      textContainer.removeEventListener("click", onClick);
      textContainer.removeEventListener("copy", onCopy);
      textContainer.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onOutsideClick);
      textContainer.removeAttribute("tabindex");
      textContainer.removeAttribute("role");
      textContainer.removeAttribute("aria-label");
      closePanel();
    };
  }, [language]);

  return null;
}

function PendingActionNotice({ pendingAction, action, onContinue, onDismiss }: { pendingAction: any; action: string; onContinue: () => void; onDismiss: () => void }) {
  if (pendingAction?.action !== action) return null;
  return <div className="auth-pending-notice" role="status"><span><LocalizedText text={"Sign-in complete. Continue your pending action?"} /></span><div><button type="button" onClick={onContinue}><LocalizedText text={"Continue"} /></button><button type="button" onClick={onDismiss}><LocalizedText text={"Cancel"} /></button></div></div>;
}

function formatAudioTime(totalSeconds: number) {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, totalSeconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function PersistentAudioPlayer({ track, onClose }: { track: (typeof audioLibrary)[number] | null; onClose: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const player = audioRef.current;
    if (!track) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setError("");
      if (player) {
        player.pause();
        player.removeAttribute("src");
        player.load();
      }
      return;
    }

    if (player) {
      player.src = track.source;
      player.load();
    }
    setCurrentTime(0);
    setDuration(0);
    setError("");
    setIsPlaying(false);
  }, [track?.id]);

  if (!track) return null;

  const currentIndex = audioLibrary.findIndex((entry) => entry.id === track.id);
  const previousTrack = currentIndex > 0 ? audioLibrary[currentIndex - 1] : null;
  const nextTrack = currentIndex >= 0 && currentIndex < audioLibrary.length - 1 ? audioLibrary[currentIndex + 1] : null;

  const togglePlayback = async () => {
    const player = audioRef.current;
    if (!player || !track.source) return;

    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await player.play();
      setIsPlaying(true);
    } catch {
      setError("This sample audio source could not play in your browser.");
    }
  };

  return <div className="shared-audio-player" role="region" aria-label={interfaceAttributeText("Persistent audio player")}><audio ref={audioRef} preload="metadata" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)} onPause={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} onEnded={() => setIsPlaying(false)} onError={() => { setError("The selected audio source is unavailable or blocked."); setIsPlaying(false); }} /><div className="shared-player-meta"><b>{track.title}</b><small>{track.artist}</small></div><div className="shared-player-controls"><button aria-label={interfaceAttributeText("Previous track")} disabled={!previousTrack} onClick={() => window.dispatchEvent(new CustomEvent("zikr-select-audio", { detail: { id: previousTrack?.id } }))}>{"‹"}</button><button aria-label={interfaceAttributeText(isPlaying ? "Pause audio" : "Play audio")} className="main" onClick={() => void togglePlayback()}>{isPlaying ? "Ⅱ" : <Icon name="play" size={18} />}</button><button aria-label={interfaceAttributeText("Next track")} disabled={!nextTrack} onClick={() => window.dispatchEvent(new CustomEvent("zikr-select-audio", { detail: { id: nextTrack?.id } }))}>{"›"}</button><input aria-label={interfaceAttributeText("Audio progress")} type="range" min="0" max={duration || 100} value={Math.min(currentTime, duration || 100)} onChange={(event) => { const player = audioRef.current; if (!player) return; player.currentTime = Number(event.target.value); setCurrentTime(Number(event.target.value)); }} /><span>{formatAudioTime(currentTime)}</span><span className="divisor">/</span><span>{duration ? formatAudioTime(duration) : "0:00"}</span></div><div className="shared-player-close"><button aria-label={interfaceAttributeText("Close player")} className="close-player" onClick={onClose}>×</button></div>{error && <div className="player-error"><LocalizedText text={error} /></div>}</div>;
}

function LyricDetail({ go }: { go: (r: Route) => void }) {
  const t = useInterfaceText();
  const [shareMessage, setShareMessage] = useState("");
  const lyricId = getRouteQueryParam("id");
  const [lyric, setLyric] = useState<ApiPublicLyric | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("");

  useEffect(() => {
    let active = true;
    setLyric(null);
    setLoading(true);
    setLoadError("");
    setNotFound(false);
    if (!lyricId) {
      setLoading(false);
      setLoadError("A lyric reference is required.");
      return () => { active = false; };
    }
    void lyricsApi.getPublicLyric(lyricId).then((result) => {
      if (active) {
        setLyric(result);
        setSelectedLanguage(result.languageVersions.find((entry) => entry.code === "hi")?.code || result.languageVersions[0]?.code || "");
      }
    }).catch((error: unknown) => {
      if (active) {
        setNotFound(typeof error === "object" && error !== null && "status" in error && error.status === 404);
        setLoadError(error instanceof Error ? error.message : "The requested lyric could not be loaded.");
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [lyricId, retry]);

  if (loading) {
    return <main className="reading-bg"><div className="container narrow"><p role="status"><LocalizedText text={"Loading lyric..."} /></p></div></main>;
  }
  if (!lyric) {
    return <main className="reading-bg"><div className="container narrow"><Breadcrumbs items={["Lyrics", notFound ? "Not found" : "Unavailable"]} go={go} /><div className="empty"><Icon name="book" size={32} /><h3><LocalizedText text={notFound ? "Lyric not found" : "Lyric unavailable"} /></h3><p><LocalizedText text={loadError || "The requested lyric is unavailable. Try browsing from the main Lyrics page."} /></p>{!notFound && <button className="btn btn-primary" onClick={() => setRetry((count) => count + 1)}><LocalizedText text={"Try again"} /></button>}<button className="btn btn-primary" onClick={() => go("lyrics")}><LocalizedText text={"Back to all lyrics"} /></button></div></div></main>;
  }

  const version = lyric.languageVersions.find((entry) => entry.code === selectedLanguage) || lyric.languageVersions[0];
  const versionText = version?.text || "";
  const writerName = getLyricWriterName(lyric);
  const categoryNames = getLyricCategoryNames(lyric).map(t);
  const bookName = getLyricBookName(lyric);
  const subjectName = lyric.subjectIds?.[0] ? lyricSubjects.find((subject) => subject.id === lyric.subjectIds[0])?.name : undefined;
  const metadataFields = [
    ...(getLyricArtistNames(lyric).length ? [["Recited By", <ReciterDisclosure item={lyric} go={go} />] as const] : []),
    ...(writerName !== "Unknown writer" ? [["Written By", writerName] as const] : []),
    ...(lyric.createdAt ? [["Added", formatLyricDate(lyric.createdAt)] as const] : []),
    ...(bookName ? [["Book", bookName] as const] : []),
    ...(subjectName ? [["Subject", subjectName] as const] : []),
  ] as const;

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#lyric-detail?id=${encodeURIComponent(lyric.id)}`;
    const shareText = lyric.title;

    try {
      if (navigator.share) {
        await navigator.share({ title: lyric.title, text: shareText, url });
        setShareMessage("Share dialog opened.");
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMessage("Share link copied to your clipboard.");
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setShareMessage("Share was unavailable, so the page link was copied instead.");
      } catch {
        setShareMessage("Sharing is unavailable in this browser.");
      }
    }
  };

  return <main className="reading-bg">
    <div className="container narrow">
      <Breadcrumbs items={["Lyrics", lyric.title]} go={go} />
      <article className="lyric-reading lyric-detail-page">
        {categoryNames.length > 0 && <span className="badge">{categoryNames.join(" • ")}</span>}
        <h1 className="lyric-detail-title"><LyricTitle title={lyric.title} /></h1>
        {lyric.tags?.[0] ? <p className="lead">{lyric.tags[0]} <LocalizedText text={"and remembrance"} /></p> : null}
        <div className="lyric-toolbar">
          <div className="lyric-toolbar-left">
            {lyric.languageVersions.length > 0 && <label className="lang-select">
              <span className="sr-only"><LocalizedText text={"Select language"} /></span>
              <select aria-label={interfaceAttributeText("Select lyric language")} value={version?.code || ""} onChange={(event) => setSelectedLanguage(event.target.value)}>
                {lyric.languageVersions.map((entry) => <option key={entry.code} value={entry.code}>{entry.label}</option>)}
              </select>
            </label>}
          </div>
          <div className="lyric-toolbar-actions"><Btn variant="outline" icon="share" onClick={() => void share()}><LocalizedText text={"Share"} /></Btn></div>
        </div>
        {shareMessage && <div className="lyric-share-status"><LocalizedText text={shareMessage} /></div>}
        {lyric.tags?.length ? <div className="tag-row">{lyric.tags.map((tag) => <span key={tag} className="badge soft-badge">#{tag}</span>)}</div> : null}
        <div className="lyrics-text" lang={version?.code} dir={version?.dir || "ltr"}>
          {version?.document || version?.content
            ? <Suspense fallback={<p className="lyrics-content">{versionText}</p>}><LyricDocumentView document={version.document || version.content || ""} language={version.code} dir={version.dir || "ltr"} className="lyrics-content" /></Suspense>
            : versionText ? <p className="lyrics-content">{versionText.split("\n").map((line, index) => <span key={`${version.code}-${index}`}><span>{line}</span>{index < versionText.split("\n").length - 1 ? <br /> : null}</span>)}</p> : <p className="lyrics-content"><LocalizedText text={"No translation is available for this lyric yet."} /></p>}
          {lyric.tags?.length ? <aside><LocalizedText text={"Keywords:"} trailing=" " />{lyric.tags.join(" • ")}</aside> : null}
        </div>
        <div className="detail-meta-row">{metadataFields.map(([label, value]) => <div key={label} className="detail-meta-item"><small>{t(label)}</small><span>{value}</span></div>)}</div>
      </article>
      {lyric.relatedAudio?.length ? <section className="related">
        <SectionHead title={interfaceAttributeText("Related Audio")} action="Back to Lyrics" onAction={() => go("lyrics")} />
        <div className="audio-grid light">{lyric.relatedAudio.map((item) => <article className="audio-card reveal" key={item.title}>
          <div className="audio-art green"><div className="arch-art"><span>ذِكْر</span></div><button className="play-btn" aria-label={`Play ${item.title}`} onClick={() => window.open(item.url, "_blank", "noopener")}><Icon name="play" /></button></div>
          <div className="audio-info"><span className="badge"><LocalizedText text={"Audio"} /></span><h3>{item.title}</h3><p><LocalizedText text={"Related to"} trailing=" " />{lyric.title}</p><div className="media-meta"><span><LocalizedText text={"Link"} /></span><span><LocalizedText text={"Available"} /></span></div></div>
        </article>)}</div>
      </section> : null}
      {lyric.relatedVideos?.length ? <section className="related"><SectionHead title={interfaceAttributeText("Related Videos")} /><YouTubeVideoGrid videos={lyric.relatedVideos.map((video, index) => ({ id: `${lyric.id}-video-${index}`, title: video.title || "YouTube video reference", url: video.url }))} /></section> : null}
    </div>
  </main>;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const routePath = location.pathname === "/" ? "home" : location.pathname.slice(1);
  const route = `${routePath}${location.search}`;
  const [language, setLanguage] = useState(() => {
    const saved = readPreference(GLOBAL_LANGUAGE_KEY, "en");
    return ["en", "hi", "ur"].includes(saved) ? saved : "en";
  });
  const [theme, setTheme] = useState(() => readPreference(THEME_KEY, "light") === "dark" ? "dark" : "light");
  const [lyricsTheme, setLyricsTheme] = useState(() => readPreference(LYRICS_THEME_KEY, readPreference(THEME_KEY, "light")) === "dark" ? "dark" : "light");
  const [quranTheme, setQuranTheme] = useState(() => readPreference(QURAN_THEME_KEY, readPreference(THEME_KEY, "light")) === "dark" ? "dark" : "light");
  const [fontScale, setFontScale] = useState(() => {
    const saved = Number(readPreference(FONT_SCALE_KEY, "1"));
    return Number.isFinite(saved) ? Math.max(0.9, Math.min(1.2, saved)) : 1;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => adminAuth.hasAdminSession());
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState(() => readPendingAction());

  const isLyricsRoute = lyricsRoutePaths.includes(routePath) || routePath === "lyric-detail";
  const isQuranRoute = quranRoutePaths.includes(routePath);
  const activeTheme = isLyricsRoute ? lyricsTheme : isQuranRoute ? quranTheme : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
    document.documentElement.lang = language;
    document.documentElement.style.setProperty("--interface-scale", String(fontScale));
    try {
      window.localStorage.setItem(GLOBAL_LANGUAGE_KEY, language);
      window.localStorage.setItem(THEME_KEY, theme);
      window.localStorage.setItem(LYRICS_THEME_KEY, lyricsTheme);
      window.localStorage.setItem(QURAN_THEME_KEY, quranTheme);
      window.localStorage.setItem(FONT_SCALE_KEY, String(fontScale));
    } catch { /* Preference storage may be unavailable in private browsing. */ }
  }, [activeTheme, fontScale, language, lyricsTheme, quranTheme, theme]);

  useEffect(() => {
    const syncAuth = () => setIsLoggedIn(adminAuth.hasAdminSession());
    const handleSelectAudio = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (detail?.id) setActiveAudioId(detail.id);
    };

    window.addEventListener("zikr-auth-state", syncAuth);
    window.addEventListener("zikr-select-audio", handleSelectAudio as EventListener);

    return () => {
      window.removeEventListener("zikr-auth-state", syncAuth);
      window.removeEventListener("zikr-select-audio", handleSelectAudio as EventListener);
    };
  }, []);

  const go = (r: Route) => {
    const [path, ...queryParts] = r.replace(/^#/, "").split("?");
    const destination = !path || path === "home" ? "/" : `/${path}`;
    const query = queryParts.length ? `?${queryParts.join("?")}` : "";
    const currentState = location.state && typeof location.state === "object" ? location.state : {};
    navigate(`${destination}${query}`, { state: { ...currentState, zikrPrevious: `${location.pathname}${location.search}` } });
  };

  const previousRoutePath = useRef(routePath);
  useEffect(() => {
    if (!lyricsRoutePaths.includes(previousRoutePath.current) || !lyricsRoutePaths.includes(routePath)) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    previousRoutePath.current = routePath;
  }, [routePath]);

  const activeAudio = useMemo(() => (activeAudioId ? getAudioById(activeAudioId) : null), [activeAudioId]);

  const requireAuthentication = (action: string, contentType: string, contentId: string) => {
    if (isLoggedIn) return true;
    const returnRoute = `${location.pathname.replace(/^\//, "")}${location.search}`;
    const intent = createPendingAction({ action, contentType, contentId, returnTo: returnRoute ? `#${returnRoute}` : "#home" });
    if (!intent || !savePendingAction(intent)) {
      window.alert(translateInterface(language, "This action could not be saved for return after sign-in. Please retry from the content page."));
      return false;
    }
    setPendingAction(intent);
    go("login");
    return false;
  };

  const dismissPendingAction = () => {
    clearPendingAction();
    setPendingAction(null);
  };

  const resumePendingAction = () => {
    const intent = readPendingAction();
    if (!intent) {
      setPendingAction(null);
      return;
    }
    if (!isLoggedIn) {
      go("login");
      return;
    }

    if (intent.action === "download-audio") {
      const track = getAudioById(intent.contentId);
      if (!track?.downloadable || track.isDemo || !isAvailableDownloadUrl(track.downloadUrl)) {
        clearPendingAction();
        setPendingAction(null);
        window.alert(translateInterface(language, "This audio download is no longer available."));
        return;
      }
      clearPendingAction();
      setPendingAction(null);
      handleDownloadAudio(track);
      return;
    }

    if (intent.action === "download-book") {
      const book = getEbookById(intent.contentId);
      if (!book?.downloadable || !isAvailableDownloadUrl(book.downloadUrl)) {
        clearPendingAction();
        setPendingAction(null);
        window.alert(translateInterface(language, "This PDF is no longer available or authorized for download."));
        return;
      }
      clearPendingAction();
      setPendingAction(null);
      handleDownloadBook(book);
      return;
    }

    if (intent.action === "bookmark-quran") {
      const [surahValue, ayahValue] = intent.contentId.split(":");
      const surahNumber = Number(surahValue);
      const ayahNumber = Number(ayahValue);
      const chapter = surahData[surahNumber - 1];
      if (!chapter || ayahNumber < 1 || ayahNumber > chapter[2]) {
        clearPendingAction();
        setPendingAction(null);
        window.alert(translateInterface(language, "This Quran bookmark reference is unavailable."));
        return;
      }
      try {
        const reference = surahNumber * 1000 + ayahNumber;
        toggleStoredQuranBookmark(reference);
        window.dispatchEvent(new CustomEvent("zikr-auth-action-feedback", { detail: "Bookmark updated in this browser. Account sync is unavailable in this prototype." }));
        clearPendingAction();
        setPendingAction(null);
      } catch {
        window.alert(translateInterface(language, "Bookmarks could not be saved in this browser."));
      }
      return;
    }

    window.alert(translateInterface(language, "Account saving is unavailable because this project has no saved-items service."));
  };

  const handlePlayAudio = (track: (typeof audioLibrary)[number]) => {
    if (!track || !track.source) return;
    setActiveAudioId(track.id);
  };

  const handleDownloadAudio = (track: (typeof audioLibrary)[number]) => {
    if (!track || !requireAuthentication("download-audio", "audio", track.id)) return;
    if (!track.downloadable || track.isDemo || !isAvailableDownloadUrl(track.downloadUrl)) {
      window.alert(translateInterface(language, "This audio file is not available for download."));
      return;
    }
    const opened = window.open(track.downloadUrl, "_blank", "noopener,noreferrer");
    if (!opened) window.alert(translateInterface(language, "The browser blocked the download window. Allow pop-ups and retry."));
  };

  const handleDownloadBook = (book: (typeof ebookLibrary)[number]) => {
    if (!book || !requireAuthentication("download-book", "book", book.id)) return;
    if (!book.downloadable || !isAvailableDownloadUrl(book.downloadUrl)) {
      window.alert(translateInterface(language, "This PDF is unavailable or not authorized for download."));
      return;
    }
    const opened = window.open(book.downloadUrl, "_blank", "noopener,noreferrer");
    if (!opened) window.alert(translateInterface(language, "The browser blocked the download window. Allow pop-ups and retry."));
  };

  const handleLogout = async () => {
    try { await adminAuth.logout(); } catch { /* session is always cleared locally */ }
    // Remove any stale demo flag so it cannot grant access after logout
    try { window.localStorage.removeItem("zikr-authenticated"); } catch { /* ignore */ }
    setIsLoggedIn(false);
    go("home");
  };

  const headerRoute = lyricsRoutePaths.includes(routePath) ? "lyrics" : routePath;
  return <InterfaceLanguageContext.Provider value={language}><div className="app-shell" data-theme={activeTheme}>
    {isLoggedIn && pendingAction && !["login", "register"].includes(routePath) && <PendingActionNotice pendingAction={pendingAction} action={pendingAction.action} onContinue={resumePendingAction} onDismiss={dismissPendingAction} />}
    <Routes>
      <RouterRoute element={<PublicLayout route={headerRoute} routePath={routePath} go={go} language={language} setLanguage={setLanguage} theme={isLyricsRoute ? lyricsTheme : quranTheme} setTheme={isLyricsRoute ? setLyricsTheme : setQuranTheme} fontScale={fontScale} setFontScale={setFontScale} />}>
        <RouterRoute index element={<Home go={go} onPlayAudio={handlePlayAudio} onDownloadAudio={handleDownloadAudio} activeAudioId={activeAudioId} />} />
        <RouterRoute path="home" element={<Navigate to="/" replace />} />
        <RouterRoute path="lyrics" element={<LyricsPage go={go} route={route} />} />
        <RouterRoute path="lyrics-category" element={<LyricsPage go={go} route={route} />} />
        <RouterRoute path="lyrics-artists" element={<LyricsPage go={go} route={route} />} />
        <RouterRoute path="lyrics-poets" element={<LyricsPage go={go} route={route} />} />
        <RouterRoute path="lyrics-books" element={<LyricsPage go={go} route={route} />} />
        <RouterRoute path="lyrics-languages" element={<LyricsPage go={go} route={route} />} />
        <RouterRoute path="lyrics-subjects" element={<LyricsPage go={go} route={route} />} />
        <RouterRoute path="lyric-detail" element={<><LyricDetail go={go} /><LyricWordEnhancer language={language} /></>} />
        <RouterRoute path="quran" element={<QuranHome go={go} />} />
        <RouterRoute path="surahs" element={<SurahDirectory go={go} />} />
        <RouterRoute path="surah-read" element={<SurahRead go={go} isLoggedIn={isLoggedIn} onRequireAuthentication={requireAuthentication} />} />
        <RouterRoute path="para" element={<ParaPage go={go} />} />
        <RouterRoute path="quran-topics" element={<QuranTopics go={go} />} />
        <RouterRoute path="audio" element={<AudioPage go={go} onPlayAudio={handlePlayAudio} onDownloadAudio={handleDownloadAudio} activeAudioId={activeAudioId} />} />
        <RouterRoute path="audio-detail" element={<AudioDetail go={go} onPlayAudio={handlePlayAudio} onDownloadAudio={handleDownloadAudio} activeAudioId={activeAudioId} />} />
        <RouterRoute path="services" element={<ServicesPage go={go} />} />
        <RouterRoute path="ebooks" element={<Ebooks go={go} onDownloadBook={handleDownloadBook} />} />
        <RouterRoute path="book-detail" element={<BookDetail go={go} isLoggedIn={isLoggedIn} onDownloadBook={handleDownloadBook} />} />
        <RouterRoute path="about" element={<AboutPage go={go} />} />
        <RouterRoute path="contact" element={<ContactPage go={go} />} />
        <RouterRoute path="*" element={<NotFound go={go} />} />
      </RouterRoute>
      <RouterRoute element={<BareLayout routePath={routePath} />}>
        <RouterRoute path="login" element={<AuthPage mode="login" go={go} />} />
        <RouterRoute path="register" element={<AuthPage mode="register" go={go} />} />
        <RouterRoute path="admin" element={<Suspense fallback={<main className="admin-access" role="status">Loading content admin…</main>}><AdminContentPage go={go} isLoggedIn={isLoggedIn} onLogout={handleLogout} /></Suspense>} />
        <RouterRoute path="admin-edit" element={<Suspense fallback={<main className="admin-access" role="status">Loading content admin…</main>}><AdminContentPage edit go={go} isLoggedIn={isLoggedIn} onLogout={handleLogout} /></Suspense>} />
        <RouterRoute path="admin/quran" element={<Suspense fallback={<main className="admin-access" role="status">Loading content admin…</main>}><AdminContentPage quranSection go={go} isLoggedIn={isLoggedIn} onLogout={handleLogout} /></Suspense>} />
        <RouterRoute path="admin/quran/:surahNumber/ayah/new" element={<Suspense fallback={<main className="admin-access" role="status">Loading content admin…</main>}><AdminContentPage quranSection go={go} isLoggedIn={isLoggedIn} onLogout={handleLogout} /></Suspense>} />
        <RouterRoute path="admin/quran/:surahNumber/ayah/:ayahNumber" element={<Suspense fallback={<main className="admin-access" role="status">Loading content admin…</main>}><AdminContentPage quranSection go={go} isLoggedIn={isLoggedIn} onLogout={handleLogout} /></Suspense>} />
        <RouterRoute path="admin/quran/:surahNumber" element={<Suspense fallback={<main className="admin-access" role="status">Loading content admin…</main>}><AdminContentPage quranSection go={go} isLoggedIn={isLoggedIn} onLogout={handleLogout} /></Suspense>} />
        <RouterRoute path="book-reader" element={<BookReader go={go} />} />
      </RouterRoute>
    </Routes>
    {activeAudio && <PersistentAudioPlayer track={activeAudio} onClose={() => setActiveAudioId(null)} />}
  </div></InterfaceLanguageContext.Provider>;
}
