import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useContentCollection } from "../../../app/hooks/useContentCollection";
import { LocalizedText, useInterfaceText } from "../../../app/providers/interfaceLanguage";
import { Icon, Logo } from "../../../components/ui";
import { lyrics as initialLyrics, artists, lyricBooks, lyricCategories, lyricSubjects, poets } from "../../../lyricsData";
import { surahData } from "../../quran/data/surahMetadata";
import { AdminQuranManagement } from "../../quran/admin/AdminQuranManagement";
import { AdminQuranSurahManagement } from "../../quran/admin/AdminQuranSurahManagement";
import { AdminQuranAyahEditor } from "../../quran/admin/AdminQuranAyahEditor";
import { contentRepository } from "../services/contentRepository.js";
import { getYouTubeVideoId, slugifyLyricsTitle } from "../../lyrics/utils/youtubeVideo.js";
import { isLyricDocument, lyricDocumentToText, textToLyricDocument } from "../../lyrics/utils/lyricDocument.js";
import { LyricDocumentView } from "../../lyrics/components/LyricRichText";
import { LyricsEditor } from "../components/LyricsEditor";
import { RecitersManagement } from "../components/RecitersManagement";
import { AdminLyricsManagement } from "../components/AdminLyricsManagement";
import { AdminArtistsManagement } from "../components/AdminArtistsManagement";
import { AdminAudioManagement } from "../components/AdminAudioManagement";
import { reciterProfiles, type ReciterProfile } from "../../lyrics/data/reciterProfiles";
import { getUserFacingError, notify } from "../../../app/notifications/toastStore.js";

type ContentKind = "lyrics" | "quranAyahs";
type PageMode = "dashboard" | "apiLyrics" | "list" | "form" | "detail";
type AdminRecord = Record<string, any> & { id: string; status: string };

const languageOptions = [
    { code: "ur", label: "Urdu", script: "Urdu", dir: "rtl" },
    { code: "hi", label: "Hindi", script: "Devanagari", dir: "ltr" },
    { code: "en", label: "English", script: "Roman", dir: "ltr" },
    { code: "ta", label: "Tamil", script: "Tamil", dir: "ltr" },
];

