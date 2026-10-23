import { useEffect, useState, type FormEvent } from "react";
import type { JSONContent } from "@tiptap/core";
import { Icon } from "../../../components/ui";
import { lyricCategories, lyricBooks, lyricSubjects } from "../../../lyricsData";
import { LyricsEditor } from "./LyricsEditor";
import { SearchableMultiSelect, type SearchableMultiSelectOption } from "./SearchableMultiSelect";
import { LyricDocumentView } from "../../lyrics/components/LyricRichText";
import { artistsApi } from "../../artists/services/artistsApiService.js";
import type { ApiArtistOption, ApiArtistRoleCode } from "../../artists/services/artistsApiService.js";
import { lyricsApi } from "../../lyrics/services/lyricsApiService.js";
import type { ApiAdminLyric, ApiContentStatus, ApiLyricLanguage, ApiPage, CombinedLyricsCreateRequest, CombinedLyricsUpdateRequest, LyricsMetadataRequest } from "../../lyrics/services/lyricsApiService.js";
import { slugifyLyricsTitle } from "../../lyrics/utils/youtubeVideo.js";

const pageSize = 20;
const languages: Array<{ code: ApiLyricLanguage; editorCode: string }> = [
    { code: "ur", editorCode: "ur" },
    { code: "hi", editorCode: "hi" },
    { code: "roman", editorCode: "en" },
];

function emptyDocument(): JSONContent {
    return { type: "doc", content: [{ type: "paragraph" }] };
}

function docsForEditor(record?: ApiAdminLyric) {
    return Object.fromEntries(languages.map(({ code, editorCode }) => [
        editorCode,
        record?.languageVersions.find((version) => version.languageCode === code)?.document || emptyDocument(),
    ]));
}

function hasText(document: JSONContent): boolean {
    if (document.type === "text" && document.text?.trim()) return true;
    return (document.content || []).some(hasText);
}

function languageLabel(code: string) {
    return ({ ur: "Urdu", hi: "Hindi", roman: "Roman English" } as Record<string, string>)[code] || code;
}

function lyricDate(value: string | null | undefined) {
    if (!value) return "Not available";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

type FormState = {
    title: string;
    slug: string;
    writerId: string;
    writerName: string;
    categoryIds: string[];
    subjectIds: string[];
    tags: string;
    bookId: string;
    reciterIds: string[];
    reciterNames: Record<string, string>;
    preservedReciterNames: string[];
};

function artistLabel(artist: Pick<ApiArtistOption, "displayName" | "fullName">) {
    return artist.displayName?.trim() || artist.fullName;
}

function numericOrLegacyArtistId(id: string): number | string {
    return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) ? Number(id) : id;
}

const categoryNumericIds: Record<string, number> = {
    hamd: 1,
    "durood-o-salam": 2,
    manqabat: 3,
    "naat-sharif": 4,
    qawwali: 5,
    "sufi-kalam": 6,
};

const subjectNumericIds: Record<string, number> = {
    eid: 1,
    karbala: 2,
    madina: 3,
    mercy: 4,
    namaz: 5,
    prophet: 6,
    ramadan: 7,
    tawakkul: 8,
};

function numericReferenceIds(ids: string[], mapping: Record<string, number>, label: string): number[] {
    return ids.map((id) => {
        const numericId = mapping[id];
        if (numericId === undefined) {
            throw new Error(`The selected ${label} is not supported by the backend numeric reference mapping.`);
        }
        return numericId;
    });
}

function numericArtistIds(ids: string[]): number[] {
    return ids.map((id) => {
        const numericId = Number(id);
        if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(numericId)) {
            throw new Error("A selected artist does not have a valid numeric database ID.");
        }
        return numericId;
    });
}

