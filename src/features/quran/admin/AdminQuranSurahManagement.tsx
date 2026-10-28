import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { quranAdminApi, QuranAdminApiError } from "../services/quranAdminApi.js";
import { changeAyahStatus, loadSurahAyahs, type AdminAyah } from "../services/quranAdminManagement.js";

type Surah = {
    number: number;
    arabicName: string;
    transliterated: string;
    englishMeaning: string;
    ayahCount: number;
    revelation: string;
    status: string;
};

type ImportReport = {
    totalRows: number;
    validRows: number;
    errorCount: number;
    errors?: Array<{ row: number; field: string; code: string; message: string }>;
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
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [bulkJson, setBulkJson] = useState("");
    const [bulkReport, setBulkReport] = useState<ImportReport | null>(null);
    const [validatedJson, setValidatedJson] = useState("");
    const [bulkBusy, setBulkBusy] = useState(false);
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
    const nextAyah = surah ? firstMissingAyah(orderedAyahs, surah.ayahCount) : null;

    const updateAyahStatus = async (ayah: AdminAyah) => {
        const nextStatus = ayah.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
        const action = nextStatus === "PUBLISHED" ? "publish" : "unpublish";
        if (!window.confirm(`${action === "publish" ? "Publish" : "Unpublish"} Ayah ${surahNumber}:${ayah.ayahNumber}?`)) return;
        setStatusBusy(ayah.ayahNumber);
        setError("");
        setMessage("");
        try {
            const updated = await changeAyahStatus(surahNumber, ayah.ayahNumber, nextStatus);
            setAyahs((current) => current.map((row) => row.ayahNumber === updated.ayahNumber ? { ...row, status: updated.status } : row));
            setMessage(`Ayah ${surahNumber}:${ayah.ayahNumber} is now ${updated.status.toLowerCase()}.`);
        } catch (statusError) {
            setError(getErrorMessage(statusError));
        } finally {
            setStatusBusy(null);
        }
    };

    const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const value = await file.text();
            setBulkJson(value);
            setBulkReport(null);
            setValidatedJson("");
            setError("");
        } catch {
            setError("The selected JSON file could not be read.");
        }
    };

    const validateImport = async () => {
        setBulkReport(null);
        setValidatedJson("");
        setError("");
        let payload: unknown;
        try {
            payload = JSON.parse(bulkJson);
        } catch {
            setError("Import must be valid JSON.");
            return;
        }
        if (!payload || typeof payload !== "object" || !Array.isArray((payload as { rows?: unknown }).rows)) {
            setError('JSON must have the shape {"rows":[...]} described in the import guide.');
            return;
        }
        setBulkBusy(true);
        try {
            const report = await quranAdminApi.validateImport(payload as object) as ImportReport;
            setBulkReport(report);
            setValidatedJson(bulkJson);
        } catch (validationError) {
            if (validationError instanceof QuranAdminApiError && validationError.data && typeof validationError.data === "object") {
                setBulkReport(validationError.data as ImportReport);
                setValidatedJson(bulkJson);
            } else {
                setError(getErrorMessage(validationError));
            }
        } finally {
            setBulkBusy(false);
        }
    };

    const commitImport = async () => {
        if (!bulkReport || bulkReport.errorCount !== 0 || validatedJson !== bulkJson) {
            setError("Validate the unchanged import batch successfully before committing.");
            return;
        }
        if (!window.confirm("Commit this append-only batch? Existing Ayah text and translations will not be replaced.")) return;
        setBulkBusy(true);
        setError("");
        setMessage("");
        try {
            const summary = await quranAdminApi.commitImport(JSON.parse(bulkJson)) as { imported: number; translationsCreated: number };
            await refreshAyahs();
            setMessage(`Import committed: ${summary.imported} Ayahs and ${summary.translationsCreated} translations added. Existing content was preserved.`);
            setBulkReport(null);
            setValidatedJson("");
            setBulkJson("");
        } catch (commitError) {
            const data = commitError instanceof QuranAdminApiError && commitError.data && typeof commitError.data === "object"
                ? commitError.data as ImportReport
                : null;
            if (data?.errors) setBulkReport(data);
            else setError(getErrorMessage(commitError));
        } finally {
            setBulkBusy(false);
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
            <header className="admin-quran-detail-heading">
                <button type="button" onClick={() => onNavigate()}>← Back to Surahs</button>
                <div>
                    <small>{mode === "view" ? "READ-ONLY SURAH VIEW" : "SURAH AYAH MANAGEMENT"}</small>
                    <h2>{surah.number}. {surah.transliterated} <span lang="ar" dir="rtl">{surah.arabicName}</span></h2>
                    <p>{surah.englishMeaning}{surah.revelation ? ` · ${surah.revelation}` : ""} · {surah.ayahCount} Ayahs</p>
                </div>
                {mode === "view"
                    ? <button className="btn btn-primary" type="button" onClick={() => onNavigate(surahNumber, "edit")}>Edit Ayahs</button>
                    : <button className="btn btn-primary" type="button" onClick={() => onOpenAyah("new", "edit")} disabled={ayahsLoading || Boolean(ayahsError) || !nextAyah}>Add Ayah</button>}
            </header>

            {message && <p className="admin-success" role="status">{message}</p>}
            {error && <p className="admin-form-error" role="alert">{error}</p>}
            {ayahsError && <div className="admin-quran-notice admin-form-error" role="alert"><span>{ayahsError}</span><button type="button" onClick={() => void refreshAyahs()}>Retry Ayahs</button></div>}
            {ayahsLoading
                ? <p className="admin-quran-state" role="status" aria-busy="true">Loading Ayahs and saved translation counts…</p>
                : !ayahsError && orderedAyahs.length === 0
                    ? <p className="admin-quran-state">No Ayah records exist for this Surah yet.</p>
                    : !ayahsError && <section className="admin-quran-ayah-list-v2" aria-label={`Ayahs in ${surah.transliterated}`}>
                        <div className="admin-quran-list-heading"><div><h3>Ayahs</h3><p>{orderedAyahs.length} records · canonical limit {surah.ayahCount}</p></div></div>
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

            {mode === "edit" && <details className="form-card admin-quran-import">
                <summary>Bulk import JSON</summary>
                <p className="form-help">Import preview validates the batch before commit. Import is append-only and never replaces existing Ayahs or translations.</p>
                <label className="field"><span>Choose JSON file</span><input type="file" accept="application/json,.json" onChange={(event) => void handleImportFile(event)} /></label>
                <label className="field"><span>Import payload: {"{"}rows: [...]{"}"}</span><textarea rows={9} value={bulkJson} onChange={(event) => { setBulkJson(event.target.value); setBulkReport(null); setValidatedJson(""); }} placeholder='{"rows":[{"surahNumber":2,"ayahNumber":1,"arabicText":"...","translationEn":"...","translatorIdEn":123}]}' /></label>
                <div className="admin-form-actions">
                    <button type="button" disabled={bulkBusy || !bulkJson.trim()} onClick={() => void validateImport()}>{bulkBusy ? "Validating…" : "Validate / preview"}</button>
                    <button className="btn btn-primary" type="button" disabled={bulkBusy || !bulkReport || bulkReport.errorCount !== 0 || validatedJson !== bulkJson} onClick={() => void commitImport()}>Commit validated batch</button>
                </div>
                {bulkReport && <div role="status">
                    <p>{bulkReport.validRows} valid of {bulkReport.totalRows} rows; {bulkReport.errorCount} errors.</p>
                    {bulkReport.errors?.map((rowError, index) => <p className="admin-form-error" key={`${rowError.row}-${rowError.code}-${index}`}>Row {rowError.row}{rowError.field ? `, ${rowError.field}` : ""}: {rowError.message}</p>)}
                </div>}
            </details>}
        </section>
    );
}
