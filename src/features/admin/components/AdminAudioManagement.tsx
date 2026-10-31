import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type SyntheticEvent } from "react";
import { getUserFacingError, notify } from "../../../app/notifications/toastStore.js";
import { Icon } from "../../../components/ui";
import { artistsApi } from "../../artists/services/artistsApiService.js";
import type { ApiArtistOption, ApiArtistRoleCode } from "../../artists/services/artistsApiService.js";
import { SearchableMultiSelect, type SearchableMultiSelectOption } from "./SearchableMultiSelect";
import {
    createAdminAudio,
    deleteAdminAudio,
    getAdminAudio,
    invalidateAudioListCache,
    listAdminAudioCategories,
    listAdminAudioLanguages,
    listAdminAudios,
    updateAdminAudio,
    updateAdminAudioStatus,
} from "../../audio/services/audioApiService.js";
import type {
    AdminAudioTrack,
    AudioCategoryOption,
    AudioLanguageOption,
    AudioMetadata,
    AudioStatus,
} from "../../audio/services/audioApiService.js";

const pageSize = 8;
const imageMaxSize = 5 * 1024 * 1024;
const audioMaxSize = 50 * 1024 * 1024;
const statuses = ["draft", "published", "inactive"] as const;
const singerRoles: ApiArtistRoleCode[] = ["SINGER", "NAAT_KHWAN", "RECITER"];
const writerRoles: ApiArtistRoleCode[] = ["WRITER", "LYRICIST", "POET"];

type AdminAudioStatus = (typeof statuses)[number];
type AudioFormValues = Omit<AdminAudioTrack, "id" | "featured"> & { featured: boolean };
type AudioField = "title" | "categoryKeys" | "languageCode" | "singerIds" | "audioUrl" | "coverImageUrl";

function artistLabel(artist: Pick<ApiArtistOption, "displayName" | "fullName">) {
    return artist.displayName?.trim() || artist.fullName;
}

function artistOptions(artists: ApiArtistOption[]): SearchableMultiSelectOption[] {
    return artists.map((artist) => ({
        value: String(artist.id),
        label: artistLabel(artist),
        description: artist.roles.map((role) => role.toLowerCase().replace(/_/g, " ")).join(", "),
    }));
}

async function loadArtistsForRoles(roles: ApiArtistRoleCode[]) {
    const groups = await Promise.all(roles.map((role) => artistsApi.getArtistOptions({ role })));
    return [...new Map(groups.flat().map((artist) => [String(artist.id), artist])).values()];
}

function formatBytes(bytes: number | null) {
    if (bytes === null || !Number.isFinite(bytes)) return "Size not available";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPublishedDate(value: string) {
    if (!value) return "Not set";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function getInitialForm(track?: AdminAudioTrack): AudioFormValues {
    return {
        title: track?.title || "",
        description: track?.description || "",
        categoryKeys: track?.categoryKeys || [],
        categoryNames: track?.categoryNames || [],
        languageCode: track?.languageCode || "",
        language: track?.language || "",
        singerIds: track?.singerIds || [],
        singerNames: [...(track?.singerNames || [])],
        writerIds: track?.writerIds || [],
        writerNames: [...(track?.writerNames || [])],
        publishedAt: track?.publishedAt || "",
        status: track?.status || "draft",
        featured: track?.featured || false,
        coverImageUrl: track?.coverImageUrl || "",
        audioUrl: track?.audioUrl || "",
        audioFileName: track?.audioFileName || "",
        audioFileSize: track?.audioFileSize ?? null,
    };
}

function useNativeDialog(open: boolean) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (!open) return;
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (!dialog.open) dialog.showModal();
        return () => {
            if (dialog.open) dialog.close();
        };
    }, [open]);

    return dialogRef;
}

