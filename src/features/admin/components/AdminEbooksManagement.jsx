import { useEffect, useRef, useState } from "react";
import { notify } from "../../../app/notifications/toastStore.js";
import { Icon } from "../../../components/ui";
import { SearchableMultiSelect } from "./SearchableMultiSelect";
import {
    createAdminEbook,
    deleteAdminEbook,
    getAdminEbook,
    getAdminEbookOptions,
    listAdminEbooks,
    updateAdminEbook,
    updateAdminEbookStatus,
} from "../../ebooks/services/ebooksApiService";
import "../../../assests/scss/admin-ebooks.scss";

const pageSize = 8;
const statuses = ["draft", "published", "inactive"];
const allowedImageExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "Size not available";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPublishedDate(value) {
    if (!value) return "Not set";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function useNativeDialog() {
    const dialogRef = useRef(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return undefined;
        if (!dialog.open) dialog.showModal();
        return () => {
            if (dialog.open) dialog.close();
        };
    }, []);

    return dialogRef;
}

function getInitialForm(ebook) {
    return {
        title: ebook?.title || "",
        description: ebook?.description || "",
        coverImageUrl: ebook?.coverImageUrl || "",
        bookFileName: ebook?.bookFileName || "",
        bookFileSize: ebook?.bookFileSize ?? null,
        authorIds: ebook?.authorIds || [],
        categoryIds: ebook?.categoryIds || [],
        languageCode: ebook?.languageCode || "",
        publishedDate: ebook?.publishedDate || "",
        status: ebook?.status || "draft",
    };
}

function normalizeAdminEbook(ebook) {
    return {
        ...ebook,
        id: String(ebook.id),
        status: String(ebook.status || "DRAFT").toLowerCase(),
        authorIds: (ebook.authors || []).map((author) => String(author.id)),
        authors: (ebook.authors || []).map((author) => ({
            ...author,
            name: author.displayName?.trim() || author.fullName,
        })),
        categoryIds: (ebook.categories || []).map((category) => category.categoryKey),
        categories: (ebook.categories || []).map((category) => category.name),
        languageCode: ebook.language?.code || "",
        language: ebook.language?.name || "",
        bookFileName: ebook.originalBookFilename || "",
        bookFileSize: ebook.bookFileSize ?? null,
    };
}