function sameValues(left: string[], right: string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function optionsForRoles(roles: ApiArtistRoleCode[], query: string) {
    return Promise.all(roles.map((role) => artistsApi.getArtistOptions({ role, query: query || undefined })))
        .then((groups) => [...new Map(groups.flat().map((artist) => [artist.id, artist])).values()]);
}

function formForRecord(
    record?: ApiAdminLyric,
    writerOptions: ApiArtistOption[] = [],
    reciterOptions: ApiArtistOption[] = [],
): FormState {
    const writerName = record?.writer || "";
    const writerById = writerOptions.find((artist) =>
        String(artist.id) === String(record?.writerId) || artist.artistKey === String(record?.writerId));
    const matchedWriter = writerName
        ? writerOptions.find((artist) => [artist.fullName, artist.displayName].some((name) => name?.toLowerCase() === writerName.toLowerCase()))
        : undefined;
    const writer = writerById || matchedWriter;
    const optionsByName = new Map<string, string>();
    reciterOptions.forEach((artist) => {
        optionsByName.set(artist.fullName.toLowerCase(), String(artist.id));
        if (artist.displayName) optionsByName.set(artist.displayName.toLowerCase(), String(artist.id));
    });
    const existingReferences = [...new Set([...(record?.artistIds || []), ...(record?.artistId ? [record.artistId] : [])])];
    const existingIds = existingReferences.map((reference) => {
        const artist = reciterOptions.find((option) =>
            String(option.id) === String(reference) || option.artistKey === String(reference));
        return artist ? String(artist.id) : String(reference);
    });
    const reciterIds = [...new Set([
        ...existingIds,
        ...(record?.reciters || []).map((name) => optionsByName.get(name.toLowerCase())).filter((id): id is string => !!id),
    ])];
    const reciterNames: Record<string, string> = {};
    reciterIds.forEach((id) => {
        const artist = reciterOptions.find((option) => String(option.id) === id);
        if (artist) reciterNames[id] = artistLabel(artist);
    });
    const selectedReciterNames = new Set(reciterIds
        .map((id) => reciterOptions.find((artist) => String(artist.id) === id))
        .filter((artist): artist is ApiArtistOption => !!artist)
        .flatMap((artist) => [artist.fullName.toLowerCase(), artist.displayName?.toLowerCase()].filter((name): name is string => !!name)));
    return {
        title: record?.title || "",
        slug: record?.slug || "",
        writerId: writer ? String(writer.id) : String(record?.writerId ?? ""),
        writerName: writer ? artistLabel(writer) : writerName,
        categoryIds: record?.categoryIds || [],
        subjectIds: record?.subjectIds || [],
        tags: (record?.tags || []).join(", "),
        bookId: record?.bookId || "",
        reciterIds,
        reciterNames,
        preservedReciterNames: (record?.reciters || []).filter((name) => !selectedReciterNames.has(name.toLowerCase())),
    };
}

export function AdminLyricsManagement() {
    const [result, setResult] = useState<ApiPage<ApiAdminLyric> | null>(null);
    const [page, setPage] = useState(0);
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [editing, setEditing] = useState<ApiAdminLyric | null>(null);
    const [viewingId, setViewingId] = useState<number | null>(null);
    const [viewing, setViewing] = useState<ApiAdminLyric | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");
    const [detailLanguage, setDetailLanguage] = useState<ApiLyricLanguage | null>(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState<FormState>(() => formForRecord());
    const [documents, setDocuments] = useState<Record<string, JSONContent>>(() => docsForEditor());
    const [writerOptions, setWriterOptions] = useState<ApiArtistOption[]>([]);
    const [reciterOptions, setReciterOptions] = useState<ApiArtistOption[]>([]);
    const [writerOptionsLoading, setWriterOptionsLoading] = useState(true);
    const [reciterOptionsLoading, setReciterOptionsLoading] = useState(true);
    const [writerOptionsError, setWriterOptionsError] = useState("");
    const [reciterOptionsError, setReciterOptionsError] = useState("");
    const [writerQuery, setWriterQuery] = useState("");
    const [debouncedWriterQuery, setDebouncedWriterQuery] = useState("");
    const [writerOptionsRequestId, setWriterOptionsRequestId] = useState(0);
    const [reciterOptionsRequestId, setReciterOptionsRequestId] = useState(0);
    const artistOptionsLoading = writerOptionsLoading || reciterOptionsLoading;
    const artistOptionsError = writerOptionsError || reciterOptionsError;

    useEffect(() => {
        let current = true;
        setWriterOptionsLoading(true);
        setWriterOptionsError("");
        void optionsForRoles(["WRITER", "LYRICIST", "POET"], debouncedWriterQuery)
            .then((options) => { if (current) setWriterOptions(options); })
            .catch((loadError: unknown) => {
                if (current) setWriterOptionsError(loadError instanceof Error ? loadError.message : "Writer options could not be loaded.");
            })
            .finally(() => { if (current) setWriterOptionsLoading(false); });
        return () => { current = false; };
    }, [debouncedWriterQuery, writerOptionsRequestId]);

    useEffect(() => {
        let current = true;
        setReciterOptionsLoading(true);
        setReciterOptionsError("");
        void artistsApi.getArtistOptions({ role: "RECITER" })
            .then((options) => { if (current) setReciterOptions(options); })
            .catch((loadError: unknown) => {
                if (current) setReciterOptionsError(loadError instanceof Error ? loadError.message : "Reciter options could not be loaded.");
            })
            .finally(() => { if (current) setReciterOptionsLoading(false); });
        return () => { current = false; };
    }, [reciterOptionsRequestId]);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedWriterQuery(writerQuery.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [writerQuery]);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        let current = true;
        setLoading(true);
        setError("");
        void lyricsApi.listAdminLyrics({
            page,
            size: pageSize,
            query: debouncedQuery,
            status: status ? status as ApiContentStatus : undefined,
        }).then((data) => {
            if (current) setResult(data);
        }).catch((loadError: unknown) => {
            if (current) setError(loadError instanceof Error ? loadError.message : "Lyrics could not be loaded from the API.");
        }).finally(() => {
            if (current) setLoading(false);
        });
        return () => { current = false; };
    }, [page, debouncedQuery, status]);

    const records = result?.items || [];
    const totalPages = result?.totalPages || 0;
    const refresh = async () => {
        setLoading(true);
        setError("");
        try {
            const next = await lyricsApi.listAdminLyrics({
                page, size: pageSize, query: debouncedQuery,
                status: status ? status as ApiContentStatus : undefined,
            });
            setResult(next);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Lyrics could not be refreshed from the API.");
        } finally {
            setLoading(false);
        }
    };

    const startCreate = () => {
        setViewingId(null);
        setViewing(null);
        setEditing(null);
        setCreating(true);
        setForm(formForRecord(undefined, writerOptions, reciterOptions));
        setDocuments(docsForEditor());
        setError("");
        setNotice("");
    };

    const startEdit = async (summary: ApiAdminLyric) => {
        setViewingId(null);
        setViewing(null);
        setError("");
        setNotice("");
        setLoading(true);
        try {
            const record = await lyricsApi.loadLyricForEditing(String(summary.id));
            setEditing(record);
            setCreating(false);
            setForm(formForRecord(record, writerOptions, reciterOptions));
            setDocuments(docsForEditor(record));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "The selected lyric could not be loaded for editing.");
        } finally {
            setLoading(false);
        }
    };

    const openDetails = async (summary: ApiAdminLyric) => {
        setViewingId(summary.id);
        setViewing(null);
        setDetailLoading(true);
        setDetailError("");
        setDetailLanguage(null);
        try {
            const record = await lyricsApi.loadLyricForEditing(String(summary.id));
            setViewing(record);
            setDetailLanguage(record.languageVersions[0]?.languageCode || null);
        } catch (loadError) {
            setDetailError(loadError instanceof Error ? loadError.message : "The selected lyric details could not be loaded.");
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetails = () => {
        setViewingId(null);
        setViewing(null);
        setDetailError("");
        setDetailLanguage(null);
    };

    const closeForm = () => {
        setEditing(null);
        setCreating(false);
        setError("");
    };

    const save = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const title = form.title.trim();
        if (!title) {
            setError("Enter a title before saving.");
            return;
        }
        if (artistOptionsLoading) {
            setError("Wait for writer and reciter options to finish loading before saving.");
            return;
        }
        if (artistOptionsError) {
            setError("Artist options could not be loaded. Retry the affected artist fields before saving.");
            return;
        }
        setSaving(true);
        setError("");
        setNotice("");
        let metadataSaved = false;
        try {
            const selectedWriter = writerOptions.find((artist) => String(artist.id) === form.writerId);
            const selectedReciterNames = form.reciterIds
                .map((id) => {
                    const artist = reciterOptions.find((option) => String(option.id) === id);
                    return form.reciterNames[id] || (artist ? artistLabel(artist) : undefined);
                })
                .filter((name): name is string => typeof name === "string" && !!name);
            const metadata: LyricsMetadataRequest = {
                title,
                slug: form.slug.trim() || slugifyLyricsTitle(title),
                writerId: form.writerId ? numericOrLegacyArtistId(form.writerId) : null,
                writerName: (selectedWriter ? artistLabel(selectedWriter) : form.writerName).trim() || null,
                categoryIds: form.categoryIds,
                subjectIds: form.subjectIds,
                tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
                bookId: form.bookId || null,
                artistId: editing?.artistId != null && form.reciterIds.includes(String(editing.artistId))
                    ? editing.artistId
                    : form.reciterIds[0] ? numericOrLegacyArtistId(form.reciterIds[0]) : null,
                artistIds: [...new Set(form.reciterIds)].map(numericOrLegacyArtistId),
                reciters: [...new Set([
                    ...selectedReciterNames,
                    ...form.preservedReciterNames,
                ])],
                mediaReferences: editing?.mediaReferences || [],
                coverImageUrl: editing?.coverImageUrl || null,
                featured: editing?.featured || false,
            };
            let saved: ApiAdminLyric;
            if (creating) {
                const createRequest: CombinedLyricsCreateRequest = {
                    title: metadata.title,
                    slug: metadata.slug,
                    writerId: form.writerId ? Number(form.writerId) : null,
                    reciterIds: numericArtistIds([...new Set(form.reciterIds)]),
                    artistId: form.reciterIds[0] ? Number(form.reciterIds[0]) : null,
                    categoryIds: numericReferenceIds(form.categoryIds, categoryNumericIds, "category"),
                    subjectIds: numericReferenceIds(form.subjectIds, subjectNumericIds, "subject"),
                    tags: metadata.tags,
                    bookId: metadata.bookId,
                    featured: false,
                    mediaReferences: metadata.mediaReferences,
                };
                saved = await lyricsApi.createLyric(createRequest);
            } else {
                const originalForm = formForRecord(editing!, writerOptions, reciterOptions);
                const writerChanged = form.writerId !== originalForm.writerId;
                const recitersChanged = !sameValues(form.reciterIds, originalForm.reciterIds);
                const categoriesChanged = !sameValues(form.categoryIds, originalForm.categoryIds);
                const subjectsChanged = !sameValues(form.subjectIds, originalForm.subjectIds);
                const tags = metadata.tags || [];
                const originalTags = editing!.tags || [];
                const tagsChanged = !sameValues(tags, originalTags);
                const updateRequest: CombinedLyricsUpdateRequest = {
                    title: metadata.title,
                    slug: metadata.slug,
                    ...(writerChanged
                        ? { writerId: form.writerId ? numericArtistIds([form.writerId])[0] : null }
                        : {}),
                    ...(recitersChanged
                        ? { reciterIds: numericArtistIds([...new Set(form.reciterIds)]) }
                        : {}),
                    ...(categoriesChanged
                        ? { categoryIds: numericReferenceIds(form.categoryIds, categoryNumericIds, "category") }
                        : {}),
                    ...(subjectsChanged
                        ? { subjectIds: numericReferenceIds(form.subjectIds, subjectNumericIds, "subject") }
                        : {}),
                    ...(tagsChanged ? { tags } : {}),
                    ...(form.bookId !== (editing!.bookId || "") ? { bookId: form.bookId || null } : {}),
                };
                saved = await lyricsApi.updateLyricMetadata(String(editing!.id), updateRequest);
            }
            metadataSaved = true;
            const reference = String(saved.id);
            const previousVersions = editing?.languageVersions || [];
            const failedLanguages: Array<{ code: ApiLyricLanguage; reason: string }> = [];
            for (const { code, editorCode } of languages) {
                const document = documents[editorCode] || emptyDocument();
                const existing = previousVersions.find((version) => version.languageCode === code);
                const changed = JSON.stringify(existing?.document || emptyDocument()) !== JSON.stringify(document);
                if (changed || (creating && hasText(document))) {
                    try {
                        saved = await lyricsApi.saveLanguageVersion(reference, code, document, existing?.rowVersion ?? null);
                    } catch (languageError) {
                        failedLanguages.push({
                            code,
                            reason: languageError instanceof Error ? languageError.message : "The language version could not be saved.",
                        });
                    }
                }
            }
            if (failedLanguages.length > 0) {
                setCreating(false);
                setEditing(saved);
                await refresh();
                setError(
                    `Metadata was saved for lyric ID ${reference}, but these translations failed: ${failedLanguages
                        .map(({ code, reason }) => `${languageLabel(code)} (${reason})`)
                        .join("; ")}. Save again to retry using this lyric ID.`,
                );
                return;
            }
            setNotice("Lyrics saved to the authenticated API.");
            setCreating(false);
            setEditing(null);
            await refresh();
        } catch (saveError) {
            const reason = saveError instanceof Error ? saveError.message : "The lyric could not be saved.";
            setError(metadataSaved ? `Metadata was saved, but one or more language versions failed: ${reason}` : reason);
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (record: ApiAdminLyric) => {
        setError("");
        setNotice("");
        try {
            await lyricsApi.setLyricStatus(record.id.toString(), record.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED");
            setNotice("Publication status updated by the API.");
            await refresh();
        } catch (updateError) {
            setError(updateError instanceof Error ? updateError.message : "Publication status could not be updated.");
        }
    };

    const deleteRecord = async (record: ApiAdminLyric) => {
        if (!window.confirm(`Delete “${record.title}” from the server? This action cannot be undone.`)) return;
        setError("");
        setNotice("");
        try {
            await lyricsApi.deleteLyric(record.id.toString());
            setNotice("Lyric deleted from the authenticated API.");
            if (records.length === 1 && page > 0) setPage((current) => current - 1);
            else await refresh();
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "The lyric could not be deleted.");
        }
    };

    const writerChoices = form.writerId && !writerOptions.some((artist) => String(artist.id) === form.writerId)
        ? [...writerOptions, {
            id: form.writerId,
            fullName: form.writerName || "Previously assigned writer",
            displayName: null,
            roles: [],
            status: "ACTIVE" as const,
        }]
        : writerOptions;
    const missingReciterIds = form.reciterIds.filter((id) => !reciterOptions.some((artist) => String(artist.id) === id));
    const reciterChoices = [
        ...reciterOptions,
        ...missingReciterIds.map((id) => ({
            id,
            fullName: form.reciterNames[id] || "Previously assigned reciter",
            displayName: null,
            roles: [],
            status: "ACTIVE" as const,
        })),
    ];
    const legacyReciterOptions = form.preservedReciterNames.map((name, index) => ({
        value: `legacy-reciter:${index}`,
        label: name,
    }));
    const legacyReciterNames = new Map(legacyReciterOptions.map(({ value, label }) => [value, label]));
    const reciterSelectOptions: SearchableMultiSelectOption[] = [
        ...reciterChoices.map((artist) => ({
            value: String(artist.id),
            label: artistLabel(artist),
            description: artist.roles.length
                ? artist.roles.map((role) => role.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")).join(", ")
                : undefined,
        })),
        ...legacyReciterOptions,
    ];
    const reciterSelection = [...form.reciterIds, ...legacyReciterOptions.map(({ value }) => value)];
    const categoryOptions: SearchableMultiSelectOption[] = [
        ...lyricCategories.map(({ id, name }) => ({ value: id, label: name })),
        ...form.categoryIds.filter((id) => !lyricCategories.some((category) => category.id === id))
            .map((id) => ({ value: id, label: "Previously assigned category" })),
    ];
    const subjectOptions: SearchableMultiSelectOption[] = [
        ...lyricSubjects.map(({ id, name }) => ({ value: id, label: name })),
        ...form.subjectIds.filter((id) => !lyricSubjects.some((subject) => subject.id === id))
            .map((id) => ({ value: id, label: "Previously assigned subject" })),
    ];

    const openRecordDetails = (record: ApiAdminLyric) => {
        void openDetails(record);
    };
    const languageVersions = viewing?.languageVersions || [];
    const activeLanguageVersion = languageVersions.find((version) => version.languageCode === detailLanguage);
    const categoryLabels = (viewing?.categoryIds || []).map((id) =>
        lyricCategories.find((category) => category.id === id)?.name || id);
    const subjectLabels = (viewing?.subjectIds || []).map((id) =>
        lyricSubjects.find((subject) => subject.id === id)?.name || id);
    const bookLabel = lyricBooks.find((book) => book.id === viewing?.bookId)?.title || viewing?.bookId;

    return <section className="admin-api-lyrics">
        <div className="admin-api-heading">
            <div className="admin-api-heading-copy">
                {/* <h2>Lyrics Management</h2> */}
                <p>Review and manage lyrics stored in the authenticated backend.</p>
            </div>
            {!creating && !editing && viewingId === null && <button type="button" className="btn btn-primary" onClick={startCreate} disabled={artistOptionsLoading}><Icon name="pen" size={16} />Add Lyrics</button>}
            {!creating && !editing && viewingId !== null && <button type="button" className="btn btn-outline" onClick={closeDetails}>Back to lyrics</button>}
        </div>
        {notice && <p className="admin-success" role="status">{notice}</p>}
        {error && <p className="admin-form-error" role="alert">{error}</p>}

        {viewingId !== null && !creating && !editing ? <section className="admin-lyric-details" aria-labelledby="admin-lyric-details-title">
            {detailLoading && <p className="admin-api-state" role="status">Loading full lyric details…</p>}
            {!detailLoading && detailError && <div className="admin-form-error" role="alert">
                <p>{detailError}</p>
                <button type="button" className="btn btn-outline" onClick={() => {
                    const summary = records.find((record) => record.id === viewingId);
                    if (summary) openRecordDetails(summary);
                }}>Retry</button>
            </div>}
            {!detailLoading && viewing && <>
                <div className="admin-lyric-details-heading">
                    <div>
                        <p className="admin-lyric-eyebrow">LYRIC DETAILS</p>
                        <h2 id="admin-lyric-details-title">{viewing.title}</h2>
                        <p className="admin-lyric-slug">{viewing.slug}</p>
                    </div>
                    <span className={`status ${viewing.status.toLowerCase()}`}>{viewing.status}</span>
                </div>
                <dl className="admin-lyric-metadata">
                    <div><dt>Poet / Writer</dt><dd>{viewing.writer || "Not supplied"}</dd></div>
                    <div><dt>Reciters</dt><dd>{viewing.reciters.join(", ") || "Not supplied"}</dd></div>
                    <div><dt>Categories</dt><dd>{categoryLabels.join(", ") || "None"}</dd></div>
                    <div><dt>Subjects</dt><dd>{subjectLabels.join(", ") || "None"}</dd></div>
                    <div><dt>Tags</dt><dd>{viewing.tags.join(", ") || "None"}</dd></div>
                    <div><dt>Book</dt><dd>{bookLabel || "Not supplied"}</dd></div>
                    <div><dt>Primary artist ID</dt><dd>{viewing.artistId ?? "Not assigned"}</dd></div>
                    <div><dt>Artist IDs</dt><dd>{viewing.artistIds.join(", ") || "None"}</dd></div>
                    <div><dt>Writer ID</dt><dd>{viewing.writerId ?? "Not assigned"}</dd></div>
                    <div><dt>Featured</dt><dd>{viewing.featured ? "Yes" : "No"}</dd></div>
                    <div><dt>Created</dt><dd>{lyricDate(viewing.createdAt)}</dd></div>
                    <div><dt>Updated</dt><dd>{lyricDate(viewing.updatedAt)}</dd></div>
                    {viewing.coverImageUrl && <div><dt>Cover image</dt><dd><a href={viewing.coverImageUrl} target="_blank" rel="noreferrer">Open cover image</a></dd></div>}
                </dl>
                <section className="admin-lyric-translations" aria-label="Saved translations">
                    <h3>Translations</h3>
                    {languageVersions.length > 0 ? <>
                        <div className="admin-lyric-language-tabs" role="tablist" aria-label="Translation language">
                            {languageVersions.map((version) => <button
                                key={version.languageCode}
                                type="button"
                                role="tab"
                                id={`admin-lyric-tab-${version.languageCode}`}
                                aria-selected={detailLanguage === version.languageCode}
                                aria-controls="admin-lyric-translation-panel"
                                onClick={() => setDetailLanguage(version.languageCode)}
                            >{languageLabel(version.languageCode)}</button>)}
                        </div>
                        {activeLanguageVersion && <div
                            className="admin-lyric-translation"
                            id="admin-lyric-translation-panel"
                            role="tabpanel"
                            aria-labelledby={`admin-lyric-tab-${activeLanguageVersion.languageCode}`}
                            lang={activeLanguageVersion.languageCode === "roman" ? "en" : activeLanguageVersion.languageCode}
                            dir={activeLanguageVersion.languageCode === "ur" ? "rtl" : "ltr"}
                        >
                            {activeLanguageVersion.document?.type === "doc"
                                ? <LyricDocumentView document={activeLanguageVersion.document} language={activeLanguageVersion.languageCode === "roman" ? "en" : activeLanguageVersion.languageCode} dir={activeLanguageVersion.languageCode === "ur" ? "rtl" : "ltr"} />
                                : activeLanguageVersion.plainText
                                    ? <pre>{activeLanguageVersion.plainText}</pre>
                                    : <p>No lyric text is available for this language.</p>}
                            <p className="admin-lyric-version-meta">
                                Updated {lyricDate(activeLanguageVersion.updatedAt)} · Version {activeLanguageVersion.rowVersion}
                            </p>
                        </div>}
                    </> : <p>No saved language versions are available.</p>}
                </section>
                <section className="admin-lyric-media">
                    <h3>Media references</h3>
                    {(viewing.mediaReferences || []).length > 0
                        ? <ul>{viewing.mediaReferences.map((media, index) => <li key={`${media.mediaType}-${media.url}-${index}`}>
                            <span>{media.mediaType}: {media.title}</span>{" "}
                            <a href={media.url} target="_blank" rel="noreferrer">Open</a>
                        </li>)}</ul>
                        : <p>No media references are available.</p>}
                </section>
            </>}
        </section> : creating || editing ? <form className="editor-form admin-content-form" onSubmit={(event) => void save(event)}>
            <section className="form-card lyrics-metadata-section">
                <div className="admin-api-form-heading"><div><h3>{creating ? "Add Lyrics" : `Edit ${editing?.title || "lyrics"}`}</h3><p>Lyrics metadata and artist credits</p></div><button type="button" className="btn btn-outline" onClick={closeForm} disabled={saving}>Cancel</button></div>
                <div className="lyrics-metadata-grid">
                    <label className="field lyrics-metadata-wide"><span>Title *</span><input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value, slug: current.slug || slugifyLyricsTitle(event.target.value) }))} /></label>
                    <label className="field lyrics-metadata-wide"><span>Slug</span><input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugifyLyricsTitle(event.target.value) }))} /></label>
                    <div className="field lyrics-artist-field">
                        <label htmlFor="lyrics-writer-search">Poet / Writer</label>
                        <input id="lyrics-writer-search" type="search" value={writerQuery} placeholder="Search writers and poets" onChange={(event) => setWriterQuery(event.target.value)} disabled={writerOptionsLoading || !!writerOptionsError} />
                        <select aria-label="Select poet or writer" value={form.writerId} onChange={(event) => {
                            const selected = writerOptions.find((artist) => String(artist.id) === event.target.value);
                            setForm((current) => ({
                                ...current,
                                writerId: event.target.value,
                                writerName: selected ? artistLabel(selected) : "",
                            }));
                        }} disabled={writerOptionsLoading || !!writerOptionsError}>
                            <option value="">No writer selected</option>
                            {writerChoices.map((artist) => <option key={artist.id} value={artist.id}>{artistLabel(artist)}</option>)}
                        </select>
                        {writerOptionsLoading && <small role="status">Loading writer options…</small>}
                        {!writerOptionsLoading && !writerOptionsError && writerOptions.length === 0 && <small>No active writers match this search.</small>}
                        {writerOptionsError && <div className="lyrics-artist-error" role="alert"><span>Writer options failed: {writerOptionsError}</span><button type="button" onClick={() => setWriterOptionsRequestId((current) => current + 1)}>Retry writers</button></div>}
                        {!form.writerId && form.writerName && <small>Existing legacy writer “{form.writerName}” will be retained unless you select an artist.</small>}
                    </div>
                    <div className="field lyrics-artist-field">
                        <SearchableMultiSelect
                            label="Reciter"
                            options={reciterSelectOptions}
                            value={reciterSelection}
                            onChange={(selection) => {
                                const reciterIds = selection.filter((value) => !legacyReciterNames.has(value));
                                const preservedReciterNames = selection
                                    .map((value) => legacyReciterNames.get(value))
                                    .filter((name): name is string => !!name);
                                setForm((current) => {
                                    const reciterNames = { ...current.reciterNames };
                                    reciterIds.forEach((id) => {
                                        const artist = reciterOptions.find((item) => String(item.id) === id);
                                        if (artist) reciterNames[id] = artistLabel(artist);
                                    });
                                    Object.keys(reciterNames).forEach((id) => {
                                        if (!reciterIds.includes(id)) delete reciterNames[id];
                                    });
                                    return { ...current, reciterIds, reciterNames, preservedReciterNames };
                                });
                            }}
                            placeholder="Search reciters…"
                            emptyMessage="No active reciters match your search."
                            isLoading={reciterOptionsLoading}
                            error={reciterOptionsError}
                            onRetry={() => setReciterOptionsRequestId((current) => current + 1)}
                        />
                        <small>The same artist may also be selected as the writer.</small>
                    </div>
                    <label className="field"><span>Book</span><select value={form.bookId} onChange={(event) => setForm((current) => ({ ...current, bookId: event.target.value }))}><option value="">No book selected</option>{lyricBooks.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select></label>
                    <label className="field"><span>Tags (comma-separated)</span><input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} /></label>
                    <SearchableMultiSelect
                        label="Categories"
                        options={categoryOptions}
                        value={form.categoryIds}
                        onChange={(categoryIds) => setForm((current) => ({ ...current, categoryIds }))}
                        placeholder="Search categories…"
                        emptyMessage="No categories match your search."
                    />
                    <SearchableMultiSelect
                        label="Subjects"
                        options={subjectOptions}
                        value={form.subjectIds}
                        onChange={(subjectIds) => setForm((current) => ({ ...current, subjectIds }))}
                        placeholder="Search subjects…"
                        emptyMessage="No subjects match your search."
                    />
                </div>
            </section>
            <section className="form-card lyrics-editor-form-card">
                <h3>Lyrics Translation Editor</h3>
                <LyricsEditor documents={documents} onChange={(editorLanguage, document) => setDocuments((current) => ({ ...current, [editorLanguage]: document }))} />
            </section>
            <div className="admin-api-actions"><button type="submit" className="btn btn-primary" disabled={saving || artistOptionsLoading || !!artistOptionsError}>{saving ? "Saving…" : "Save Lyrics"}</button><button type="button" className="btn btn-outline" onClick={closeForm} disabled={saving}>Cancel</button></div>
        </form> : <>
            <div className="admin-api-filters">
                <label className="search-box admin-search"><Icon name="search" size={17} /><input value={query} onChange={(event) => { setPage(0); setQuery(event.target.value); }} placeholder="Search lyrics" aria-label="Search lyrics" /></label>
                {/* <select value={status} onChange={(event) => { setPage(0); setStatus(event.target.value); }} aria-label="Filter lyrics by status"><option value="">All statuses</option><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option></select> */}
            </div>
            {loading && <p className="admin-api-state" role="status">Loading lyrics from the backend…</p>}
            {!loading && !error && <div className="admin-api-table-wrap"><table className="admin-api-table">
                <thead><tr><th scope="col">Title</th><th scope="col">Reciters</th><th scope="col">Poet / Writer</th><th scope="col">Updated</th><th scope="col">Actions</th></tr></thead>
                <tbody>{records.map((record) => <tr
                    key={record.id}
                    className="admin-api-clickable-row"
                    tabIndex={0}
                    aria-label={`View details for ${record.title}`}
                    onClick={() => openRecordDetails(record)}
                    onKeyDown={(event) => {
                        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                            event.preventDefault();
                            openRecordDetails(record);
                        }
                    }}
                >
                    <td data-label="Title" className="admin-api-title-cell"><button type="button" className="admin-api-title-link" title={record.title} onClick={(event) => { event.stopPropagation(); openRecordDetails(record); }}>{record.title}</button><small>{record.legacyId || record.slug}</small></td>
                    <td data-label="Reciters">{record.reciters.join(", ") || "—"}</td>
                    <td data-label="Poet / Writer">{record.writer || "—"}</td>
                    <td data-label="Updated">{record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : "—"}</td>
                    <td data-label="Actions"><div className="admin-api-row-actions" onClick={(event) => event.stopPropagation()}>
                        <button type="button" onClick={() => void startEdit(record)}>Edit</button>
                        <button type="button" onClick={() => void toggleStatus(record)}>{record.status === "PUBLISHED" ? "Unpublish" : "Publish"}</button>
                        <button type="button" className="danger-action" onClick={() => void deleteRecord(record)}>Delete</button>
                    </div></td>
                </tr>)}</tbody>
            </table>{!records.length && <div className="admin-empty"><Icon name="search" size={24} />            <b>{result?.totalElements ? "No lyrics match this search" : "No lyrics returned by the API"}</b><span>Adjust the search or add a record.</span></div>}</div>}
            {!loading && !error && totalPages > 1 && <nav className="admin-api-pagination" aria-label="Lyrics table pages"><span>{result?.totalElements || 0} records</span><div><button type="button" disabled={page <= 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>Previous</button><span>Page {page + 1} of {totalPages}</span><button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</button></div></nav>}
        </>}
    </section>;
}
