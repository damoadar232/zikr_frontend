import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { QuranAdminApiError, quranAdminApi } from "../services/quranAdminApi.js";

type Surah = {
    number: number;
    arabicName: string;
    transliterated: string;
    englishMeaning: string;
    ayahCount: number;
    status: string;
};
type Ayah = { surahNumber: number; ayahNumber: number; arabicText: string; status: string };
type Translator = { id: number; name: string; languageCode: string; sourceRef: string; license: string };
type Translation = { languageCode: string; text: string; translatorId: number; status: string };
type TranslationDraft = { text: string; translatorId: string; status: string };
type QuranDraft = { surahNumber: number; ayahNumber: string; arabicText: string; status: string };

const languages = [
    { code: "ur", label: "Urdu", dir: "rtl" },
    { code: "hi", label: "Hindi", dir: "ltr" },
    { code: "en", label: "English", dir: "ltr" },
];

const emptyTranslations = (): Record<string, TranslationDraft> =>
    Object.fromEntries(languages.map(({ code }) => [code, { text: "", translatorId: "", status: "DRAFT" }]));

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "The Quran request failed.";
}

function getImportErrors(error: unknown) {
    if (!(error instanceof QuranAdminApiError) || !error.data || typeof error.data !== "object") return [];
    const errors = (error.data as { errors?: unknown }).errors;
    return Array.isArray(errors) ? errors as Array<{ row: number; field: string; code: string; message: string }> : [];
}