function EbookFormDialog({ ebook, options, createPreviewUrl, onCancel, onSave }) {
    const dialogRef = useNativeDialog();
    const coverInputRef = useRef(null);
    const pdfInputRef = useRef(null);
    const [form, setForm] = useState(() => getInitialForm(ebook));
    const [coverFile, setCoverFile] = useState(null);
    const [pdfFile, setPdfFile] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const authorLabel = ebook ? "Authors / Writers" : "Authors / Writers *";
    const categoryLabel = ebook ? "Categories" : "Categories *";

    const setField = (name, value) => {
        setForm((current) => ({ ...current, [name]: value }));
        setFieldErrors((current) => ({ ...current, [name]: undefined }));
    };

    const acceptCover = (file) => {
        if (!file) return;
        const extension = file.name.split(".").pop()?.toLowerCase();
        if (!allowedImageExtensions.has(extension) || (file.type && !allowedImageTypes.has(file.type))) {
            setFieldErrors((current) => ({ ...current, coverImageUrl: "Choose a JPG, JPEG, PNG, or WebP image." }));
            return;
        }
        setField("coverImageUrl", createPreviewUrl(file));
        setCoverFile(file);
    };

    const acceptPdf = (file) => {
        if (!file) return;
        const extension = file.name.split(".").pop()?.toLowerCase();
        if (extension !== "pdf" || (file.type && file.type !== "application/pdf")) {
            setFieldErrors((current) => ({ ...current, bookFileName: "Choose a PDF file." }));
            return;
        }
        setField("bookFileName", file.name);
        setField("bookFileSize", file.size);
        setPdfFile(file);
    };

    const save = async (event) => {
        event.preventDefault();
        if (saving) return;
        const errors = {};
        if (!form.title.trim()) errors.title = "Enter a book title.";
        if (!form.description.trim()) errors.description = "Enter a description.";
        if (!form.coverImageUrl) errors.coverImageUrl = "Select a cover image.";
        if (!form.bookFileName || form.bookFileSize === null) errors.bookFileName = "Select a PDF book file.";
        if (fieldErrors.coverImageUrl) errors.coverImageUrl = fieldErrors.coverImageUrl;
        if (fieldErrors.bookFileName) errors.bookFileName = fieldErrors.bookFileName;
        if (!form.authorIds.length) errors.authorIds = "Choose at least one author or writer.";
        if (!form.categoryIds.length) errors.categoryIds = "Choose at least one category.";
        if (!form.languageCode) errors.languageCode = "Choose a language.";
        if (!form.publishedDate) errors.publishedDate = "Choose a published date.";
        setFieldErrors(errors);
        if (Object.keys(errors).length) return;

        setSaving(true);
        try {
            await onSave(ebook?.id, form, { coverFile, pdfFile });
        } finally {
            setSaving(false);
        }
    };

    const onDialogCancel = (event) => {
        event.preventDefault();
        if (!saving) onCancel();
    };

    return (
        <dialog
            ref={dialogRef}
            className="admin-ebooks-dialog"
            aria-labelledby="admin-ebooks-form-title"
            onCancel={onDialogCancel}
            onClick={(event) => {
                if (event.target === event.currentTarget && !saving) onCancel();
            }}
        >
            <form className="admin-ebooks-form" onSubmit={save} noValidate>
                <header className="admin-audio-dialog-header">
                    <div>
                        <p className="admin-audio-eyebrow">EBOOK LIBRARY</p>
                        <h2 id="admin-ebooks-form-title">{ebook ? "Edit Ebook" : "Add Ebook"}</h2>
                        <p>Manage book details, media, author credits, and publication.</p>
                    </div>
                    <button className="admin-audio-icon-button" type="button" aria-label="Close ebook form" onClick={onCancel} disabled={saving}>
                        <Icon name="x" size={18} />
                    </button>
                </header>

                <div className="admin-ebooks-form-scroll">
                    <section className="admin-ebooks-form-section" aria-labelledby="ebook-basic-heading">
                        <div className="admin-audio-section-heading"><span>01</span><div><h3 id="ebook-basic-heading">Basic information</h3><p>Set the book title and a short description.</p></div></div>
                        <div className="admin-ebooks-fields">
                            <label className="field admin-ebooks-wide">
                                <span>Book title <b aria-hidden="true">*</b></span>
                                <input autoFocus maxLength={180} value={form.title} aria-invalid={!!fieldErrors.title} aria-describedby={fieldErrors.title ? "ebook-title-error" : undefined} onChange={(event) => setField("title", event.target.value)} />
                                {fieldErrors.title && <small className="admin-field-error" id="ebook-title-error">{fieldErrors.title}</small>}
                            </label>
                            <label className="field admin-ebooks-wide">
                                <span>Description <b aria-hidden="true">*</b><small>Required · max 1,200 characters</small></span>
                                <textarea rows={4} maxLength={1200} value={form.description} aria-invalid={!!fieldErrors.description} aria-describedby={fieldErrors.description ? "ebook-description-error" : undefined} onChange={(event) => setField("description", event.target.value)} placeholder="Add a short description for this ebook" />
                                <div className="admin-ebooks-description-meta">
                                    {fieldErrors.description && <small className="admin-field-error" id="ebook-description-error">{fieldErrors.description}</small>}
                                    <small>{form.description.length}/1,200</small>
                                </div>
                            </label>
                        </div>
                    </section>

                    <section className="admin-ebooks-form-section" aria-labelledby="ebook-media-heading">
                        <div className="admin-audio-section-heading"><span>02</span><div><h3 id="ebook-media-heading">Book media</h3><p>{ebook ? "Keep the current files or choose replacements." : "Choose the cover and PDF file for this book."}</p></div></div>
                        <div className="admin-ebooks-media-grid">
                            <div className="admin-audio-media-field">
                                <span className="admin-audio-field-label">Cover image <small>Required · JPG, JPEG, PNG, WebP</small></span>
                                {form.coverImageUrl ? (
                                    <div className="admin-audio-cover-preview">
                                        <img src={form.coverImageUrl} alt="Selected ebook cover preview" />
                                        <div><b>Cover image selected</b><span>{coverFile?.name || (ebook ? "Current cover image" : "Ready to save locally")}</span><div className="admin-audio-inline-actions">
                                            <button type="button" className="btn btn-outline" onClick={() => coverInputRef.current?.click()} disabled={saving}>Replace</button>
                                            <button type="button" className="admin-audio-text-button" onClick={() => { setCoverFile(null); setField("coverImageUrl", ""); }} disabled={saving}>Remove image</button>
                                        </div></div>
                                    </div>
                                ) : (
                                    <div className="admin-audio-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); acceptCover(event.dataTransfer.files[0]); }}>
                                        <span className="admin-audio-upload-mark"><Icon name="download" size={19} /></span>
                                        <b>Drop a cover image here</b>
                                        <span>or choose a file from your device</span>
                                        <button type="button" className="btn btn-outline" onClick={() => coverInputRef.current?.click()} disabled={saving}>Choose image</button>
                                    </div>
                                )}
                                <input ref={coverInputRef} className="admin-audio-hidden-file" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" aria-label="Choose ebook cover image" onChange={(event) => { acceptCover(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
                                {fieldErrors.coverImageUrl && <small className="admin-field-error" role="alert">{fieldErrors.coverImageUrl}</small>}
                            </div>
                            <div className="admin-audio-media-field">
                                <span className="admin-audio-field-label">Book file <small>Required · PDF only</small></span>
                                {form.bookFileName ? (
                                    <div className="admin-audio-file-preview">
                                        <div className="admin-audio-file-meta"><span className="admin-audio-file-icon"><Icon name="book" size={19} /></span><div><b>{form.bookFileName}</b><span>{formatBytes(form.bookFileSize)}</span></div></div>
                                        <div className="admin-audio-inline-actions">
                                            <button type="button" className="btn btn-outline" onClick={() => pdfInputRef.current?.click()} disabled={saving}>Replace PDF</button>
                                            <button type="button" className="admin-audio-text-button" onClick={() => { setPdfFile(null); setField("bookFileName", ""); setField("bookFileSize", null); }} disabled={saving}>Remove file</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="admin-audio-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); acceptPdf(event.dataTransfer.files[0]); }}>
                                        <span className="admin-audio-upload-mark"><Icon name="book" size={19} /></span>
                                        <b>Drop a PDF here</b>
                                        <span>PDF files only</span>
                                        <button type="button" className="btn btn-outline" onClick={() => pdfInputRef.current?.click()} disabled={saving}>Choose PDF</button>
                                    </div>
                                )}
                                <input ref={pdfInputRef} className="admin-audio-hidden-file" type="file" accept=".pdf,application/pdf" aria-label="Choose ebook PDF file" onChange={(event) => { acceptPdf(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
                                {fieldErrors.bookFileName && <small className="admin-field-error" role="alert">{fieldErrors.bookFileName}</small>}
                            </div>
                        </div>
                    </section>

                    <section className="admin-ebooks-form-section" aria-labelledby="ebook-authors-heading">
                        <div className="admin-audio-section-heading"><span>03</span><div><h3 id="ebook-authors-heading">Author information</h3><p>Choose one or more writers from existing artist records.</p></div></div>
                        <div className="admin-ebooks-fields">
                            <div className="admin-ebooks-select-field admin-ebooks-wide">
                                <SearchableMultiSelect
                                    label={authorLabel}
                                    options={options.authors}
                                    value={form.authorIds}
                                    onChange={(value) => setField("authorIds", value)}
                                    placeholder="Search and select authors or writers"
                                    emptyMessage="No matching artist records."
                                    disabled={saving}
                                />
                                {fieldErrors.authorIds && <small className="admin-field-error" role="alert">{fieldErrors.authorIds}</small>}
                            </div>
                        </div>
                    </section>

                    <section className="admin-ebooks-form-section" aria-labelledby="ebook-classification-heading">
                        <div className="admin-audio-section-heading"><span>04</span><div><h3 id="ebook-classification-heading">Classification</h3><p>Assign ebook categories and its primary language.</p></div></div>
                        <div className="admin-ebooks-fields">
                            <div className="admin-ebooks-select-field">
                                <SearchableMultiSelect
                                    label={categoryLabel}
                                    options={options.categories}
                                    value={form.categoryIds}
                                    onChange={(value) => setField("categoryIds", value)}
                                    placeholder="Select one or more categories"
                                    emptyMessage="No ebook categories are available."
                                    disabled={saving}
                                />
                                {fieldErrors.categoryIds && <small className="admin-field-error" role="alert">{fieldErrors.categoryIds}</small>}
                            </div>
                            <label className="field">
                                <span>Language <b aria-hidden="true">*</b></span>
                                <select value={form.languageCode} aria-invalid={!!fieldErrors.languageCode} aria-describedby={fieldErrors.languageCode ? "ebook-language-error" : undefined} onChange={(event) => setField("languageCode", event.target.value)}>
                                    <option value="">Select a language</option>
                                    {options.languages.map((language) => <option value={language.code} key={language.code}>{language.name}</option>)}
                                </select>
                                {fieldErrors.languageCode && <small className="admin-field-error" id="ebook-language-error">{fieldErrors.languageCode}</small>}
                            </label>
                        </div>
                    </section>

                    <section className="admin-ebooks-form-section" aria-labelledby="ebook-publishing-heading">
                        <div className="admin-audio-section-heading"><span>05</span><div><h3 id="ebook-publishing-heading">Publishing information</h3><p>Choose the publication date and current status.</p></div></div>
                        <div className="admin-ebooks-fields">
                            <label className="field">
                                <span>Published date <b aria-hidden="true">*</b></span>
                                <input type="date" value={form.publishedDate} aria-invalid={!!fieldErrors.publishedDate} aria-describedby={fieldErrors.publishedDate ? "ebook-date-error" : undefined} onChange={(event) => setField("publishedDate", event.target.value)} />
                                {fieldErrors.publishedDate && <small className="admin-field-error" id="ebook-date-error">{fieldErrors.publishedDate}</small>}
                            </label>
                            <label className="field">
                                <span>Status</span>
                                <select value={form.status} onChange={(event) => setField("status", event.target.value)}>
                                    {statuses.map((status) => <option value={status} key={status}>{status.toUpperCase()}</option>)}
                                </select>
                            </label>
                        </div>
                    </section>
                </div>

                <footer className="admin-audio-dialog-footer">
                    <button type="button" className="btn btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : ebook ? "Save Changes" : "Save Ebook"}</button>
                </footer>
            </form>
        </dialog>
    );
}

function EbookDetailsDialog({ ebook, onClose, onEdit }) {
    const dialogRef = useNativeDialog();
    return (
        <dialog
            ref={dialogRef}
            className="admin-audio-dialog admin-audio-details-dialog admin-ebooks-details-dialog"
            aria-labelledby="admin-ebooks-details-title"
            onCancel={(event) => { event.preventDefault(); onClose(); }}
            onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
            <div className="admin-audio-details">
                <header className="admin-audio-dialog-header">
                    <div><p className="admin-audio-eyebrow">EBOOK DETAILS</p><h2 id="admin-ebooks-details-title">{ebook.title}</h2></div>
                    <button className="admin-audio-icon-button" type="button" aria-label="Close ebook details" onClick={onClose}><Icon name="x" size={18} /></button>
                </header>
                <div className="admin-audio-detail-media">
                    <img src={ebook.coverImageUrl} alt={`${ebook.title} cover`} />
                    <div><span className={`admin-audio-status status-${ebook.status}`}>{ebook.status.toUpperCase()}</span><p>{ebook.description}</p></div>
                </div>
                <dl className="admin-audio-detail-metadata">
                    <div><dt>Authors / Writers</dt><dd>{ebook.authors.map((author) => author.name).join(", ") || "—"}</dd></div>
                    <div><dt>Categories</dt><dd>{ebook.categories.join(", ") || "—"}</dd></div>
                    <div><dt>Language</dt><dd>{ebook.language || "—"}</dd></div>
                    <div><dt>Published date</dt><dd>{formatPublishedDate(ebook.publishedDate)}</dd></div>
                    <div className="admin-ebooks-pdf-detail"><dt>PDF file</dt><dd>{ebook.bookFileName || "—"}{ebook.bookFileName && <small>{formatBytes(ebook.bookFileSize)}</small>}</dd></div>
                </dl>
                <footer className="admin-audio-dialog-footer">
                    <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
                    <button type="button" className="btn btn-primary" onClick={() => onEdit(ebook)}>Edit Ebook</button>
                </footer>
            </div>
        </dialog>
    );
}

export default function AdminEbooksManagement() {
    const [ebooks, setEbooks] = useState([]);
    const [options, setOptions] = useState({ categories: [], authors: [], languages: [] });
    const [query, setQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [authorFilter, setAuthorFilter] = useState("");
    const [languageFilter, setLanguageFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [optionsError, setOptionsError] = useState("");
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const [creating, setCreating] = useState(false);
    const [editingEbook, setEditingEbook] = useState(null);
    const [viewingEbook, setViewingEbook] = useState(null);
    const objectUrls = useRef(new Set());

    useEffect(() => {
        let active = true;
        getAdminEbookOptions().then((result) => {
            if (active) setOptions(result);
        }).catch((error) => {
            if (active) setOptionsError(error instanceof Error ? error.message : "Ebook options could not be loaded.");
        });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setLoadError("");
        listAdminEbooks({
            page,
            size: pageSize,
            search: query,
            categoryKey: categoryFilter,
            authorId: authorFilter,
            languageCode: languageFilter,
            status: statusFilter,
        }).then((result) => {
            if (!active) return;
            setEbooks(result.items.map(normalizeAdminEbook));
            setTotalElements(result.totalElements);
            setTotalPages(result.totalPages);
        }).catch((error) => {
            if (active) setLoadError(error instanceof Error ? error.message : "Ebooks could not be loaded.");
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [page, query, categoryFilter, authorFilter, languageFilter, statusFilter, refresh]);

    useEffect(() => () => {
        objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
        objectUrls.current.clear();
    }, []);

    const hasFilters = Boolean(query.trim() || categoryFilter || authorFilter || languageFilter || statusFilter);
    const clearFilters = () => {
        setQuery("");
        setCategoryFilter("");
        setAuthorFilter("");
        setLanguageFilter("");
        setStatusFilter("");
        setPage(0);
    };

    const createPreviewUrl = (file) => {
        const url = URL.createObjectURL(file);
        objectUrls.current.add(url);
        return url;
    };

    const closeForm = () => {
        setCreating(false);
        setEditingEbook(null);
    };

    const saveEbook = async (id, values, files) => {
        const metadata = {
            title: values.title.trim(),
            description: values.description.trim(),
            languageCode: values.languageCode,
            categoryKeys: values.categoryIds,
            authorIds: values.authorIds.map(Number),
            publishedDate: values.publishedDate,
            status: values.status.toUpperCase(),
        };
        try {
            if (id) {
                const current = ebooks.find((ebook) => ebook.id === id);
                await updateAdminEbook(id, metadata, files);
                if (current && current.status !== values.status) {
                    await updateAdminEbookStatus(id, values.status.toUpperCase());
                }
            } else {
                await createAdminEbook(metadata, files);
                clearFilters();
            }
            setPage(0);
            setRefresh((current) => current + 1);
            notify.success(id ? "Ebook updated." : "Ebook created.");
            closeForm();
        } catch (error) {
            notify.error(error instanceof Error ? error.message : "Ebook could not be saved.");
        }
    };

    const deleteEbook = async (ebook) => {
        if (!window.confirm(`Delete "${ebook.title}"? This cannot be undone.`)) return;
        try {
            await deleteAdminEbook(ebook.id);
            setRefresh((current) => current + 1);
            notify.success("Ebook deleted.");
        } catch (error) {
            notify.error(error instanceof Error ? error.message : "Ebook could not be deleted.");
        }
    };

    const openEdit = async (ebook) => {
        setViewingEbook(null);
        setCreating(false);
        setDetailsLoading(true);
        try {
            setEditingEbook(normalizeAdminEbook(await getAdminEbook(ebook.id)));
        } catch (error) {
            notify.error(error instanceof Error ? error.message : "Ebook details could not be loaded.");
        } finally {
            setDetailsLoading(false);
        }
    };

    const openDetails = async (ebook) => {
        setViewingEbook(null);
        setDetailsLoading(true);
        try {
            setViewingEbook(normalizeAdminEbook(await getAdminEbook(ebook.id)));
        } catch (error) {
            notify.error(error instanceof Error ? error.message : "Ebook details could not be loaded.");
        } finally {
            setDetailsLoading(false);
        }
    };

    const changeFilter = (setter) => (event) => {
        setter(event.target.value);
        setPage(0);
    };

    return (
        <section className="admin-audio-management admin-ebooks-management" aria-label="Ebooks management">
            <div className="admin-api-heading">
                <div className="admin-api-heading-copy">
                    <p>Manage ebooks, authors, categories, uploaded book files, and published ebook content.</p>
                    <span className="admin-audio-preview-note">Manage published ebook content and uploaded media.</span>
                </div>
                {!creating && !editingEbook && <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><span aria-hidden="true">+</span>Add Ebooks</button>}
            </div>

            {optionsError && <p className="admin-field-error" role="alert">{optionsError}</p>}
            <div className="admin-audio-filter-panel admin-ebooks-filter-panel" aria-label="Search and filter ebooks">
                <label className="search-box admin-search">
                    <Icon name="search" size={17} />
                    <input type="search" value={query} onChange={changeFilter(setQuery)} placeholder="Search ebook titles" aria-label="Search ebook titles" />
                </label>
                <label><span className="sr-only">Filter by category</span><select value={categoryFilter} onChange={changeFilter(setCategoryFilter)}><option value="">All categories</option>{options.categories.map((category) => <option value={category.value} key={category.value}>{category.label}</option>)}</select></label>
                <label><span className="sr-only">Filter by author or writer</span><select value={authorFilter} onChange={changeFilter(setAuthorFilter)}><option value="">All authors</option>{options.authors.map((author) => <option value={author.value} key={author.value}>{author.label}</option>)}</select></label>
                <label><span className="sr-only">Filter by language</span><select value={languageFilter} onChange={changeFilter(setLanguageFilter)}><option value="">All languages</option>{options.languages.map((language) => <option value={language.code} key={language.code}>{language.name}</option>)}</select></label>
                <label><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={changeFilter(setStatusFilter)}><option value="">All statuses</option>{statuses.map((status) => <option value={status} key={status}>{status.toUpperCase()}</option>)}</select></label>
                <button type="button" className="btn btn-outline" onClick={clearFilters} disabled={!hasFilters}>Clear filters</button>
            </div>

            {loading ? <div className="admin-audio-empty" role="status"><p>Loading ebooks…</p></div> : loadError ? (
                <div className="admin-audio-empty" role="alert"><p>{loadError}</p><button type="button" className="btn btn-outline" onClick={() => setRefresh((current) => current + 1)}>Try again</button></div>
            ) : !ebooks.length ? (
                <div className="admin-audio-empty">
                    <span><Icon name="book" size={26} /></span>
                    <h2>{hasFilters ? "No ebooks match these filters" : "No ebooks yet"}</h2>
                    <p>{hasFilters ? "Try a different title or clear some filters." : "Add an ebook to start building the library."}</p>
                    {hasFilters ? <button type="button" className="btn btn-outline" onClick={clearFilters}>Clear filters</button> : <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>Add Ebooks</button>}
                </div>
            ) : (
                <>
                    <div className="admin-audio-table-wrap admin-ebooks-table-wrap">
                        <table className="admin-api-table admin-audio-table admin-ebooks-table" aria-label="Ebooks">
                            <thead><tr>
                                <th scope="col">Book</th><th scope="col">Category</th><th scope="col">Author / Writer</th><th scope="col">Language</th><th scope="col">Published date</th><th scope="col">Status</th><th scope="col">Actions</th>
                            </tr></thead>
                            <tbody>{ebooks.map((ebook) => (
                                <tr key={ebook.id}>
                                    <td className="admin-api-title-cell admin-ebooks-book-cell" data-label="Book">
                                        <div className="admin-ebooks-book">
                                            <img className="admin-audio-thumbnail admin-ebooks-thumbnail" src={ebook.coverImageUrl} alt="" />
                                            <div><button className="admin-api-title-link" type="button" onClick={() => openDetails(ebook)}>{ebook.title}</button><small>{ebook.description}</small></div>
                                        </div>
                                    </td>
                                    <td data-label="Category">{ebook.categories.join(", ") || "—"}</td>
                                    <td data-label="Author / Writer">{ebook.authors.map((author) => author.name).join(", ") || "—"}</td>
                                    <td data-label="Language">{ebook.language || "—"}</td>
                                    <td data-label="Published date">{formatPublishedDate(ebook.publishedDate)}</td>
                                    <td data-label="Status"><span className={`admin-audio-status status-${ebook.status}`}>{ebook.status.toUpperCase()}</span></td>
                                    <td data-label="Actions"><div className="admin-audio-actions" role="group" aria-label={`Actions for ${ebook.title}`}>
                                        <button type="button" aria-label={`View ${ebook.title}`} title="View" onClick={() => openDetails(ebook)}><Icon name="eye" size={16} /></button>
                                        <button type="button" aria-label={`Edit ${ebook.title}`} title="Edit" onClick={() => openEdit(ebook)}><Icon name="pen" size={16} /></button>
                                        <button type="button" className="danger-action" aria-label={`Delete ${ebook.title}`} title="Delete" onClick={() => deleteEbook(ebook)}><Icon name="x" size={16} /></button>
                                    </div></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                    {totalElements > pageSize && <nav className="admin-audio-pagination" aria-label="Ebook pages">
                        <span>{page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} of {totalElements}</span>
                        <div><button type="button" className="btn btn-outline" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>Previous</button><span>Page {page + 1} of {totalPages}</span><button type="button" className="btn btn-outline" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page >= totalPages - 1}>Next</button></div>
                    </nav>}
                </>
            )}

            {detailsLoading && <p role="status">Loading ebook details…</p>}
            {(creating || editingEbook) && <EbookFormDialog ebook={editingEbook || undefined} options={options} createPreviewUrl={createPreviewUrl} onCancel={closeForm} onSave={saveEbook} />}
            {viewingEbook && <EbookDetailsDialog ebook={viewingEbook} onClose={() => setViewingEbook(null)} onEdit={openEdit} />}
        </section>
    );
}
