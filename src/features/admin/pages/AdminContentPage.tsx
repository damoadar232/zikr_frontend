import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useContentCollection } from "../../../app/hooks/useContentCollection";
import { LocalizedText, useInterfaceText } from "../../../app/providers/interfaceLanguage";
import { Icon, Logo } from "../../../components/ui";
import { lyrics as initialLyrics, artists, lyricBooks, lyricCategories, lyricSubjects, poets } from "../../../lyricsData";
import { quranAyahRecords } from "../../quran/data/quranData";
import { surahData } from "../../quran/data/surahMetadata";
import { contentRepository } from "../services/contentRepository.js";
import { getYouTubeVideoId, slugifyLyricsTitle } from "../../lyrics/utils/youtubeVideo.js";
import { isLyricDocument, lyricDocumentToText, textToLyricDocument } from "../../lyrics/utils/lyricDocument.js";
import { LyricDocumentView } from "../../lyrics/components/LyricRichText";
import { LyricsEditor } from "../components/LyricsEditor";

type ContentKind = "lyrics" | "quranAyahs";
type PageMode = "dashboard" | "list" | "form" | "detail";
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

function getReciters(record: AdminRecord) {
    if (Array.isArray(record.reciters) && record.reciters.length) return record.reciters;
    const ids = Array.isArray(record.artistIds) && record.artistIds.length ? record.artistIds : [record.artistId];
    return ids.filter(Boolean).map((id: string) => artists.find((artist) => artist.id === id)?.name || id);
}