export function AdminQuranManagement() {
    const [surahs, setSurahs] = useState<Surah[]>([]);
    const [translators, setTranslators] = useState<Translator[]>([]);
    const [selectedSurah, setSelectedSurah] = useState(1);
    const [ayahs, setAyahs] = useState<Ayah[]>([]);
    const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
    const [draft, setDraft] = useState<QuranDraft>({
        surahNumber: 1, ayahNumber: "1", arabicText: "", status: "DRAFT",
    });
    const [translationDrafts, setTranslationDrafts] = useState<Record<string, TranslationDraft>>(emptyTranslations);
    const [loading, setLoading] = useState(true);
    const [loadingAyahs, setLoadingAyahs] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [bulkJson, setBulkJson] = useState("");
    const [bulkReport, setBulkReport] = useState<{ totalRows: number; validRows: number; errorCount: number; errors: Array<{ row: number; field: string; code: string; message: string }> } | null>(null);
    const [validatedJson, setValidatedJson] = useState("");
    const [bulkBusy, setBulkBusy] = useState(false);
    const [translatorForm, setTranslatorForm] = useState({ languageCode: "en", name: "", sourceRef: "", license: "" });

    useEffect(() => {
        let active = true;
        setLoading(true);
        Promise.all([quranAdminApi.listSurahs(), quranAdminApi.listTranslators()])
            .then(([surahRows, translatorRows]) => {
                if (!active) return;
                const sorted = (surahRows as Surah[]).sort((a, b) => a.number - b.number);
                setSurahs(sorted);
                setTranslators(translatorRows as Translator[]);
                if (sorted.length) {
                    setSelectedSurah(sorted[0].number);
                    setDraft((current) => ({ ...current, surahNumber: sorted[0].number }));
                }
            })
            .catch((loadError: unknown) => {
                if (active) setError(getErrorMessage(loadError));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        setLoadingAyahs(true);
        setError("");
        quranAdminApi.listAyahs(selectedSurah)
            .then((items) => {
                if (active) setAyahs((items as Ayah[]).slice().sort((a, b) => a.ayahNumber - b.ayahNumber));
            })
            .catch((loadError: unknown) => {
                if (active) setError(getErrorMessage(loadError));
            })
            .finally(() => {
                if (active) setLoadingAyahs(false);
            });
        return () => { active = false; };
    }, [selectedSurah]);

    const selectedSurahInfo = useMemo(
        () => surahs.find((surah) => surah.number === selectedSurah),
        [selectedSurah, surahs],
    );

    const openAyah = async (ayah: Ayah) => {
        setError("");
        setMessage("");
        setSelectedAddress(`${ayah.surahNumber}:${ayah.ayahNumber}`);
        setDraft({
            surahNumber: ayah.surahNumber,
            ayahNumber: String(ayah.ayahNumber),
            arabicText: ayah.arabicText,
            status: ayah.status,
        });
        try {
            const records = await quranAdminApi.listTranslations(ayah.surahNumber, ayah.ayahNumber) as Translation[];
            const next = emptyTranslations();
            records.forEach((record) => {
                next[record.languageCode] = {
                    text: record.text,
                    translatorId: String(record.translatorId),
                    status: record.status,
                };
            });
            setTranslationDrafts(next);
        } catch (loadError) {
            setError(getErrorMessage(loadError));
            setTranslationDrafts(emptyTranslations());
        }
    };

    const startNew = () => {
        setSelectedAddress(null);
        setDraft({ surahNumber: selectedSurah, ayahNumber: "", arabicText: "", status: "DRAFT" });
        setTranslationDrafts(emptyTranslations());
        setError("");
        setMessage("");
    };

    const reloadAyahs = async () => {
        const items = await quranAdminApi.listAyahs(selectedSurah) as Ayah[];
        setAyahs(items.slice().sort((a, b) => a.ayahNumber - b.ayahNumber));
    };

    const saveAyah = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setMessage("");
        const ayahNumber = Number(draft.ayahNumber);
        if (!Number.isInteger(ayahNumber) || ayahNumber < 1 || ayahNumber > (selectedSurahInfo?.ayahCount ?? 0)) {
            setError("Enter an Ayah number within the selected Surah.");
            return;
        }
        if (!draft.arabicText.trim()) {
            setError("Arabic text is required.");
            return;
        }
        const missingTranslator = languages.find((language) => {
            const translation = translationDrafts[language.code];
            return translation.text.trim() && !translation.translatorId;
        });
        if (missingTranslator) {
            setError(`Choose a ${missingTranslator.label} translator before saving that translation.`);
            return;
        }
        setSaving(true);
        let ayahSaved = false;
        try {
            const payload = {
                surahNumber: draft.surahNumber,
                ayahNumber,
                arabicText: draft.arabicText.trim(),
                status: selectedAddress ? draft.status : "DRAFT",
            };
            if (selectedAddress) {
                await quranAdminApi.updateAyah(draft.surahNumber, ayahNumber, payload);
            } else {
                await quranAdminApi.createAyah(payload);
                setSelectedAddress(`${draft.surahNumber}:${ayahNumber}`);
            }
            ayahSaved = true;
            for (const language of languages) {
                const translation = translationDrafts[language.code];
                if (!translation.text.trim()) continue;
                await quranAdminApi.upsertTranslation(draft.surahNumber, ayahNumber, language.code, {
                    text: translation.text.trim(),
                    translatorId: Number(translation.translatorId),
                    status: translation.status,
                });
            }
            await reloadAyahs();
            setMessage(`Ayah ${draft.surahNumber}:${ayahNumber} saved to the authenticated Quran API as ${selectedAddress ? "updated" : "draft"}.`);
        } catch (saveError) {
            setError(ayahSaved
                ? `Ayah content was saved, but a translation request failed: ${getErrorMessage(saveError)}`
                : getErrorMessage(saveError));
        } finally {
            setSaving(false);
        }
    };

    const setAyahStatus = async () => {
        if (!selectedAddress) return;
        const [surah, ayah] = selectedAddress.split(":").map(Number);
        const nextStatus = draft.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
        setSaving(true);
        setError("");
        setMessage("");
        try {
            const updated = await quranAdminApi.setAyahStatus(surah, ayah, nextStatus) as Ayah;
            setDraft((current) => ({ ...current, status: updated.status }));
            await reloadAyahs();
            setMessage(`Ayah ${selectedAddress} is now ${updated.status.toLowerCase()}.`);
        } catch (statusError) {
            setError(getErrorMessage(statusError));
        } finally {
            setSaving(false);
        }
    };

    const setTranslationStatus = async (language: string) => {
        if (!selectedAddress) return;
        const [surah, ayah] = selectedAddress.split(":").map(Number);
        const translation = translationDrafts[language];
        if (!translation.text.trim()) return;
        const nextStatus = translation.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
        setSaving(true);
        setError("");
        try {
            const updated = await quranAdminApi.setTranslationStatus(surah, ayah, language, nextStatus) as Translation;
            setTranslationDrafts((current) => ({
                ...current,
                [language]: { ...current[language], status: updated.status },
            }));
            setMessage(`${language.toUpperCase()} translation is now ${updated.status.toLowerCase()}.`);
        } catch (statusError) {
            setError(getErrorMessage(statusError));
        } finally {
            setSaving(false);
        }
    };

    const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            setBulkJson(await file.text());
            setBulkReport(null);
            setValidatedJson("");
            setError("");
        } catch {
            setError("The selected JSON file could not be read.");
        }
    };

    const validateBatch = async () => {
        setBulkReport(null);
        setValidatedJson("");
        setError("");
        let parsed: unknown;
        try {
            parsed = JSON.parse(bulkJson);
        } catch {
            setError("Import must be valid JSON.");
            return;
        }
        if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { rows?: unknown }).rows)) {
            setError('JSON must have the shape {"rows":[...]} described in the import guide.');
            return;
        }
        setBulkBusy(true);
        try {
            const report = await quranAdminApi.validateImport(parsed as object);
            setBulkReport(report as typeof bulkReport);
            setValidatedJson(bulkJson);
        } catch (validationError) {
            if (validationError instanceof QuranAdminApiError && validationError.data) {
                const data = validationError.data as typeof bulkReport;
                setBulkReport(data);
                setValidatedJson(bulkJson);
            } else {
                setError(getErrorMessage(validationError));
            }
        } finally {
            setBulkBusy(false);
        }
    };

    const commitBatch = async () => {
        if (!bulkReport || bulkReport.errorCount !== 0 || validatedJson !== bulkJson) {
            setError("Validate the unchanged import batch successfully before committing.");
            return;
        }
        if (!window.confirm("Commit this append-only batch? Existing Ayah text and translations will not be replaced.")) return;
        setBulkBusy(true);
        setError("");
        setMessage("");
        try {
            const summary = await quranAdminApi.commitImport(JSON.parse(bulkJson));
            setMessage(`Import committed: ${summary.imported} Ayahs added; ${summary.translationsCreated} translations added. Existing content was preserved.`);
            setBulkReport(null);
            setValidatedJson("");
            setBulkJson("");
            await reloadAyahs();
        } catch (commitError) {
            const rowErrors = getImportErrors(commitError);
            if (rowErrors.length) {
                setBulkReport((commitError as QuranAdminApiError).data as typeof bulkReport);
            } else {
                setError(getErrorMessage(commitError));
            }
        } finally {
            setBulkBusy(false);
        }
    };

    const createTranslator = async () => {
        if (!translatorForm.name.trim() || !translatorForm.sourceRef.trim() || !translatorForm.license.trim()) {
            setError("Translator name, source reference, and license are required.");
            return;
        }
        setError("");
        setMessage("");
        setSaving(true);
        try {
            const created = await quranAdminApi.createTranslator({
                ...translatorForm,
                name: translatorForm.name.trim(),
                sourceRef: translatorForm.sourceRef.trim(),
                license: translatorForm.license.trim(),
            }) as Translator;
            setTranslators((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
            setTranslationDrafts((current) => ({
                ...current,
                [created.languageCode]: { ...current[created.languageCode], translatorId: String(created.id) },
            }));
            setTranslatorForm({ languageCode: translatorForm.languageCode, name: "", sourceRef: "", license: "" });
            setMessage(`${created.languageCode.toUpperCase()} translator added. Use accurate source and license information.`);
        } catch (translatorError) {
            setError(getErrorMessage(translatorError));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <section className="admin-table form-card" aria-busy="true">Loading Quran administration…</section>;

    return (
        <section className="admin-table form-card admin-quran-management">
            <div className="admin-list-toolbar">
                <label className="field">
                    <span>Surah</span>
                    <select value={selectedSurah} onChange={(event) => {
                        const number = Number(event.target.value);
                        setSelectedSurah(number);
                        setDraft((current) => ({ ...current, surahNumber: number }));
                        setSelectedAddress(null);
                    }}>
                        {surahs.map((surah) => <option key={surah.number} value={surah.number}>{surah.number}. {surah.transliterated} ({surah.status.toLowerCase()})</option>)}
                    </select>
                </label>
                <button className="btn btn-primary" type="button" onClick={startNew}>New Ayah</button>
            </div>

            {message && <p className="admin-success" role="status">{message}</p>}
            {error && <p className="admin-form-error" role="alert">{error}</p>}

            <div className="admin-quran-workspace">
                <section className="admin-quran-ayah-list" aria-label="Ayahs">
                    <h2>Ayahs</h2>
                    {loadingAyahs ? <p aria-live="polite">Loading Ayahs…</p> : ayahs.length ? ayahs.map((ayah) => (
                        <button
                            type="button"
                            key={`${ayah.surahNumber}:${ayah.ayahNumber}`}
                            className={`admin-record-summary ${selectedAddress === `${ayah.surahNumber}:${ayah.ayahNumber}` ? "active" : ""}`}
                            onClick={() => void openAyah(ayah)}
                        >
                            <b>{ayah.surahNumber}:{ayah.ayahNumber}</b>
                            <small className="admin-arabic-preview" lang="ar" dir="rtl">{ayah.arabicText}</small>
                            <span className={`status ${ayah.status.toLowerCase()}`}>{ayah.status.toLowerCase()}</span>
                        </button>
                    )) : <p className="admin-empty">No Ayah records exist for this Surah yet.</p>}
                </section>

                <form className="editor-form admin-content-form" onSubmit={(event) => void saveAyah(event)}>
                    <section className="form-card">
                        <h2>{selectedAddress ? `Manage Ayah ${selectedAddress}` : "Add Ayah"}</h2>
                        <p className="form-help">Only supplied content is saved. New Ayahs start as drafts; publish each record after review.</p>
                        <div className="two-fields">
                            <label className="field"><span>Surah number</span><input type="number" value={draft.surahNumber} readOnly /></label>
                            <label className="field"><span>Ayah number *</span><input required type="number" min="1" max={selectedSurahInfo?.ayahCount ?? undefined} value={draft.ayahNumber} onChange={(event) => setDraft((current) => ({ ...current, ayahNumber: event.target.value }))} /></label>
                        </div>
                        <label className="field"><span>Arabic text *</span><textarea required lang="ar" dir="rtl" rows={5} value={draft.arabicText} onChange={(event) => setDraft((current) => ({ ...current, arabicText: event.target.value }))} /></label>
                        <p>Ayah status: <span className={`status ${draft.status.toLowerCase()}`}>{draft.status.toLowerCase()}</span></p>
                        <div className="admin-form-actions">
                            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save Ayah and translations"}</button>
                            {selectedAddress && <button type="button" disabled={saving} onClick={() => void setAyahStatus()}>{draft.status === "PUBLISHED" ? "Unpublish Ayah" : "Publish Ayah"}</button>}
                        </div>
                    </section>
                    {languages.map((language) => {
                        const translation = translationDrafts[language.code];
                        const available = translators.filter((item) => item.languageCode === language.code);
                        return (
                            <section className="form-card" key={language.code}>
                                <h3>{language.label} translation</h3>
                                <label className="field"><span>Text</span><textarea lang={language.code} dir={language.dir} rows={3} value={translation.text} onChange={(event) => setTranslationDrafts((current) => ({ ...current, [language.code]: { ...current[language.code], text: event.target.value } }))} /></label>
                                <label className="field"><span>Translator</span><select value={translation.translatorId} onChange={(event) => setTranslationDrafts((current) => ({ ...current, [language.code]: { ...current[language.code], translatorId: event.target.value } }))}><option value="">Select a {language.label} translator</option>{available.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                                <p>Translation status: <span className={`status ${translation.status.toLowerCase()}`}>{translation.status.toLowerCase()}</span></p>
                                {selectedAddress && translation.text && <button type="button" disabled={saving} onClick={() => void setTranslationStatus(language.code)}>{translation.status === "PUBLISHED" ? "Unpublish translation" : "Publish translation"}</button>}
                                {!available.length && <p className="form-help">No translator is registered for this language. Add one below using verified source and license metadata.</p>}
                            </section>
                        );
                    })}
                    <details className="form-card">
                        <summary>Add translator</summary>
                        <div className="editor-form admin-content-form">
                            <label className="field"><span>Language</span><select value={translatorForm.languageCode} onChange={(event) => setTranslatorForm((current) => ({ ...current, languageCode: event.target.value }))}>{languages.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}</select></label>
                            <label className="field"><span>Translator name *</span><input required value={translatorForm.name} onChange={(event) => setTranslatorForm((current) => ({ ...current, name: event.target.value }))} /></label>
                            <label className="field"><span>Verified source reference *</span><input required value={translatorForm.sourceRef} onChange={(event) => setTranslatorForm((current) => ({ ...current, sourceRef: event.target.value }))} /></label>
                            <label className="field"><span>License *</span><input required value={translatorForm.license} onChange={(event) => setTranslatorForm((current) => ({ ...current, license: event.target.value }))} /></label>
                            <button type="button" disabled={saving} onClick={() => void createTranslator()}>Add translator</button>
                        </div>
                    </details>
                </form>
            </div>

            <details className="form-card admin-quran-import">
                <summary>Bulk import JSON</summary>
                <p className="form-help">Preview validates every row before commit. Imports require Arabic text, valid Surah/Ayah addresses and verified translator IDs. Existing Arabic and translation records are append-only and are never replaced.</p>
                <label className="field"><span>Choose JSON file</span><input type="file" accept="application/json,.json" onChange={(event) => void handleFile(event)} /></label>
                <label className="field"><span>Import payload: {"{"}rows: [...]{"}"}</span><textarea rows={12} value={bulkJson} onChange={(event) => {
                    setBulkJson(event.target.value);
                    setBulkReport(null);
                    setValidatedJson("");
                }} placeholder='{"rows":[{"surahNumber":2,"ayahNumber":1,"arabicText":"...","translationEn":"...","translatorIdEn":123}]}' /></label>
                <div className="admin-form-actions">
                    <button type="button" disabled={bulkBusy || !bulkJson.trim()} onClick={() => void validateBatch()}>{bulkBusy ? "Validating…" : "Validate / preview"}</button>
                    <button className="btn btn-primary" type="button" disabled={bulkBusy || !bulkReport || bulkReport.errorCount !== 0 || validatedJson !== bulkJson} onClick={() => void commitBatch()}>Commit validated batch</button>
                </div>
                {bulkReport && <div role="status">
                    <p>{bulkReport.validRows} valid of {bulkReport.totalRows} rows; {bulkReport.errorCount} errors.</p>
                    {bulkReport.errors?.map((rowError, index) => <p className="admin-form-error" key={`${rowError.row}-${rowError.code}-${index}`}>Row {rowError.row}, {rowError.field}: {rowError.message} ({rowError.code})</p>)}
                </div>}
            </details>
        </section>
    );
}
