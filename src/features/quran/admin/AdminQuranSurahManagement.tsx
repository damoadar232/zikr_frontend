import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { quranAdminApi } from "../services/quranAdminApi.js";
import { changeAyahStatus, loadSurahAyahs, saveAyahRecord, validateAyahRecord, type AdminAyah } from "../services/quranAdminManagement.js";
import { Icon } from "../../../components/ui";
import { getUserFacingError, notify } from "../../../app/notifications/toastStore.js";

type Surah = {
    number: number;
    arabicName: string;
    transliterated: string;
    englishMeaning: string;
    ayahCount?: number;
    revelation: string;
    status: string;
};

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "The Quran request failed.";
}

function firstMissingAyah(ayahs: AdminAyah[], ayahCount: number) {
    const used = new Set(ayahs.map((ayah) => ayah.ayahNumber));
    for (let number = 1; number <= ayahCount; number += 1) {
        if (!used.has(number)) return number;
    }
    return null;
}

export function AdminQuranSurahManagement({
    surahNumber,
    mode,
    onNavigate,
    onOpenAyah,
}: {
    surahNumber: number;
    mode: "view" | "edit";
    onNavigate: (surahNumber?: number, mode?: "view" | "edit") => void;
    onOpenAyah: (ayahNumber: number | "new", mode: "view" | "edit") => void;
}) {
    const [surah, setSurah] = useState<Surah | null>(null);
    const [surahLoading, setSurahLoading] = useState(true);
    const [surahError, setSurahError] = useState("");
    const [ayahs, setAyahs] = useState<AdminAyah[]>([]);
    const [ayahsLoading, setAyahsLoading] = useState(true);
    const [ayahsError, setAyahsError] = useState("");
    const [statusBusy, setStatusBusy] = useState<number | null>(null);
    const [addAyahOpen, setAddAyahOpen] = useState(false);
    const [newAyahNumber, setNewAyahNumber] = useState("");
    const [newArabicText, setNewArabicText] = useState("");
    const [addAyahSaving, setAddAyahSaving] = useState(false);
    const [addAyahFieldErrors, setAddAyahFieldErrors] = useState<{ ayahNumber?: string; arabicText?: string }>({});
    const addAyahButtonRef = useRef<HTMLButtonElement>(null);
    const ayahNumberInputRef = useRef<HTMLInputElement>(null);
    const addAyahDialogRef = useRef<HTMLDivElement>(null);
    const addAyahSaveLock = useRef(false);
    const addAyahBaseline = useRef({ ayahNumber: "", arabicText: "" });
    const listRequest = useRef(0);

    useEffect(() => {
        let active = true;
        setSurahLoading(true);
        setSurahError("");
        quranAdminApi.listSurahs().then((rows) => {
            if (active) setSurah((rows as Surah[]).find((row) => row.number === surahNumber) || null);
        }).catch((loadError: unknown) => {
            if (active) setSurahError(getErrorMessage(loadError));
        }).finally(() => {
            if (active) setSurahLoading(false);
        });
        return () => { active = false; };
    }, [surahNumber]);

    const refreshAyahs = useCallback(async () => {
        const request = ++listRequest.current;
        setAyahsLoading(true);
        setAyahsError("");
        try {
            const rows = await loadSurahAyahs(surahNumber);
            if (request === listRequest.current) setAyahs(rows);
        } catch (loadError) {
            if (request === listRequest.current) setAyahsError(getErrorMessage(loadError));
        } finally {
            if (request === listRequest.current) setAyahsLoading(false);
        }
    }, [surahNumber]);

    useEffect(() => {
        setAyahs([]);
        void refreshAyahs();
        return () => { listRequest.current += 1; };
    }, [refreshAyahs]);

    const retrySurah = async () => {
        setSurahLoading(true);
        setSurahError("");
        try {
            const rows = await quranAdminApi.listSurahs() as Surah[];
            setSurah(rows.find((row) => row.number === surahNumber) || null);
        } catch (loadError) {
            setSurahError(getErrorMessage(loadError));
        } finally {
            setSurahLoading(false);
        }
    };

    const orderedAyahs = useMemo(() => ayahs.slice().sort((a, b) => a.ayahNumber - b.ayahNumber), [ayahs]);
    const nextAyah = surah
        && typeof surah.ayahCount === "number"
        && Number.isInteger(surah.ayahCount)
        && surah.ayahCount > 0
        ? firstMissingAyah(orderedAyahs, surah.ayahCount)
        : null;

    const openAddAyah = () => {
        const startingAyahNumber = !ayahsLoading && !ayahsError && nextAyah !== null
            ? String(nextAyah)
            : "";
        const initialErrors: typeof addAyahFieldErrors = {};
        if (!surah || !Number.isInteger(surah.ayahCount) || (surah.ayahCount ?? 0) < 1) {
            initialErrors.ayahNumber = "Canonical Ayah count is unavailable from Surah metadata; this Ayah cannot be saved safely.";
        } else if (!ayahsLoading && !ayahsError && nextAyah === null) {
            initialErrors.ayahNumber = `All ${surah.ayahCount} canonical Ayah numbers already exist in this Surah.`;
        }
        addAyahBaseline.current = { ayahNumber: startingAyahNumber, arabicText: "" };
        setNewAyahNumber(startingAyahNumber);
        setNewArabicText("");
        setAddAyahFieldErrors(initialErrors);
        setAddAyahOpen(true);
    };

    const closeAddAyah = () => {
        if (addAyahSaveLock.current) return;
        const hasUnsavedChanges = newAyahNumber !== addAyahBaseline.current.ayahNumber
            || newArabicText !== addAyahBaseline.current.arabicText;
        if (hasUnsavedChanges && !window.confirm("Discard your unsaved Ayah changes?")) return;
        setAddAyahOpen(false);
    };

    const handleAddAyahKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closeAddAyah();
            return;
        }
        if (event.key !== "Tab") return;
        const focusable = addAyahDialogRef.current?.querySelectorAll<HTMLElement>(
            "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        );
        if (!focusable?.length) {
            event.preventDefault();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    const saveNewAyah = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!surah || addAyahSaveLock.current) return;
        const ayahNumber = Number(newAyahNumber);
        addAyahSaveLock.current = true;
        setAddAyahSaving(true);
        setAddAyahFieldErrors({});
        try {
            const input = {
                surahNumber,
                ayahNumber,
                ayahCount: surah.ayahCount,
                arabicText: newArabicText,
                existingAyahs: [],
            };
            const inputError = validateAyahRecord(input);
            if (inputError) {
                setAddAyahFieldErrors(inputError.includes("Arabic")
                    ? { arabicText: inputError }
                    : { ayahNumber: inputError });
                return;
            }

            const currentAyahs = await quranAdminApi.listAyahs(surahNumber) as AdminAyah[];
            const duplicateError = validateAyahRecord({ ...input, existingAyahs: currentAyahs });
            if (duplicateError) {
                setAddAyahFieldErrors({ ayahNumber: duplicateError });
                return;
            }

            const saved = await saveAyahRecord({
                surahNumber,
                ayahNumber,
                arabicText: newArabicText,
                status: "DRAFT",
                editing: false,
            });
            const savedAyah: AdminAyah = { ...saved, translations: saved.translations || [] };
            setAyahs((current) => [
                ...current.filter((ayah) => ayah.ayahNumber !== savedAyah.ayahNumber),
                savedAyah,
            ].sort((a, b) => a.ayahNumber - b.ayahNumber));
            setAddAyahOpen(false);
            notify.success(`Ayah ${surahNumber}:${ayahNumber} was created as a draft.`);
            await refreshAyahs();
        } catch (saveError) {
            const message = getUserFacingError(saveError, "The Ayah could not be created.");
            notify.error(message);
        } finally {
            addAyahSaveLock.current = false;
            setAddAyahSaving(false);
        }
    };

    useEffect(() => {
        if (!addAyahOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        ayahNumberInputRef.current?.focus();
        return () => {
            document.body.style.overflow = previousOverflow;
            addAyahButtonRef.current?.focus();
        };
    }, [addAyahOpen]);

    const updateAyahStatus = async (ayah: AdminAyah) => {
        const nextStatus = ayah.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
        const action = nextStatus === "PUBLISHED" ? "publish" : "unpublish";
        if (!window.confirm(`${action === "publish" ? "Publish" : "Unpublish"} Ayah ${surahNumber}:${ayah.ayahNumber}?`)) return;
        setStatusBusy(ayah.ayahNumber);
        try {
            const updated = await changeAyahStatus(surahNumber, ayah.ayahNumber, nextStatus);
            setAyahs((current) => current.map((row) => row.ayahNumber === updated.ayahNumber ? { ...row, status: updated.status } : row));
            notify.success(`Ayah ${surahNumber}:${ayah.ayahNumber} is now ${updated.status.toLowerCase()}.`);
        } catch (statusError) {
            const message = getUserFacingError(statusError, "The Ayah status could not be updated.");
            notify.error(message);
        } finally {
            setStatusBusy(null);
        }
    };

    if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
        return <section className="admin-quran-state"><h2>Surah not found</h2><p>Choose a Surah number between 1 and 114.</p><button type="button" onClick={() => onNavigate()}>Return to Surahs</button></section>;
    }
    if (surahLoading) return <section className="admin-quran-state" role="status" aria-busy="true">Loading Surah details…</section>;
    if (surahError) return <section className="admin-quran-state" role="alert"><p>{surahError}</p><button type="button" onClick={() => void retrySurah()}>Retry</button><button type="button" onClick={() => onNavigate()}>Return to Surahs</button></section>;
    if (!surah) return <section className="admin-quran-state"><h2>Surah unavailable</h2><p>Surah {surahNumber} was not returned by the admin API.</p><button type="button" onClick={() => onNavigate()}>Return to Surahs</button></section>;

    return (
        <section className="admin-quran-management admin-quran-surah-management">
            <div className="admin-quran-back-row">
                <button type="button" aria-label="Back to Surahs" title="Back to Surahs" onClick={() => onNavigate()}>
                    <Icon name="arrow" size={18} />
                </button>
            </div>
            <header className="admin-quran-detail-heading">
                <div>
                    <small>{mode === "view" ? "READ-ONLY SURAH VIEW" : "SURAH AYAH MANAGEMENT"}</small>
                    <h2>{surah.number}. {surah.transliterated} <span lang="ar" dir="rtl">{surah.arabicName}</span></h2>
                    <p>{surah.englishMeaning}{surah.revelation ? ` · ${surah.revelation}` : ""} · {Number.isInteger(surah.ayahCount) && (surah.ayahCount ?? 0) > 0 ? `${surah.ayahCount} Ayahs` : "canonical Ayah limit unavailable"}</p>
                </div>
                {mode === "view"
                    ? <button className="btn btn-primary" type="button" onClick={() => onNavigate(surahNumber, "edit")}>Edit Ayahs</button>
                    : <button ref={addAyahButtonRef} className="btn btn-primary" type="button" onClick={openAddAyah}>Add Ayah</button>}
            </header>

            {ayahsError && <div className="admin-quran-notice admin-form-error" role="alert"><span>{ayahsError}</span><button type="button" onClick={() => void refreshAyahs()}>Retry Ayahs</button></div>}
            {ayahsLoading
                ? <p className="admin-quran-state" role="status" aria-busy="true">Loading Ayahs and saved translation counts…</p>
                : !ayahsError && orderedAyahs.length === 0
                    ? <p className="admin-quran-state">No Ayah records exist for this Surah yet.</p>
                    : orderedAyahs.length > 0 && <section className="admin-quran-ayah-list-v2" aria-label={`Ayahs in ${surah.transliterated}`}>
                        <div className="admin-quran-list-heading"><div><h3>Ayahs</h3><p>{orderedAyahs.length} records · {Number.isInteger(surah.ayahCount) && (surah.ayahCount ?? 0) > 0 ? `canonical limit ${surah.ayahCount}` : "canonical Ayah limit unavailable"}</p></div></div>
                        <div className="admin-quran-table-wrap">
                            <table className="admin-quran-table admin-quran-ayah-table">
                                <thead><tr>
                                    <th scope="col">Ayah</th>
                                    <th scope="col">Arabic text</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Saved translations</th>
                                    <th scope="col">Actions</th>
                                </tr></thead>
                                <tbody>{orderedAyahs.map((ayah) => <tr key={ayah.ayahNumber}>
                                    <td data-label="Ayah">{ayah.ayahNumber}</td>
                                    <td data-label="Arabic text" lang="ar" dir="rtl" className="admin-quran-arabic">{ayah.arabicText}</td>
                                    <td data-label="Status"><span className={`status ${ayah.status.toLowerCase()}`}>{ayah.status.toLowerCase()}</span></td>
                                    <td data-label="Saved translations">{ayah.translations.length}</td>
                                    <td data-label="Actions" className="admin-quran-actions">
                                        <button type="button" onClick={() => onOpenAyah(ayah.ayahNumber, "view")}>View</button>
                                        {mode === "edit" && <>
                                            <button type="button" onClick={() => onOpenAyah(ayah.ayahNumber, "edit")}>Edit</button>
                                            <button type="button" disabled={statusBusy !== null} onClick={() => void updateAyahStatus(ayah)}>{statusBusy === ayah.ayahNumber ? "Updating…" : ayah.status === "PUBLISHED" ? "Unpublish" : "Publish"}</button>
                                        </>}
                                    </td>
                                </tr>)}</tbody>
                            </table>
                        </div>
                    </section>}

            {addAyahOpen && <div
                className="admin-quran-add-ayah-overlay"
                role="presentation"
                onMouseDown={(event) => {
                    if (event.target === event.currentTarget) closeAddAyah();
                }}
            >
                <div
                    ref={addAyahDialogRef}
                    className="admin-quran-add-ayah-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="admin-add-ayah-title"
                    aria-describedby="admin-add-ayah-description"
                    onKeyDown={handleAddAyahKeyDown}
                >
                    <header className="admin-quran-add-ayah-heading">
                        <div>
                            <small>AYAH CONTENT</small>
                            <h2 id="admin-add-ayah-title">Add New Ayah</h2>
                            <p id="admin-add-ayah-description">Create the Ayah first; translations can be managed separately.</p>
                        </div>
                        <button
                            type="button"
                            className="admin-quran-add-ayah-close"
                            aria-label="Close Add New Ayah"
                            onClick={closeAddAyah}
                            disabled={addAyahSaving}
                        >×</button>
                    </header>
                    <form className="admin-quran-add-ayah-form" onSubmit={(event) => void saveNewAyah(event)} noValidate>
                        <label className="field">
                            <span>Surah Number</span>
                            <input type="number" value={surah.number} readOnly aria-readonly="true" />
                        </label>
                        <label className="field">
                            <span>Ayah Number *</span>
                            <input
                                ref={ayahNumberInputRef}
                                type="number"
                                min="1"
                                max={surah.ayahCount}
                                step="1"
                                required
                                value={newAyahNumber}
                                aria-invalid={Boolean(addAyahFieldErrors.ayahNumber)}
                                aria-describedby={addAyahFieldErrors.ayahNumber ? "admin-add-ayah-number-error" : undefined}
                                onChange={(event) => {
                                    setNewAyahNumber(event.target.value);
                                    setAddAyahFieldErrors((current) => ({
                                        ...current,
                                        ayahNumber: Number.isInteger(surah.ayahCount) && (surah.ayahCount ?? 0) > 0
                                            ? undefined
                                            : "Canonical Ayah count is unavailable from Surah metadata; this Ayah cannot be saved safely.",
                                    }));
                                }}
                            />
                            {addAyahFieldErrors.ayahNumber && <small id="admin-add-ayah-number-error" className="admin-quran-field-error" role="alert">{addAyahFieldErrors.ayahNumber}</small>}
                        </label>
                        <label className="field">
                            <span>Arabic Text *</span>
                            <textarea
                                lang="ar"
                                dir="rtl"
                                rows={5}
                                required
                                value={newArabicText}
                                aria-invalid={Boolean(addAyahFieldErrors.arabicText)}
                                aria-describedby={addAyahFieldErrors.arabicText ? "admin-add-ayah-arabic-error" : undefined}
                                onChange={(event) => {
                                    setNewArabicText(event.target.value);
                                    setAddAyahFieldErrors((current) => ({ ...current, arabicText: undefined }));
                                }}
                            />
                            {addAyahFieldErrors.arabicText && <small id="admin-add-ayah-arabic-error" className="admin-quran-field-error" role="alert">{addAyahFieldErrors.arabicText}</small>}
                        </label>
                        <label className="field">
                            <span>Initial Status</span>
                            <input type="text" value="DRAFT" readOnly aria-readonly="true" />
                        </label>
                        <footer className="admin-quran-add-ayah-actions">
                            <button type="button" onClick={closeAddAyah} disabled={addAyahSaving}>Cancel</button>
                            <button className="btn btn-primary" type="submit" disabled={addAyahSaving}>
                                {addAyahSaving ? "Saving…" : "Save Ayah"}
                            </button>
                        </footer>
                    </form>
                </div>
            </div>}
        </section>
    );
}