function getLyricsDraft(record?: AdminRecord) {
    const versions = Object.fromEntries(languageOptions.map(({ code }) => [code, record?.languageVersions?.find((version: any) => version.code === code)?.text || ""]));
    const documents = Object.fromEntries(languageOptions.map(({ code }) => {
        const version = record?.languageVersions?.find((item: any) => item.code === code);
        return [code, isLyricDocument(version?.document) ? version.document : textToLyricDocument(version?.text || "")];
    }));
    const videos = (record?.relatedVideos || []).map((video: any) => video.url).filter(Boolean).join("\n");
    return {
        title: record?.title || "",
        slug: record?.slug || "",
        reciters: record ? getReciters(record).join("\n") : "",
        writer: record?.writer || poets.find((poet) => poet.id === record?.writerId)?.name || "",
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

export function AdminContentPage({ edit = false, go, isLoggedIn, onLogout }: { edit?: boolean; go: (route: string) => void; isLoggedIn: boolean; onLogout?: () => void }) {
    const t = useInterfaceText();
    const lyricRecords = useContentCollection<AdminRecord>("lyrics", initialLyrics as AdminRecord[]);
    const quranRecords = useContentCollection<AdminRecord>("quranAyahs", quranAyahRecords as AdminRecord[]);
    const [mode, setMode] = useState<PageMode>(edit ? "form" : "dashboard");
    const [kind, setKind] = useState<ContentKind>("lyrics");
    const [selectedId, setSelectedId] = useState("");
    const [draft, setDraft] = useState<any>(() => getLyricsDraft());
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const draftBaseline = useRef(JSON.stringify(getLyricsDraft()));

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
        setMessage("");
        setError("");
        setMode("list");
    };

    const startCreate = (nextKind = kind) => {
        setKind(nextKind);
        setSelectedId("");
        const nextDraft = nextKind === "lyrics" ? getLyricsDraft() : getQuranDraft();
        setDraft(nextDraft);
        draftBaseline.current = JSON.stringify(nextDraft);
        setError("");
        setMessage("");
        setMode("form");
    };

    const startEdit = (record: AdminRecord) => {
        setSelectedId(record.id);
        const nextDraft = kind === "lyrics" ? getLyricsDraft(record) : getQuranDraft(record);
        setDraft(nextDraft);
        draftBaseline.current = JSON.stringify(nextDraft);
        setError("");
        setMessage("");
        setMode("form");
    };

    const setField = (name: string, value: unknown) => setDraft((current: any) => ({ ...current, [name]: value }));

    const handleSave = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setMessage("");
        setIsSaving(true);
        try {
            if (kind === "lyrics") {
                const title = String(draft.title || "").trim();
                const slug = String(draft.slug || "").trim() || slugifyLyricsTitle(title);
                const richLanguageCodes = ["ur", "hi", "en"];
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
                if (!title) throw new Error("A lyrics title is required.");
                if (!versions.length) throw new Error("Add the existing lyrics text in at least one language.");
                const reciters = splitLines(String(draft.reciters || ""));
                const artistIds = reciters.map((name) => artists.find((artist) => artist.name.toLowerCase() === name.toLowerCase())?.id).filter(Boolean);
                const tags = String(draft.tags || "").split(",").map((tag: string) => tag.trim()).filter(Boolean);
                const videoUrls = splitLines(String(draft.relatedVideoUrls || ""));
                const existingUrls = (selectedRecord?.relatedVideos || []).map((video: any) => video.url);
                const invalidVideo = videoUrls.find((url) => !getYouTubeVideoId(url) && !existingUrls.includes(url));
                if (invalidVideo) throw new Error(`Use a valid HTTPS YouTube URL: ${invalidVideo}`);
                const relatedVideos = videoUrls.map((url) => selectedRecord?.relatedVideos?.find((video: any) => video.url === url) || { url });
                const writerId = poets.find((poet) => poet.name.toLowerCase() === String(draft.writer || "").trim().toLowerCase())?.id || "";
                const record: AdminRecord = {
                    ...selectedRecord,
                    id: selectedId || slug,
                    title,
                    slug,
                    reciters,
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
                const surahNumber = Number(draft.surahNumber);
                const ayahNumber = Number(draft.ayahNumber);
                const chapter = surahData[surahNumber - 1];
                const translations = Object.fromEntries(languageOptions.map(({ code }) => [code, String(draft.translations?.[code] || "").trim()]).filter(([, text]) => text));
                if (!chapter || !Number.isInteger(ayahNumber) || ayahNumber < 1 || ayahNumber > chapter[2]) throw new Error("Choose a Surah and Ayah within the existing chapter metadata.");
                if (!String(draft.arabic || "").trim() && !Object.keys(translations).length) throw new Error("Enter existing Arabic text or at least one translation.");
                const id = `${surahNumber}:${ayahNumber}`;
                const record: AdminRecord = { ...selectedRecord, id, surahNumber, ayahNumber, arabic: String(draft.arabic || "").trim(), translations, status: draft.status };
                let nextRecords: AdminRecord[];
                if (selectedId && id === selectedId) nextRecords = contentRepository.update("quranAyahs", selectedId, record, quranAyahRecords as AdminRecord[]);
                else {
                    if (records.some((item) => item.id === id)) throw new Error("This Surah and Ayah already have a record. Edit that record instead.");
                    nextRecords = contentRepository.create("quranAyahs", record, quranAyahRecords as AdminRecord[]);
                    if (selectedId) contentRepository.replace("quranAyahs", nextRecords.filter((item) => item.id !== selectedId));
                }
                setSelectedId(id);
            }
            setMode("detail");
            setMessage("Saved to browser demo storage. This does not publish to a server.");
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "The record could not be saved.");
        } finally {
            setIsSaving(false);
        }
    };

    const togglePublished = (record: AdminRecord) => {
        try {
            contentRepository.update(kind, record.id, { status: record.status === "published" ? "draft" : "published" }, records);
            setMessage(record.status === "published" ? "Moved to draft in browser demo storage." : "Published in browser demo storage.");
            setError("");
        } catch (updateError) {
            setError(updateError instanceof Error ? updateError.message : "The record could not be updated.");
        }
    };

    const deleteRecord = (record: AdminRecord) => {
        if (!window.confirm(`Delete ${kind === "lyrics" ? record.title : record.id}? This cannot be undone in this browser.`)) return;
        try {
            contentRepository.remove(kind, record.id, records);
            setSelectedId("");
            setMode("list");
            setMessage("Deleted from browser demo storage.");
            setError("");
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "The record could not be deleted.");
        }
    };

    if (!isLoggedIn) {
        return <main className="admin-access"><Logo /><h1>Admin sign-in required</h1><p>Sign in with your administrator credentials to access the content admin panel.</p><button className="btn btn-primary" onClick={() => go("login")}>Sign in</button></main>;
    }

    return (
        <main className="admin admin-content-management">
            <aside>
                <Logo />
                <small>CONTENT ADMIN · BROWSER DEMO</small>
                <button className={mode === "dashboard" ? "active" : ""} onClick={() => setMode("dashboard")}><Icon name="grid" size={17} />Dashboard</button>
                <button className={kind === "lyrics" && mode !== "dashboard" ? "active" : ""} onClick={() => openList("lyrics")}><Icon name="pen" size={17} />Lyrics Management</button>
                <button className={kind === "quranAyahs" && mode !== "dashboard" ? "active" : ""} onClick={() => openList("quranAyahs")}><Icon name="book" size={17} />Quran Management</button>
                <button className="admin-signout" onClick={() => onLogout?.()}><Icon name="x" size={17} />Sign out</button>
            </aside>
            <div className="admin-main">
                <header><div><small>ADMINISTRATION</small><h1>{mode === "dashboard" ? "Content dashboard" : `${kind === "lyrics" ? "Lyrics" : "Quran Ayah"} management`}</h1></div><span className="admin-demo-badge">Browser demo storage</span></header>
                <div className="admin-demo-warning" role="note">Changes persist in this browser only. This frontend has no backend API or secure administrator authorization.</div>
                {message && <p className="admin-success" role="status">{message}</p>}
                <ErrorMessage message={error} />

                {mode === "dashboard" && <section className="admin-dashboard-content">
                    <div className="stat-grid"><article><span>{lyricRecords.filter((item) => item.status === "published").length}</span><small>Published lyrics</small></article><article><span>{lyricRecords.filter((item) => item.status === "draft").length}</span><small>Lyrics drafts</small></article><article><span>{quranRecords.length}</span><small>Managed Quran Ayahs</small></article><article><span>{quranRecords.filter((item) => item.status === "published").length}</span><small>Published Quran Ayahs</small></article></div>
                    <div className="admin-content-shortcuts"><button onClick={() => openList("lyrics")}><b>Lyrics Management</b><span>View, search, edit, and publish lyric records.</span></button><button onClick={() => openList("quranAyahs")}><b>Quran Management</b><span>Manage only Ayahs present in the supported local model.</span></button></div>
                </section>}

                {mode === "list" && <section className="admin-table admin-record-list">
                    <div className="admin-list-toolbar"><label className="search-box admin-search"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={kind === "lyrics" ? "Search lyrics" : "Search Surah or Ayah"} aria-label={kind === "lyrics" ? "Search lyrics" : "Search Quran records"} /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select><button className="btn btn-primary" onClick={() => startCreate()}><Icon name="pen" size={16} />New record</button></div>
                    {visibleRecords.length ? <div className="admin-records">{visibleRecords.map((record) => <article key={record.id}>
                        <button className="admin-record-summary" onClick={() => { setSelectedId(record.id); setMode("detail"); }}><b>{kind === "lyrics" ? record.title || record.slug : `${surahData[record.surahNumber - 1]?.[1] || "Surah"} ${record.surahNumber}:${record.ayahNumber}`}</b><small>{record.id}</small><span className={`status ${record.status}`}>{record.status}</span></button>
                        <div className="admin-record-actions"><button onClick={() => { setSelectedId(record.id); setMode("detail"); }}>View</button><button onClick={() => startEdit(record)}>Edit</button><button onClick={() => togglePublished(record)}>{record.status === "published" ? "Unpublish" : "Publish"}</button><button className="danger-action" onClick={() => deleteRecord(record)}>Delete</button></div>
                    </article>)}</div> : <div className="admin-empty"><Icon name="search" size={24} /><b>{query || statusFilter !== "all" ? "No matching records" : "No records yet"}</b><span>{query || statusFilter !== "all" ? "Adjust the search or status filter." : "Create a record to begin."}</span></div>}
                </section>}

                {mode === "detail" && selectedRecord && <section className="admin-detail form-card">
                    <div className="admin-detail-heading"><div><span className={`status ${selectedRecord.status}`}>{selectedRecord.status}</span><h2>{kind === "lyrics" ? selectedRecord.title : `${surahData[selectedRecord.surahNumber - 1]?.[1]} ${selectedRecord.surahNumber}:${selectedRecord.ayahNumber}`}</h2><small>{selectedRecord.id}</small></div><div><button onClick={() => startEdit(selectedRecord)}>Edit</button><button onClick={() => togglePublished(selectedRecord)}>{selectedRecord.status === "published" ? "Unpublish" : "Publish"}</button><button className="danger-action" onClick={() => deleteRecord(selectedRecord)}>Delete</button></div></div>
                    {kind === "lyrics" ? <><p><b>Reciters:</b> {getReciters(selectedRecord).join(", ") || "Not supplied"}</p><p><b>Written by:</b> {selectedRecord.writer || poets.find((poet) => poet.id === selectedRecord.writerId)?.name || "Not supplied"}</p>{selectedRecord.languageVersions?.map((version: any) => <section key={version.code} lang={version.code} dir={version.dir || "ltr"}><h3>{version.label}</h3>{isLyricDocument(version.document) ? <LyricDocumentView document={version.document} language={version.code} dir={version.dir || "ltr"} /> : <pre className="admin-preserved-text">{version.text}</pre>}</section>)}<p><b>Related video URLs:</b> {(selectedRecord.relatedVideos || []).map((video: any) => video.url).filter(Boolean).join(" · ") || "None"}</p></> : <><p className="admin-arabic-preview" lang="ar" dir="rtl">{selectedRecord.arabic || "Arabic text not supplied"}</p>{Object.entries(selectedRecord.translations || {}).map(([code, text]) => <p key={code} lang={code} dir={code === "ur" ? "rtl" : "ltr"}><b>{code.toUpperCase()}:</b> {String(text)}</p>)}</>}
                </section>}

                {mode === "detail" && !selectedRecord && <div className="admin-empty"><b>Record unavailable</b><button onClick={() => setMode("list")}>Return to list</button></div>}

                {mode === "form" && <form className="editor-form admin-content-form" onSubmit={handleSave}>
                    {kind === "lyrics" ? <>
                        <section className="form-card"><h2>Lyrics details</h2><label className="field"><span>Title *</span><input required value={draft.title} onChange={(event) => { const title = event.target.value; setDraft((current: any) => ({ ...current, title, slug: current.slug || slugifyLyricsTitle(title) })); }} /></label><label className="field"><span>Slug / URL identifier</span><input required value={draft.slug} onChange={(event) => setField("slug", slugifyLyricsTitle(event.target.value))} /></label>
                            <label className="field"><span>Reciters (one per line)</span><textarea rows={3} value={draft.reciters} onChange={(event) => setField("reciters", event.target.value)} placeholder="Use only verified or editor-supplied names" /></label><label className="field"><span>Written by / poet / author</span><input value={draft.writer} onChange={(event) => setField("writer", event.target.value)} list="known-poets" /><datalist id="known-poets">{poets.map((poet) => <option key={poet.id} value={poet.name} />)}</datalist></label>
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