function AudioFormDialog({
    track,
    singerChoices,
    writerChoices,
    categories,
    languages,
    singersLoading,
    writersLoading,
    singersError,
    writersError,
    onRetrySingers,
    onRetryWriters,
    createPreviewUrl,
    onCancel,
    onSave,
}: {
    track?: AdminAudioTrack;
    singerChoices: ApiArtistOption[];
    writerChoices: ApiArtistOption[];
    categories: AudioCategoryOption[];
    languages: AudioLanguageOption[];
    singersLoading: boolean;
    writersLoading: boolean;
    singersError: string;
    writersError: string;
    onRetrySingers: () => void;
    onRetryWriters: () => void;
    createPreviewUrl: (file: File) => string;
    onCancel: () => void;
    onSave: (id: string | undefined, values: AudioMetadata, files: { audioFile?: File | null; coverImage?: File | null }, originalStatus?: AudioStatus) => Promise<void>;
}) {
    const dialogRef = useNativeDialog(true);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const savingRef = useRef(false);
    const [form, setForm] = useState<AudioFormValues>(() => getInitialForm(track));
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<AudioField, string>>>({});
    const [saving, setSaving] = useState(false);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const singerSelectOptions = useMemo(() => artistOptions(singerChoices), [singerChoices]);
    const writerSelectOptions = useMemo(() => artistOptions(writerChoices), [writerChoices]);
    const categorySelectOptions = useMemo(
        () => categories.map((category) => ({ value: category.categoryKey, label: category.name })),
        [categories],
    );

    const setField = <K extends keyof AudioFormValues>(key: K, value: AudioFormValues[K]) => {
        setForm((current) => ({ ...current, [key]: value }));
        if (key in fieldErrors) setFieldErrors((current) => ({ ...current, [key]: undefined }));
    };

    const acceptCover = (file?: File) => {
        if (!file) return;
        const extension = file.name.split(".").pop()?.toLowerCase();
        const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif"].includes(extension || "");
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type);
        const allowed = allowedExtensions && (!file.type || allowedTypes);
        if (!allowed) {
            setFieldErrors((current) => ({ ...current, coverImageUrl: "Choose a JPG, PNG, WebP, or GIF image." }));
            return;
        }
        if (file.size > imageMaxSize) {
            setFieldErrors((current) => ({ ...current, coverImageUrl: "The cover image must be 5 MB or smaller." }));
            return;
        }
        setField("coverImageUrl", createPreviewUrl(file));
        setCoverImage(file);
    };

    const acceptAudio = (file?: File) => {
        if (!file) return;
        const extension = file.name.split(".").pop()?.toLowerCase();
        const allowedExtensions = ["mp3", "wav", "m4a"].includes(extension || "");
        const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/m4a"].includes(file.type);
        const allowed = allowedExtensions && (!file.type || allowedTypes);
        if (!allowed) {
            setFieldErrors((current) => ({ ...current, audioUrl: "Choose an MP3, WAV, or M4A audio file." }));
            return;
        }
        if (file.size > audioMaxSize) {
            setFieldErrors((current) => ({ ...current, audioUrl: "The audio file must be 50 MB or smaller." }));
            return;
        }
        setField("audioUrl", createPreviewUrl(file));
        setField("audioFileName", file.name);
        setField("audioFileSize", file.size);
        setAudioFile(file);
    };

    const onCoverInput = (event: ChangeEvent<HTMLInputElement>) => {
        acceptCover(event.currentTarget.files?.[0]);
        event.currentTarget.value = "";
    };
    const onAudioInput = (event: ChangeEvent<HTMLInputElement>) => {
        acceptAudio(event.currentTarget.files?.[0]);
        event.currentTarget.value = "";
    };
    const onDropFile = (event: DragEvent<HTMLDivElement>, accept: (file?: File) => void) => {
        event.preventDefault();
        accept(event.dataTransfer.files[0]);
    };

    const save = async (submitStatus: AdminAudioStatus) => {
        if (savingRef.current) return;
        const nextErrors: Partial<Record<AudioField, string>> = {};
        if (!form.title.trim()) nextErrors.title = "Enter an audio title.";
        if (!form.categoryKeys.length) nextErrors.categoryKeys = "Choose at least one category.";
        if (!form.languageCode) nextErrors.languageCode = "Choose a language.";
        if (!form.singerIds.length) nextErrors.singerIds = "Choose at least one singer or Naat Khwaan.";
        if (!track && !audioFile) nextErrors.audioUrl = "Select an audio file.";
        if (!track && !coverImage) nextErrors.coverImageUrl = "Select a cover image.";
        setFieldErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;

        savingRef.current = true;
        setSaving(true);
        try {
            await onSave(track?.id, {
                title: form.title.trim(),
                description: form.description.trim(),
                languageCode: form.languageCode,
                categoryKeys: form.categoryKeys,
                singerIds: form.singerIds,
                writerIds: form.writerIds,
                publishedDate: form.publishedAt || null,
                status: submitStatus.toUpperCase() as AudioStatus,
            }, { audioFile, coverImage }, track ? track.status.toUpperCase() as AudioStatus : undefined);
            notify.success(track ? "Audio updated." : "Audio created.");
            onCancel();
        } catch (error) {
            notify.error(getUserFacingError(error, "Audio could not be saved. Please try again."));
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        save("draft");
    };
    const onDialogCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
        event.preventDefault();
        if (!saving) onCancel();
    };

    return (
        <dialog
            ref={dialogRef}
            className="admin-audio-dialog"
            aria-labelledby="admin-audio-form-title"
            onCancel={onDialogCancel}
            onClick={(event) => {
                if (event.target === event.currentTarget && !saving) onCancel();
            }}
        >
            <form className="admin-audio-form" onSubmit={handleSubmit} noValidate>
                <header className="admin-audio-dialog-header">
                    <div>
                        <p className="admin-audio-eyebrow">AUDIO LIBRARY</p>
                        <h2 id="admin-audio-form-title">{track ? "Edit Audio" : "Add Audio"}</h2>
                        <p>Manage track details, media, artist credits, and publication.</p>
                    </div>
                    <button className="admin-audio-icon-button" type="button" aria-label="Close audio form" onClick={onCancel} disabled={saving}>
                        <Icon name="x" size={18} />
                    </button>
                </header>

                <div className="admin-audio-form-scroll">
                    <section className="admin-audio-form-section" aria-labelledby="audio-basic-heading">
                        <div className="admin-audio-section-heading"><span>01</span><div><h3 id="audio-basic-heading">Basic information</h3><p>Set the track title and how listeners can find it.</p></div></div>
                        <div className="admin-audio-fields">
                            <label className="field admin-audio-wide">
                                <span>Audio title <b aria-hidden="true">*</b></span>
                                <input autoFocus maxLength={180} value={form.title} aria-invalid={!!fieldErrors.title} aria-describedby={fieldErrors.title ? "audio-title-error" : undefined} onChange={(event) => setField("title", event.target.value)} />
                                {fieldErrors.title && <small className="admin-field-error" id="audio-title-error">{fieldErrors.title}</small>}
                            </label>
                            <div className="field">
                                <SearchableMultiSelect
                                    label="Categories *"
                                    options={categorySelectOptions}
                                    value={form.categoryKeys}
                                    onChange={(value) => setField("categoryKeys", value)}
                                    placeholder="Select one or more categories"
                                    emptyMessage="No active audio categories are available."
                                    disabled={saving}
                                />
                                {fieldErrors.categoryKeys && <small className="admin-field-error" id="audio-category-error">{fieldErrors.categoryKeys}</small>}
                            </div>
                            <label className="field">
                                <span>Language <b aria-hidden="true">*</b></span>
                                <select value={form.languageCode} aria-invalid={!!fieldErrors.languageCode} aria-describedby={fieldErrors.languageCode ? "audio-language-error" : undefined} onChange={(event) => setField("languageCode", event.target.value)}>
                                    <option value="">Select a language</option>
                                    {languages.map((language) => <option key={language.code} value={language.code}>{language.name}</option>)}
                                </select>
                                {fieldErrors.languageCode && <small className="admin-field-error" id="audio-language-error">{fieldErrors.languageCode}</small>}
                            </label>
                            <label className="field admin-audio-wide">
                                <span>Description <small>Optional</small></span>
                                <textarea rows={3} maxLength={1200} value={form.description} onChange={(event) => setField("description", event.target.value)} placeholder="Add a short description for this audio track" />
                            </label>
                        </div>
                    </section>

                    <section className="admin-audio-form-section" aria-labelledby="audio-media-heading">
                        <div className="admin-audio-section-heading"><span>02</span><div><h3 id="audio-media-heading">Audio media</h3><p>{track ? "Keep the current files or upload replacements." : "Choose the files to upload with this audio."}</p></div></div>
                        <div className="admin-audio-media-grid">
                            <div className="admin-audio-media-field">
                                <span className="admin-audio-field-label">Cover image <small>{track ? "Optional" : "Required"} · JPG, PNG, WebP, GIF · max 5 MB</small></span>
                                {form.coverImageUrl ? (
                                    <div className="admin-audio-cover-preview">
                                        <img src={form.coverImageUrl} alt="Selected cover preview" />
                                        <div><b>Cover image selected</b><span>Replace the image or remove it from this track.</span><div className="admin-audio-inline-actions">
                                            <button type="button" className="btn btn-outline" onClick={() => coverInputRef.current?.click()}>Replace</button>
                                            <button type="button" className="admin-audio-text-button" onClick={() => {
                                                setCoverImage(null);
                                                if (track) setField("coverImageUrl", track.coverImageUrl);
                                                else setField("coverImageUrl", "");
                                            }}>{track ? "Keep existing image" : "Remove image"}</button>
                                        </div></div>
                                    </div>
                                ) : (
                                    <div className="admin-audio-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDropFile(event, acceptCover)}>
                                        <span className="admin-audio-upload-mark"><Icon name="download" size={19} /></span>
                                        <b>Drop a cover image here</b>
                                        <span>or choose a file from your device</span>
                                        <button type="button" className="btn btn-outline" onClick={() => coverInputRef.current?.click()}>Choose image</button>
                                    </div>
                                )}
                                <input ref={coverInputRef} className="admin-audio-hidden-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Choose cover image" onChange={onCoverInput} />
                                {fieldErrors.coverImageUrl && <small className="admin-field-error" role="alert">{fieldErrors.coverImageUrl}</small>}
                            </div>

                            <div className="admin-audio-media-field">
                                <span className="admin-audio-field-label">Audio file <small>MP3, WAV, M4A · max 50 MB</small></span>
                                {form.audioUrl ? (
                                    <div className="admin-audio-file-preview">
                                        <div className="admin-audio-file-meta"><span className="admin-audio-file-icon"><Icon name="headphones" size={19} /></span><div><b>{form.audioFileName || "Audio file selected"}</b><span>{formatBytes(form.audioFileSize)}</span></div></div>
                                        <audio controls preload="metadata" src={form.audioUrl}>Audio preview is not supported by this browser.</audio>
                                        <div className="admin-audio-inline-actions">                                        <button type="button" className="btn btn-outline" onClick={() => audioInputRef.current?.click()}>Replace audio</button><button type="button" className="admin-audio-text-button" onClick={() => {
                                            setAudioFile(null);
                                            if (track) {
                                                setField("audioUrl", track.audioUrl);
                                                setField("audioFileName", track.audioFileName);
                                                setField("audioFileSize", track.audioFileSize);
                                            } else {
                                                setField("audioUrl", "");
                                                setField("audioFileName", "");
                                                setField("audioFileSize", null);
                                            }
                                        }}>{track ? "Keep existing audio" : "Remove audio"}</button></div>
                                    </div>
                                ) : (
                                    <div className="admin-audio-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDropFile(event, acceptAudio)}>
                                        <span className="admin-audio-upload-mark"><Icon name="headphones" size={19} /></span>
                                        <b>Drop an audio file here</b>
                                        <span>MP3 is recommended</span>
                                        <button type="button" className="btn btn-outline" onClick={() => audioInputRef.current?.click()}>Choose audio</button>
                                    </div>
                                )}
                                <input ref={audioInputRef} className="admin-audio-hidden-file" type="file" accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4" aria-label="Choose audio file" onChange={onAudioInput} />
                                {fieldErrors.audioUrl && <small className="admin-field-error" role="alert">{fieldErrors.audioUrl}</small>}
                            </div>
                        </div>
                    </section>

                    <section className="admin-audio-form-section" aria-labelledby="audio-artist-heading">
                        <div className="admin-audio-section-heading"><span>03</span><div><h3 id="audio-artist-heading">Artist information</h3><p>Credits are selected from existing artist records.</p></div></div>
                        <div className="admin-audio-fields">
                            <div className="admin-audio-artist-field">
                                <SearchableMultiSelect
                                    label="Singer / Naat Khwaan *"
                                    options={singerSelectOptions}
                                    value={form.singerIds}
                                    onChange={(value) => setField("singerIds", value)}
                                    placeholder="Search singers and reciters"
                                    emptyMessage="No matching artist records."
                                    isLoading={singersLoading}
                                    error={singersError}
                                    onRetry={onRetrySingers}
                                    disabled={saving}
                                />
                                {fieldErrors.singerIds && <small className="admin-field-error">{fieldErrors.singerIds}</small>}
                                {!singersLoading && !singersError && !singerChoices.length && <small className="admin-audio-help">No artist options were returned. Add the artist in Artist Management before assigning a new credit.</small>}
                            </div>
                            <div className="admin-audio-artist-field">
                                <SearchableMultiSelect
                                    label="Written by"
                                    options={writerSelectOptions}
                                    value={form.writerIds}
                                    onChange={(value) => setField("writerIds", value)}
                                    placeholder="Search writers and poets"
                                    emptyMessage="No matching writer records."
                                    isLoading={writersLoading}
                                    error={writersError}
                                    onRetry={onRetryWriters}
                                    disabled={saving}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="admin-audio-form-section" aria-labelledby="audio-publishing-heading">
                        <div className="admin-audio-section-heading"><span>04</span><div><h3 id="audio-publishing-heading">Publishing information</h3><p>Choose a status and publication date.</p></div></div>
                        <div className="admin-audio-fields">
                            <label className="field">
                                <span>Published date</span>
                                <input type="date" value={form.publishedAt} onChange={(event) => setField("publishedAt", event.target.value)} />
                            </label>
                            <label className="field">
                                <span>Status</span>
                                <select value={form.status} onChange={(event) => setField("status", event.target.value as AdminAudioStatus)}>
                                    {statuses.map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}
                                </select>
                            </label>
                            <label className="admin-audio-featured">
                                <input type="checkbox" checked={form.featured} onChange={(event) => setField("featured", event.target.checked)} />
                                <span><b>Featured audio</b><small>Highlight this track in featured audio collections.</small></span>
                            </label>
                        </div>
                    </section>
                </div>

                <footer className="admin-audio-dialog-footer">
                    <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
                    <button type="submit" className="btn btn-outline" disabled={saving}>{saving ? "Saving…" : "Save as Draft"}</button>
                    <button type="button" className="btn btn-outline" onClick={() => save(form.status)} disabled={saving}>{track ? "Save Changes" : "Save Audio"}</button>
                    <button type="button" className="btn btn-primary" onClick={() => save("published")} disabled={saving}>{saving ? "Saving…" : "Publish Audio"}</button>
                </footer>
            </form>
        </dialog>
    );
}