function splitLines(value: string) {
    return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function getReciters(record: AdminRecord, profiles: ReciterProfile[] = reciterProfiles) {
    const ids = Array.isArray(record.reciterIds) && record.reciterIds.length
        ? record.reciterIds
        : Array.isArray(record.artistIds) && record.artistIds.length ? record.artistIds : [record.artistId];
    const profileNames = ids.filter(Boolean).map((id: string | number) => profiles.find((profile) => profile.id === String(id))?.name || artists.find((artist) => artist.id === String(id))?.name || String(id));
    if (profileNames.length) return [...new Set(profileNames)];
    return Array.isArray(record.reciters) ? [...new Set(record.reciters.filter((name: unknown) => typeof name === "string" && name.trim()))] : [];
}

function getLyricsDraft(record?: AdminRecord) {
    const versions = Object.fromEntries(languageOptions.map(({ code }) => [code, record?.languageVersions?.find((version: any) => version.code === code)?.text || ""]));
    const documents = Object.fromEntries(languageOptions.map(({ code }) => {
        const version = record?.languageVersions?.find((item: any) => item.code === code);
        return [code, isLyricDocument(version?.document) ? version.document : textToLyricDocument(version?.text || "")];
    }));
    const videos = (record?.relatedVideos || []).map((video: any) => video.url).filter(Boolean).join("\n");
    const explicitReciters = Array.isArray(record?.reciters) ? record.reciters.filter((name: unknown): name is string => typeof name === "string" && !!name.trim()) : [];
    const reciterIds = record
        ? [...new Set((Array.isArray(record.reciterIds) && record.reciterIds.length ? record.reciterIds : Array.isArray(record.artistIds) && record.artistIds.length ? record.artistIds : [record.artistId])
            .filter(Boolean)
            .concat(explicitReciters.map((name) => reciterProfiles.find((profile) => profile.name.toLowerCase() === name.toLowerCase())?.id).filter(Boolean)))]
        : [];
    const legacyReciters = explicitReciters.filter((name) => !reciterProfiles.some((profile) => profile.name.toLowerCase() === name.toLowerCase()));
    return {
        title: record?.title || "",
        slug: record?.slug || "",
        reciterIds,
        legacyReciters,
        writer: record?.writer || poets.find((poet) => String(poet.id) === String(record?.writerId))?.name || "",
        categoryIds: record?.categoryIds || [],
        subjectIds: record?.subjectIds || [],
        tags: (record?.tags || []).join(", "),
        bookId: record?.bookId || "",
        relatedVideoUrls: videos,
        versions,
        documents,
        status: record?.status || "draft",
    };
}

function getQuranDraft(record?: AdminRecord) {
    const translations = Object.fromEntries(languageOptions.map(({ code }) => [code, record?.translations?.[code] || ""]));
    return {
        surahNumber: String(record?.surahNumber || 1),
        ayahNumber: String(record?.ayahNumber || 2),
        arabic: record?.arabic || "",
        translations,
        status: record?.status || "draft",
    };
}

function ErrorMessage({ message }: { message: string }) {
    return message ? <p className="admin-form-error" role="alert">{message}</p> : null;
}

export function AdminContentPage({ edit = false, quranSection = false, go, isLoggedIn, onLogout }: { edit?: boolean; quranSection?: boolean; go: (route: string) => void; isLoggedIn: boolean; onLogout?: () => void }) {
    const t = useInterfaceText();
    const location = useLocation();
    const { surahNumber: surahParam, ayahNumber: ayahParam } = useParams<{ surahNumber?: string; ayahNumber?: string }>();
    const selectedSurahNumber = surahParam === undefined ? undefined : Number(surahParam);
    const quranMode = new URLSearchParams(location.search).get("mode") === "view" ? "view" : "edit";
    const lyricRecords = useContentCollection<AdminRecord>("lyrics", initialLyrics as AdminRecord[]);
    const quranRecords: AdminRecord[] = [];
    const reciterRecords = useContentCollection<ReciterProfile>("reciters", reciterProfiles);
    const [mode, setMode] = useState<PageMode>(quranSection ? "list" : edit ? "form" : "dashboard");
    const [kind, setKind] = useState<ContentKind>(quranSection ? "quranAyahs" : "lyrics");
    const [selectedId, setSelectedId] = useState("");
    const [draft, setDraft] = useState<any>(() => getLyricsDraft());
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [showReciterManagement, setShowReciterManagement] = useState(false);
    const [showArtistManagement, setShowArtistManagement] = useState(false);
    const [showAudioManagement, setShowAudioManagement] = useState(false);
    const [showPortfolioManagement, setShowPortfolioManagement] = useState(false);
    const [reciterQuery, setReciterQuery] = useState("");
    const draftBaseline = useRef(JSON.stringify(getLyricsDraft()));

    useEffect(() => {
        if (quranSection) {
            setMode("list");
            setKind("quranAyahs");
            setShowArtistManagement(false);
            setShowAudioManagement(false);
            setShowReciterManagement(false);
            setShowPortfolioManagement(false);
        } else if (location.pathname.replace(/^\//, "") === "admin") {
            const section = new URLSearchParams(location.search).get("section");
            setShowArtistManagement(section === "artists");
            setShowAudioManagement(section === "audio");
            setShowReciterManagement(section === "reciters");
            setShowPortfolioManagement(section === "portfolio");
            setKind("lyrics");
            setMode(section === "lyrics" || section === "portfolio" ? "apiLyrics" : section ? "list" : "dashboard");
        }
    }, [location.pathname, location.search, quranSection]);

    useEffect(() => {
        if (edit) {
            setKind("lyrics");
            setSelectedId("");
            const nextDraft = getLyricsDraft();
            setDraft(nextDraft);
            draftBaseline.current = JSON.stringify(nextDraft);
            setMode("form");
        }
    }, [edit]);

    const records = kind === "lyrics" ? lyricRecords : quranRecords;
    const selectedRecord = records.find((record) => record.id === selectedId);
    const visibleRecords = useMemo(() => records.filter((record) => {
        const title = kind === "lyrics" ? record.title || record.slug || record.id : `${surahData[record.surahNumber - 1]?.[1] || "Surah"} ${record.surahNumber}:${record.ayahNumber}`;
        return (statusFilter === "all" || record.status === statusFilter)
            && `${title} ${record.id}`.toLowerCase().includes(query.trim().toLowerCase());
    }), [kind, query, records, statusFilter]);

    const openList = (nextKind: ContentKind) => {
        setKind(nextKind);
        setQuery("");
        setStatusFilter("all");
        setSelectedId("");
        setError("");
        setMode(nextKind === "lyrics" ? "apiLyrics" : "list");
    };

    const startCreate = (nextKind = kind) => {
        setKind(nextKind);
        setSelectedId("");
        const nextDraft = nextKind === "lyrics" ? getLyricsDraft() : getQuranDraft();
        setDraft(nextDraft);
        draftBaseline.current = JSON.stringify(nextDraft);
        setError("");
        setMode("form");
    };

    const startEdit = (record: AdminRecord) => {
        setSelectedId(record.id);
        const nextDraft = kind === "lyrics" ? getLyricsDraft(record) : getQuranDraft(record);
        setDraft(nextDraft);
        draftBaseline.current = JSON.stringify(nextDraft);
        setError("");
        setMode("form");
    };

    const setField = (name: string, value: unknown) => setDraft((current: any) => ({ ...current, [name]: value }));

    const handleSave = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setIsSaving(true);
        try {
            if (kind === "lyrics") {
                const title = String(draft.title || "").trim();
                const slug = String(draft.slug || "").trim() || slugifyLyricsTitle(title);
                const richLanguageCodes = ["ur", "hi", "en", "ta"];
                const languageCodes = [...new Set([...(selectedRecord?.languageVersions || []).map((version: any) => version.code), ...languageOptions.map(({ code }) => code)])];
                const versions = languageCodes.flatMap((code) => {
                    const existing = selectedRecord?.languageVersions?.find((item: any) => item.code === code);
                    const language = languageOptions.find((item) => item.code === code);
                    if (!language) return existing ? [existing] : [];
                    const document = richLanguageCodes.includes(code) ? draft.documents?.[code] : existing?.document;
                    const sourceText = richLanguageCodes.includes(code) && isLyricDocument(document) ? lyricDocumentToText(document) : draft.versions?.[code];
                    const text = String(sourceText || "").trim();
                    if (!text) return [];
                    return [{ ...existing, ...language, text, ...(isLyricDocument(document) ? { document } : {}) }];
                });
                if (!title) {
                    setError("A lyrics title is required.");
                    return;
                }
                if (!versions.length) {
                    setError("Add the existing lyrics text in at least one language.");
                    return;
                }
                const reciterIds = [...new Set((draft.reciterIds || []).filter((id: unknown): id is string => typeof id === "string" && reciterRecords.some((profile) => profile.id === id)))];
                const reciters = [...new Set([
                    ...reciterIds.map((id) => reciterRecords.find((profile) => profile.id === id)?.name).filter(Boolean),
                    ...(draft.legacyReciters || []).map((name: string) => name.trim()).filter(Boolean),
                ])];
                const artistIds = reciterIds;
                const tags = String(draft.tags || "").split(",").map((tag: string) => tag.trim()).filter(Boolean);
                const videoUrls = splitLines(String(draft.relatedVideoUrls || ""));
                const existingUrls = (selectedRecord?.relatedVideos || []).map((video: any) => video.url);
                const invalidVideo = videoUrls.find((url) => !getYouTubeVideoId(url) && !existingUrls.includes(url));
                if (invalidVideo) {
                    setError(`Use a valid HTTPS YouTube URL: ${invalidVideo}`);
                    return;
                }
                const relatedVideos = videoUrls.map((url) => selectedRecord?.relatedVideos?.find((video: any) => video.url === url) || { url });
                const writerId = poets.find((poet) => poet.name.toLowerCase() === String(draft.writer || "").trim().toLowerCase())?.id || "";
                const record: AdminRecord = {
                    ...selectedRecord,
                    id: selectedId || slug,
                    title,
                    slug,
                    reciters,
                    reciterIds,
                    artistIds,
                    artistId: artistIds[0] || "",
                    writer: String(draft.writer || "").trim(),
                    writerId,
                    categoryIds: draft.categoryIds || [],
                    subjectIds: draft.subjectIds || [],
                    tags,
                    bookId: draft.bookId || null,
                    languageVersions: versions,
                    relatedVideos,
                    status: draft.status,
                    createdAt: selectedRecord?.createdAt || new Date().toISOString(),
                };
                const nextRecords = selectedId
                    ? contentRepository.update("lyrics", selectedId, record, initialLyrics as AdminRecord[])
                    : contentRepository.create("lyrics", record, initialLyrics as AdminRecord[]);
                if (selectedId && record.id !== selectedId) contentRepository.replace("lyrics", nextRecords.map((item) => item.id === selectedId ? { ...item, id: record.id } : item));
                setSelectedId(record.id);
            } else {
                throw new Error("Quran content is managed through the authenticated Quran API.");
            }
            setMode("detail");
            notify.success("Saved to browser demo storage. This does not publish to a server.");
        } catch (saveError) {
            const message = getUserFacingError(saveError, "The record could not be saved.");
            notify.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    const togglePublished = (record: AdminRecord) => {
        setError("");
        try {
            contentRepository.update(kind, record.id, { status: record.status === "published" ? "draft" : "published" }, records);
            notify.success(record.status === "published" ? "Moved to draft in browser demo storage." : "Published in browser demo storage.");
        } catch (updateError) {
            const message = getUserFacingError(updateError, "The record could not be updated.");
            notify.error(message);
        }
    };

    const deleteRecord = (record: AdminRecord) => {
        if (!window.confirm(`Delete ${kind === "lyrics" ? record.title : record.id}? This cannot be undone in this browser.`)) return;
        setError("");
        try {
            contentRepository.remove(kind, record.id, records);
            setSelectedId("");
            setMode("list");
            notify.success("Deleted from browser demo storage.");
        } catch (deleteError) {
            const message = getUserFacingError(deleteError, "The record could not be deleted.");
            notify.error(message);
        }
    };

    if (!isLoggedIn) {
        return <main className="admin-access"><Logo /><h1>Admin sign-in required</h1><p>Sign in with your administrator credentials to access the content admin panel.</p><button className="btn btn-primary" onClick={() => go("login")}>Sign in</button></main>;
    }

    if (showReciterManagement) {
        return <RecitersManagement onBack={() => setShowReciterManagement(false)} onLogout={onLogout} onNavigate={(section) => {
            setShowReciterManagement(false);
            if (section === "lyrics") {
                go("admin?section=lyrics");
            } else if (section === "quran") {
                setShowPortfolioManagement(false);
                go("admin/quran");
            } else {
                go("admin?section=portfolio");
            }
        }} />;
    }

    return (
        <main className={`admin admin-content-management${showAudioManagement ? " admin-audio-content-management" : ""}`}>
            <aside>
                <Logo />
                <small>CONTENT ADMIN · AUTHENTICATED API / LEGACY DEMO</small>
                <nav className="admin-sidebar-nav" aria-label="Admin sections">
                    <button className={!quranSection && mode === "dashboard" && !showReciterManagement && !showArtistManagement && !showAudioManagement && !showPortfolioManagement ? "active" : ""} onClick={() => { setShowPortfolioManagement(false); setShowReciterManagement(false); setShowArtistManagement(false); setShowAudioManagement(false); setKind("lyrics"); setMode("dashboard"); go("admin"); }}><Icon name="grid" size={17} />Dashboard</button>
                    <button className={!quranSection && kind === "lyrics" && mode !== "dashboard" && !showReciterManagement && !showArtistManagement && !showAudioManagement && !showPortfolioManagement ? "active" : ""} onClick={() => go("admin?section=lyrics")}><Icon name="pen" size={17} />Lyrics Management</button>
                    <button className={quranSection || !showReciterManagement && !showArtistManagement && !showAudioManagement && !showPortfolioManagement && kind === "quranAyahs" && mode !== "dashboard" ? "active" : ""} onClick={() => { setShowPortfolioManagement(false); setShowReciterManagement(false); setShowArtistManagement(false); setShowAudioManagement(false); go("admin/quran"); }}><Icon name="book" size={17} />Quran Management</button>
                    <button className={!quranSection && showArtistManagement ? "active" : ""} onClick={() => go("admin?section=artists")}><Icon name="user" size={17} />Artist Management</button>
                    <button className={!quranSection && showAudioManagement ? "active" : ""} onClick={() => go("admin?section=audio")}><Icon name="headphones" size={17} />Audio Management</button>
                    {/* <button className={!quranSection && showReciterManagement ? "active" : ""} onClick={() => go("admin?section=reciters")}><Icon name="user" size={17} />Legacy Reciters</button> */}
                    <button className={!quranSection && showPortfolioManagement ? "active" : ""} onClick={() => go("admin?section=portfolio")}><Icon name="grid" size={17} />Portfolio Management</button>
                </nav>
                <button className="admin-signout" onClick={() => onLogout?.()}><Icon name="x" size={17} />Sign out</button>
            </aside>
            <div className="admin-main">
                <header><div><small>ADMINISTRATION</small><h1>{quranSection ? "Quran Management" : showArtistManagement ? "Artist Management" : showAudioManagement ? "Audio Management" : showPortfolioManagement ? "Portfolio Management" : mode === "dashboard" ? "Content dashboard" : mode === "apiLyrics" ? "Lyrics Management" : `${kind === "lyrics" ? "Lyrics" : "Quran Ayah"} management`}</h1></div><span className="admin-demo-badge">{showAudioManagement ? "Preview data only" : quranSection || (mode === "apiLyrics" && !showPortfolioManagement) || showArtistManagement || (kind === "quranAyahs" && mode !== "dashboard") ? "Authenticated API" : "Browser demo storage"}</span></header>
                {/* {mode !== "apiLyrics" && !quranSection && !showPortfolioManagement && !showArtistManagement && !(kind === "quranAyahs" && mode !== "dashboard") &&
                    <div className="admin-demo-warning" role="note"></div>}
                <ErrorMessage message={error} /> */}

                {mode === "apiLyrics" && !showPortfolioManagement && !showArtistManagement && <AdminLyricsManagement />}
                {showAudioManagement && <AdminAudioManagement />}
                {quranSection && (selectedSurahNumber === undefined
                    ? <AdminQuranManagement onNavigate={(number, nextMode) => go(number === undefined
                        ? "admin/quran"
                        : `admin/quran/${number}?mode=${nextMode || "edit"}`)} />
                    : ayahParam !== undefined
                        ? <AdminQuranAyahEditor
                            surahNumber={selectedSurahNumber}
                            ayahNumberParam={ayahParam}
                            mode={new URLSearchParams(location.search).get("mode") === "view" ? "view" : "edit"}
                            onBack={() => go(`admin/quran/${selectedSurahNumber}?mode=edit`)}
                            onNavigateAyah={(ayahNumber) => go(`admin/quran/${selectedSurahNumber}/ayah/${ayahNumber}`)}
                        />
                        : <AdminQuranSurahManagement
                            key={`quran-surah-${selectedSurahNumber}`}
                            surahNumber={selectedSurahNumber}
                            mode={quranMode}
                            onNavigate={(number, nextMode) => go(number === undefined
                                ? "admin/quran"
                                : `admin/quran/${number}?mode=${nextMode || "edit"}`)}
                            onOpenAyah={(ayahNumber, nextMode) => go(
                                `admin/quran/${selectedSurahNumber}/ayah/${ayahNumber}${nextMode === "view" ? "?mode=view" : ""}`,
                            )}
                        />)}
                {showArtistManagement && <AdminArtistsManagement />}
                {showPortfolioManagement && <section className="admin-portfolio-blocked" role="status"><Icon name="grid" size={28} /><h2>Portfolio management needs backend support</h2><p>No Portfolio API or portfolio persistence model is included in this repository. This section is intentionally read-only rather than reporting browser-only changes as saved.</p><ul><li>Add authenticated list, create, edit, delete, and visibility endpoints.</li><li>Persist YouTube, Spotify, service, and project content types with publication state and display order.</li><li>Add a public endpoint that returns only published portfolio records.</li></ul><p>The required API contract is documented in <code>src/features/admin/ADMIN_API.md</code>.</p></section>}
                {mode === "dashboard" && !quranSection && !showArtistManagement && !showAudioManagement && !showPortfolioManagement && !showReciterManagement && <section className="admin-dashboard-content">
                    <div className="stat-grid"><article><span>{lyricRecords.filter((item) => item.status === "published").length}</span><small>Published lyrics</small></article><article><span>{lyricRecords.filter((item) => item.status === "draft").length}</span><small>Lyrics drafts</small></article><article><span>API</span><small>Quran records (load management)</small></article><article><span>API</span><small>Surah metadata (load management)</small></article></div>
                    <div className="admin-content-shortcuts"><button onClick={() => openList("lyrics")}><b>Lyrics Management</b><span>View, search, edit, and publish server lyric records.</span></button><button onClick={() => go("admin/quran")}><b>Quran Management</b><span>Browse all Surahs and manage Ayahs and translations through authenticated APIs.</span></button>
                        <button onClick={() => { setShowArtistManagement(true); setError(""); }}><b>Artist Management</b><span>Manage API-backed artists and role assignments.</span></button>
                        <button onClick={() => go("admin?section=audio")}><b>Audio Management</b><span>Review audio tracks and prepare local previews for artist credits and media.</span></button>
                        {/* <button onClick={() => setShowReciterManagement(true)}><b>Legacy Reciters</b><span>Manage legacy browser-demo reciter profiles.</span></button><button onClick={() => setShowPortfolioManagement(true)}><b>Portfolio Management</b><span>Portfolio CRUD is waiting for authenticated backend endpoints.</span></button> */}
                    </div>
                </section>}

                {mode === "list" && kind === "lyrics" && !showArtistManagement && !showAudioManagement && <section className="admin-table admin-record-list">
                    <div className="admin-list-toolbar"><label className="search-box admin-search"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={kind === "lyrics" ? "Search lyrics" : "Search Surah or Ayah"} aria-label={kind === "lyrics" ? "Search lyrics" : "Search Quran records"} /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select><button className="btn btn-primary" onClick={() => startCreate()}><Icon name="pen" size={16} />New record</button></div>
                    {visibleRecords.length ? <div className="admin-records">{visibleRecords.map((record) => <article key={record.id}>
                        <button className="admin-record-summary" onClick={() => { setSelectedId(record.id); setMode("detail"); }}><b>{kind === "lyrics" ? record.title || record.slug : `${surahData[record.surahNumber - 1]?.[1] || "Surah"} ${record.surahNumber}:${record.ayahNumber}`}</b><small>{record.id}</small><span className={`status ${record.status}`}>{record.status}</span></button>
                        <div className="admin-record-actions"><button onClick={() => { setSelectedId(record.id); setMode("detail"); }}>View</button><button onClick={() => startEdit(record)}>Edit</button><button onClick={() => togglePublished(record)}>{record.status === "published" ? "Unpublish" : "Publish"}</button><button className="danger-action" onClick={() => deleteRecord(record)}>Delete</button></div>
                    </article>)}</div> : <div className="admin-empty"><Icon name="search" size={24} /><b>{query || statusFilter !== "all" ? "No matching records" : "No records yet"}</b><span>{query || statusFilter !== "all" ? "Adjust the search or status filter." : "Create a record to begin."}</span></div>}
                </section>}

                {mode === "detail" && kind === "lyrics" && !showArtistManagement && !showAudioManagement && selectedRecord && <section className="admin-detail form-card">
                    <div className="admin-detail-heading"><div><span className={`status ${selectedRecord.status}`}>{selectedRecord.status}</span><h2>{kind === "lyrics" ? selectedRecord.title : `${surahData[selectedRecord.surahNumber - 1]?.[1]} ${selectedRecord.surahNumber}:${selectedRecord.ayahNumber}`}</h2><small>{selectedRecord.id}</small></div><div><button onClick={() => startEdit(selectedRecord)}>Edit</button><button onClick={() => togglePublished(selectedRecord)}>{selectedRecord.status === "published" ? "Unpublish" : "Publish"}</button><button className="danger-action" onClick={() => deleteRecord(selectedRecord)}>Delete</button></div></div>
                    {kind === "lyrics" ? <><p><b>Reciters:</b> {getReciters(selectedRecord, reciterRecords).join(", ") || "Not supplied"}</p><p><b>Written by:</b> {selectedRecord.writer || poets.find((poet) => String(poet.id) === String(selectedRecord.writerId))?.name || "Not supplied"}</p>{selectedRecord.languageVersions?.map((version: any) => <section key={version.code} lang={version.code} dir={version.dir || "ltr"}><h3>{version.label}</h3>{isLyricDocument(version.document) ? <LyricDocumentView document={version.document} language={version.code} dir={version.dir || "ltr"} /> : <pre className="admin-preserved-text">{version.text}</pre>}</section>)}<p><b>Related video URLs:</b> {(selectedRecord.relatedVideos || []).map((video: any) => video.url).filter(Boolean).join(" · ") || "None"}</p></> : <><p className="admin-arabic-preview" lang="ar" dir="rtl">{selectedRecord.arabic || "Arabic text not supplied"}</p>{Object.entries(selectedRecord.translations || {}).map(([code, text]) => <p key={code} lang={code} dir={code === "ur" ? "rtl" : "ltr"}><b>{code.toUpperCase()}:</b> {String(text)}</p>)}</>}
                </section>}

                {mode === "detail" && kind === "lyrics" && !showArtistManagement && !showAudioManagement && !selectedRecord && <div className="admin-empty"><b>Record unavailable</b><button onClick={() => setMode("list")}>Return to list</button></div>}

                {mode === "form" && kind === "lyrics" && !showArtistManagement && !showAudioManagement && <form className="editor-form admin-content-form" onSubmit={handleSave}>
                    {kind === "lyrics" ? <>
                        <section className="form-card"><h2>Lyrics details</h2><label className="field"><span>Title *</span><input required value={draft.title} onChange={(event) => { const title = event.target.value; setDraft((current: any) => ({ ...current, title, slug: current.slug || slugifyLyricsTitle(title) })); }} /></label><label className="field"><span>Slug / URL identifier</span><input required value={draft.slug} onChange={(event) => setField("slug", slugifyLyricsTitle(event.target.value))} /></label>
                            <div className="field reciter-selector"><span>Reciters</span><label className="sr-only" htmlFor="reciter-search">Search reciters</label><input id="reciter-search" type="search" value={reciterQuery} onChange={(event) => setReciterQuery(event.target.value)} placeholder="Search reciters…" /><div className="reciter-selected-chips">{draft.reciterIds.map((id: string) => { const profile = reciterRecords.find((entry) => entry.id === id); return <span key={id}>{profile?.name || id}<button type="button" aria-label={`Remove ${profile?.name || id}`} onClick={() => setField("reciterIds", draft.reciterIds.filter((current: string) => current !== id))}>×</button></span>; })}{draft.legacyReciters.map((name: string) => <span key={name}>{name}<button type="button" aria-label={`Remove ${name}`} onClick={() => setField("legacyReciters", draft.legacyReciters.filter((current: string) => current !== name))}>×</button></span>)}</div><div className="reciter-option-list" role="group" aria-label="Available reciters">{reciterRecords.filter((profile) => (profile.status === "active" || draft.reciterIds.includes(profile.id)) && profile.name.toLowerCase().includes(reciterQuery.trim().toLowerCase())).map((profile) => <label key={profile.id}><input type="checkbox" checked={draft.reciterIds.includes(profile.id)} disabled={profile.status !== "active" && !draft.reciterIds.includes(profile.id)} onChange={(event) => setField("reciterIds", event.target.checked ? [...draft.reciterIds, profile.id] : draft.reciterIds.filter((id: string) => id !== profile.id))} />{profile.name}{profile.status === "inactive" ? " (inactive)" : ""}</label>)}</div>{!reciterRecords.length && <p className="form-help">No reciter profiles are available yet.</p>}<button type="button" className="reciter-manage-link" onClick={() => setShowReciterManagement(true)}>Manage reciters</button></div><label className="field"><span>Written by / poet / author</span><input value={draft.writer} onChange={(event) => setField("writer", event.target.value)} list="known-poets" /><datalist id="known-poets">{poets.map((poet) => <option key={poet.id} value={poet.name} />)}</datalist></label>
                            <label className="field"><span>Source book</span><select value={draft.bookId} onChange={(event) => setField("bookId", event.target.value)}><option value="">No book selected</option>{lyricBooks.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select></label>
                            <fieldset className="admin-choice-group"><legend>Categories</legend>{lyricCategories.map((category) => <label key={category.id}><input type="checkbox" checked={draft.categoryIds.includes(category.id)} onChange={(event) => setField("categoryIds", event.target.checked ? [...draft.categoryIds, category.id] : draft.categoryIds.filter((id: string) => id !== category.id))} />{category.name}</label>)}</fieldset>
                            <fieldset className="admin-choice-group"><legend>Subjects</legend>{lyricSubjects.map((subject) => <label key={subject.id}><input type="checkbox" checked={draft.subjectIds.includes(subject.id)} onChange={(event) => setField("subjectIds", event.target.checked ? [...draft.subjectIds, subject.id] : draft.subjectIds.filter((id: string) => id !== subject.id))} />{subject.name}</label>)}</fieldset>
                            <label className="field"><span>Tags (comma separated)</span><input value={draft.tags} onChange={(event) => setField("tags", event.target.value)} /></label><label className="field"><span>Related YouTube URLs (one per line)</span><textarea rows={4} value={draft.relatedVideoUrls} onChange={(event) => setField("relatedVideoUrls", event.target.value)} placeholder="https://youtu.be/…" /></label>
                        </section>
                        <section className="form-card lyrics-editor-form-card"><h2>Lyrics content by language</h2><p className="form-help">Enter only verified lyrics. Empty language fields are not published.</p><LyricsEditor documents={draft.documents || {}} onChange={(code, document) => setDraft((current: any) => ({ ...current, documents: { ...current.documents, [code]: document }, versions: { ...current.versions, [code]: lyricDocumentToText(document) } }))} /><label className="field"><span>Publication status</span><select value={draft.status} onChange={(event) => setField("status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label></section>
                    </> : <section className="form-card"><h2>Quran Ayah content</h2><p className="form-help">This editor covers local Ayah records only. Missing verses are not generated or implied complete.</p><div className="two-fields"><label className="field"><span>Surah *</span><select value={draft.surahNumber} onChange={(event) => setField("surahNumber", event.target.value)}>{surahData.map((surah, index) => <option value={index + 1} key={index}>{index + 1}. {surah[1]}</option>)}</select></label><label className="field"><span>Ayah number *</span><input type="number" min="1" max={surahData[Number(draft.surahNumber) - 1]?.[2] || 1} value={draft.ayahNumber} onChange={(event) => setField("ayahNumber", event.target.value)} /></label></div><label className="field"><span>Arabic text</span><textarea lang="ar" dir="rtl" rows={5} value={draft.arabic} onChange={(event) => setField("arabic", event.target.value)} /></label>{languageOptions.map((language) => <label className="field" key={language.code}><span>{language.label} translation</span><textarea lang={language.code} dir={language.dir} rows={4} value={draft.translations[language.code]} onChange={(event) => setDraft((current: any) => ({ ...current, translations: { ...current.translations, [language.code]: event.target.value } }))} /></label>)}<label className="field"><span>Publication status</span><select value={draft.status} onChange={(event) => setField("status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label></section>}
                    <div className="admin-form-actions"><button type="button" onClick={() => { if (JSON.stringify(draft) !== draftBaseline.current && !window.confirm("Discard your unsaved changes?")) return; setMode(selectedId ? "detail" : "list"); }}>Cancel</button><button className="btn btn-primary" type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Save record"}</button></div>
                </form>}
            </div>
        </main>
    );
}