function AudioDetailsDialog({ track, onClose }: { track: AdminAudioTrack; onClose: () => void }) {
    const dialogRef = useNativeDialog(true);
    const onDialogCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
        event.preventDefault();
        onClose();
    };
    const singers = track.singerNames.length ? track.singerNames.join(", ") : "Not supplied";
    const writers = track.writerNames.length ? track.writerNames.join(", ") : "Not supplied";
    return (
        <dialog
            ref={dialogRef}
            className="admin-audio-dialog admin-audio-details-dialog"
            aria-labelledby="admin-audio-details-title"
            onCancel={onDialogCancel}
            onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
            <section className="admin-audio-details">
                <header className="admin-audio-dialog-header">
                    <div><p className="admin-audio-eyebrow">AUDIO DETAILS</p><h2 id="admin-audio-details-title">{track.title}</h2><p>Preview of the current audio record.</p></div>
                    <button className="admin-audio-icon-button" type="button" aria-label="Close audio details" onClick={onClose}><Icon name="x" size={18} /></button>
                </header>
                <div className="admin-audio-detail-media">
                    {track.coverImageUrl ? <img src={track.coverImageUrl} alt={`${track.title} cover`} /> : <span className="admin-audio-cover-placeholder"><Icon name="headphones" size={30} /></span>}
                    <div><span className={`admin-audio-status status-${track.status}`}>{track.status}</span><p>{track.categoryNames.join(", ") || "Not set"}{track.language ? ` · ${track.language}` : ""}</p></div>
                </div>
                <div className="admin-audio-detail-player">
                    {track.audioUrl ? <audio controls preload="metadata" src={track.audioUrl}>Audio playback is not supported by this browser.</audio> : <p>No audio file is attached.</p>}
                </div>
                <dl className="admin-audio-detail-metadata">
                    <div><dt>Singer / Naat Khwaan</dt><dd>{singers}</dd></div>
                    <div><dt>Written by</dt><dd>{writers}</dd></div>
                    <div><dt>Language</dt><dd>{track.language || "Not supplied"}</dd></div>
                    <div><dt>Published date</dt><dd>{formatPublishedDate(track.publishedAt)}</dd></div>
                    <div><dt>Featured</dt><dd>{track.featured ? "Yes" : "No"}</dd></div>
                    <div className="admin-audio-detail-description"><dt>Description</dt><dd>{track.description || "No description supplied."}</dd></div>
                </dl>
                <footer className="admin-audio-dialog-footer"><button type="button" className="btn btn-outline" onClick={onClose}>Close</button></footer>
            </section>
        </dialog>
    );
}

export function AdminAudioManagement() {
    const [tracks, setTracks] = useState<AdminAudioTrack[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [categories, setCategories] = useState<AudioCategoryOption[]>([]);
    const [languages, setLanguages] = useState<AudioLanguageOption[]>([]);
    const [optionsLoading, setOptionsLoading] = useState(true);
    const [optionsError, setOptionsError] = useState("");
    const [query, setQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [singerFilter, setSingerFilter] = useState("");
    const [languageFilter, setLanguageFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(0);
    const [listRetry, setListRetry] = useState(0);
    const [optionsRetry, setOptionsRetry] = useState(0);
    const [singerChoices, setSingerChoices] = useState<ApiArtistOption[]>([]);
    const [writerChoices, setWriterChoices] = useState<ApiArtistOption[]>([]);
    const [singersLoading, setSingersLoading] = useState(true);
    const [writersLoading, setWritersLoading] = useState(true);
    const [singersError, setSingersError] = useState("");
    const [writersError, setWritersError] = useState("");
    const [singerRetry, setSingerRetry] = useState(0);
    const [writerRetry, setWriterRetry] = useState(0);
    const [editingTrack, setEditingTrack] = useState<AdminAudioTrack | undefined>();
    const [creating, setCreating] = useState(false);
    const [viewingTrack, setViewingTrack] = useState<AdminAudioTrack | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const objectUrls = useRef(new Set<string>());

    useEffect(() => {
        let current = true;
        setLoading(true);
        setLoadError("");
        void listAdminAudios({
            query,
            categoryKey: categoryFilter || undefined,
            languageCode: languageFilter || undefined,
            status: statusFilter ? statusFilter.toUpperCase() as AudioStatus : undefined,
        }).then((result) => {
            if (current) setTracks(result);
        }).catch((error: unknown) => {
            if (current) setLoadError(getUserFacingError(error, "Audio records could not be loaded."));
        }).finally(() => {
            if (current) setLoading(false);
        });
        return () => { current = false; };
    }, [listRetry, query, categoryFilter, languageFilter, statusFilter]);

    useEffect(() => {
        let current = true;
        setOptionsLoading(true);
        setOptionsError("");
        void Promise.all([listAdminAudioCategories(), listAdminAudioLanguages()])
            .then(([categoryOptions, languageOptions]) => {
                if (!current) return;
                setCategories(categoryOptions);
                setLanguages(languageOptions);
            })
            .catch((error: unknown) => {
                if (current) setOptionsError(getUserFacingError(error, "Audio categories and languages could not be loaded."));
            })
            .finally(() => {
                if (current) setOptionsLoading(false);
            });
        return () => { current = false; };
    }, [optionsRetry]);

    useEffect(() => {
        let current = true;
        setSingersLoading(true);
        setSingersError("");
        void loadArtistsForRoles(singerRoles)
            .then((options) => { if (current) setSingerChoices(options); })
            .catch((error: unknown) => { if (current) setSingersError(error instanceof Error ? error.message : "Singer options could not be loaded."); })
            .finally(() => { if (current) setSingersLoading(false); });
        return () => { current = false; };
    }, [singerRetry]);

    useEffect(() => {
        let current = true;
        setWritersLoading(true);
        setWritersError("");
        void loadArtistsForRoles(writerRoles)
            .then((options) => { if (current) setWriterChoices(options); })
            .catch((error: unknown) => { if (current) setWritersError(error instanceof Error ? error.message : "Writer options could not be loaded."); })
            .finally(() => { if (current) setWritersLoading(false); });
        return () => { current = false; };
    }, [writerRetry]);

    useEffect(() => () => {
        objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
        objectUrls.current.clear();
    }, []);

    const filteredTracks = useMemo(() => tracks.filter((track) =>
        !singerFilter || track.singerNames.some((singer) =>
            singer.toLocaleLowerCase().includes(singerFilter.toLocaleLowerCase()))),
    [tracks, singerFilter]);
    const totalPages = Math.ceil(filteredTracks.length / pageSize);
    const visibleTracks = filteredTracks.slice(page * pageSize, (page + 1) * pageSize);
    const hasFilters = Boolean(query.trim() || categoryFilter || singerFilter || languageFilter || statusFilter);
    useEffect(() => {
        setPage((current) => Math.min(current, Math.max(totalPages - 1, 0)));
    }, [totalPages]);

    const clearFilters = () => {
        setQuery("");
        setCategoryFilter("");
        setSingerFilter("");
        setLanguageFilter("");
        setStatusFilter("");
        setPage(0);
    };
    const createPreviewUrl = (file: File) => {
        const url = URL.createObjectURL(file);
        objectUrls.current.add(url);
        return url;
    };
    const saveTrack = async (
        id: string | undefined,
        values: AudioMetadata,
        files: { audioFile?: File | null; coverImage?: File | null },
        originalStatus?: AudioStatus,
    ) => {
        try {
            if (!id) {
                await createAdminAudio(values, files);
            } else {
                await updateAdminAudio(id, values, files);
                if (originalStatus && values.status && originalStatus !== values.status) {
                    await updateAdminAudioStatus(id, values.status);
                }
            }
        } finally {
            invalidateAudioListCache();
            setPage(0);
            setListRetry((current) => current + 1);
        }
    };
    const deleteTrack = async (track: AdminAudioTrack) => {
        if (!window.confirm(`Delete "${track.title}"? This cannot be undone.`)) return;
        try {
            await deleteAdminAudio(track.id);
            notify.success("Audio deleted.");
            invalidateAudioListCache();
            setListRetry((current) => current + 1);
        } catch (error) {
            notify.error(getUserFacingError(error, "Audio could not be deleted."));
        }
    };
    const retryList = () => setListRetry((current) => current + 1);
    const openEdit = async (track: AdminAudioTrack) => {
        setCreating(false);
        setDetailLoading(true);
        try {
            setEditingTrack(await getAdminAudio(track.id));
        } catch (error) {
            notify.error(getUserFacingError(error, "Audio details could not be loaded."));
        } finally {
            setDetailLoading(false);
        }
    };
    const openDetails = async (track: AdminAudioTrack) => {
        setDetailLoading(true);
        try {
            setViewingTrack(await getAdminAudio(track.id));
        } catch (error) {
            notify.error(getUserFacingError(error, "Audio details could not be loaded."));
        } finally {
            setDetailLoading(false);
        }
    };
    const closeForm = () => {
        setCreating(false);
        setEditingTrack(undefined);
    };

    return (
        <section className="admin-audio-management" aria-label="Audio management">
            <div className="admin-api-heading">
                <div className="admin-api-heading-copy">
                    <p>Manage audio tracks, categories, singers, and published audio content.</p>
                    <span className="admin-audio-preview-note">Audio records and uploaded media are managed by the backend.</span>
                </div>
                {!creating && !editingTrack && <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><span aria-hidden="true">+</span>Add Audio</button>}
            </div>

            <div className="admin-audio-filter-panel" aria-label="Search and filter audio">
                <label className="search-box admin-search">
                    <Icon name="search" size={17} />
                    <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Search audio titles" aria-label="Search audio titles" />
                </label>
                <label><span className="sr-only">Filter by category</span><select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(0); }}><option value="">All categories</option>{categories.map((category) => <option value={category.categoryKey} key={category.categoryKey}>{category.name}</option>)}</select></label>
                <label><span className="sr-only">Filter by singer or Naat Khwaan</span><select value={singerFilter} onChange={(event) => { setSingerFilter(event.target.value); setPage(0); }}><option value="">All singers</option>{[...new Set(tracks.flatMap((track) => track.singerNames))].sort().map((singer) => <option key={singer} value={singer}>{singer}</option>)}</select></label>
                <label><span className="sr-only">Filter by language</span><select value={languageFilter} onChange={(event) => { setLanguageFilter(event.target.value); setPage(0); }}><option value="">All languages</option>{languages.map((language) => <option key={language.code} value={language.code}>{language.name}</option>)}</select></label>
                <label><span className="sr-only">Filter by publishing status</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(0); }}><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}</select></label>
                <button type="button" className="btn btn-outline" onClick={clearFilters} disabled={!hasFilters}>Clear filters</button>
            </div>

            {optionsError && <div className="admin-audio-error" role="alert"><span>{optionsError}</span><button type="button" className="btn btn-outline" onClick={() => setOptionsRetry((current) => current + 1)}>Retry options</button></div>}
            {optionsLoading && <p className="admin-audio-state" role="status">Loading audio categories and languages…</p>}
            {detailLoading && <p className="admin-audio-state" role="status">Loading audio details…</p>}
            {loadError && <div className="admin-audio-error" role="alert"><span>{loadError}</span><button type="button" className="btn btn-outline" onClick={retryList}>Retry</button></div>}
            {loading && <p className="admin-audio-state" role="status">Loading audio…</p>}
            {!loading && !loadError && !visibleTracks.length && (
                <div className="admin-audio-empty">
                    <span><Icon name="headphones" size={26} /></span>
                    <h2>{hasFilters ? "No audio matches these filters" : "No audio tracks yet"}</h2>
                    <p>{hasFilters ? "Try a different title or clear some filters." : "Add an audio track to start building the library."}</p>
                    {hasFilters ? <button type="button" className="btn btn-outline" onClick={clearFilters}>Clear filters</button> : <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>Add Audio</button>}
                </div>
            )}
            {!loading && !loadError && visibleTracks.length > 0 && (
                <>
                    <div className="admin-audio-table-wrap">
                        <table className="admin-api-table admin-audio-table" aria-label="Audio tracks">
                            <thead><tr>
                                <th scope="col">Cover image</th><th scope="col">Audio title</th><th scope="col">Category</th><th scope="col">Singer</th><th scope="col">Written by</th><th scope="col">Language</th><th scope="col">Published date</th><th scope="col">Status</th><th scope="col">Actions</th>
                            </tr></thead>
                            <tbody>{visibleTracks.map((track) => (
                                <tr key={track.id}>
                                    <td data-label="Cover image">{track.coverImageUrl ? <img className="admin-audio-thumbnail" src={track.coverImageUrl} alt="" /> : <span className="admin-audio-thumbnail-placeholder"><Icon name="headphones" size={18} /></span>}</td>
                                    <td className="admin-api-title-cell" data-label="Audio title"><button className="admin-api-title-link" type="button" onClick={() => void openDetails(track)}>{track.title}</button><small>{track.description || "No description supplied"}</small></td>
                                    <td data-label="Category">{track.categoryNames.join(", ") || "—"}</td>
                                    <td data-label="Singer">{track.singerNames.join(", ") || "—"}</td>
                                    <td data-label="Written by">{track.writerNames.join(", ") || "—"}</td>
                                    <td data-label="Language">{track.language || "—"}</td>
                                    <td data-label="Published date">{formatPublishedDate(track.publishedAt)}</td>
                                    <td data-label="Status"><span className={`admin-audio-status status-${track.status}`}>{track.status}</span></td>
                                    <td data-label="Actions"><div className="admin-audio-actions" role="group" aria-label={`Actions for ${track.title}`}>
                                        <button type="button" aria-label={`View ${track.title}`} title="View" onClick={() => void openDetails(track)}><Icon name="eye" size={16} /></button>
                                        <button type="button" aria-label={`Edit ${track.title}`} title="Edit" onClick={() => void openEdit(track)}><Icon name="pen" size={16} /></button>
                                        <button type="button" className="danger-action" aria-label={`Delete ${track.title}`} title="Delete" onClick={() => void deleteTrack(track)}><Icon name="x" size={16} /></button>
                                    </div></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                    {filteredTracks.length > pageSize && <nav className="admin-audio-pagination" aria-label="Audio pages">
                        <span>{page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredTracks.length)} of {filteredTracks.length}</span>
                        <div><button type="button" className="btn btn-outline" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>Previous</button><span>Page {page + 1} of {totalPages}</span><button type="button" className="btn btn-outline" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page + 1 >= totalPages}>Next</button></div>
                    </nav>}
                </>
            )}

            {(creating || editingTrack) && <AudioFormDialog
                key={editingTrack?.id || "new-audio"}
                track={editingTrack}
                singerChoices={singerChoices}
                writerChoices={writerChoices}
                categories={categories}
                languages={languages}
                singersLoading={singersLoading}
                writersLoading={writersLoading}
                singersError={singersError}
                writersError={writersError}
                onRetrySingers={() => setSingerRetry((current) => current + 1)}
                onRetryWriters={() => setWriterRetry((current) => current + 1)}
                createPreviewUrl={createPreviewUrl}
                onCancel={closeForm}
                onSave={saveTrack}
            />}
            {viewingTrack && <AudioDetailsDialog track={viewingTrack} onClose={() => setViewingTrack(null)} />}
        </section>
    );
}
