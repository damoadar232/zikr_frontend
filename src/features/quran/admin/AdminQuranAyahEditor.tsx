import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
    changeTranslationStatus,
    loadAyahDetails,
    loadSurahAyahRecords,
    loadSurahMetadata,
    saveAyahRecord,
    saveTranslationRecord,
    validateAyahRecord,
    type AdminAyah,
    type AdminAyahTranslation,
    type AdminTranslator,
} from "../services/quranAdminManagement.js";
import { listQuranTranslators } from "../services/quranAdminTranslators.js";
import { QuranTranslatorManagement } from "./QuranTranslatorManagement";
import { Icon } from "../../../components/ui";
import { getUserFacingError, notify } from "../../../app/notifications/toastStore.js";

const languages = [
    { code: "en", label: "English", dir: "ltr" },
    { code: "hi", label: "Hindi", dir: "ltr" },
    { code: "ur", label: "Urdu", dir: "rtl" },
] as const;

type LanguageCode = (typeof languages)[number]["code"];
type Surah = NonNullable<Awaited<ReturnType<typeof loadSurahMetadata>>>;

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "The Quran request failed.";
}

function firstMissingAyah(records: Array<{ ayahNumber: number }>, limit: number) {
    const used = new Set(records.map((record) => record.ayahNumber));
    for (let number = 1; number <= limit; number += 1) {
        if (!used.has(number)) return number;
    }
    return "";
}

export function AdminQuranAyahEditor({
    surahNumber,
    ayahNumberParam,
    mode,
    onBack,
    onNavigateAyah,
}: {
    surahNumber: number;
    ayahNumberParam: string;
    mode: "view" | "edit";
    onBack: () => void;
    onNavigateAyah: (ayahNumber: number) => void;
}) {
    const isNew = ayahNumberParam === "new";
    const routeAyahNumber = isNew ? null : Number(ayahNumberParam);
    const [surah, setSurah] = useState<Surah | null>(null);
    const [existingAyahs, setExistingAyahs] = useState<AdminAyah[]>([]);
    const [ayah, setAyah] = useState<AdminAyah | null>(null);
    const [ayahNumber, setAyahNumber] = useState("");
    const [arabicText, setArabicText] = useState("");
    const [ayahStatus, setAyahStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
    const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en");
    const [translators, setTranslators] = useState<AdminTranslator[]>([]);
    const [translatorsLoading, setTranslatorsLoading] = useState(false);
    const [translatorsError, setTranslatorsError] = useState("");
    const [translationFormOpen, setTranslationFormOpen] = useState(false);
    const [editingTranslation, setEditingTranslation] = useState<AdminAyahTranslation | null>(null);
    const [translationTranslatorId, setTranslationTranslatorId] = useState("");
    const [translationText, setTranslationText] = useState("");
    const [translationStatus, setTranslationStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
    const [loading, setLoading] = useState(true);
    const [savingAyah, setSavingAyah] = useState(false);
    const [savingTranslation, setSavingTranslation] = useState(false);
    const [statusBusy, setStatusBusy] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [translatorManagerOpen, setTranslatorManagerOpen] = useState(false);
    const [loadAttempt, setLoadAttempt] = useState(0);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        Promise.all([
            loadSurahMetadata(surahNumber),
            loadSurahAyahRecords(surahNumber),
            isNew || !Number.isInteger(routeAyahNumber) || routeAyahNumber === null
                ? Promise.resolve(null)
                : loadAyahDetails(surahNumber, routeAyahNumber),
        ]).then(([surahRecord, records, details]) => {
            if (!active) return;
            setSurah(surahRecord);
            setExistingAyahs(records as AdminAyah[]);
            if (isNew) {
                const nextAyah = surahRecord ? firstMissingAyah(records, surahRecord.ayahCount) : "";
                setAyah(null);
                setAyahNumber(String(nextAyah));
                setArabicText("");
                setAyahStatus("DRAFT");
            } else if (details) {
                setAyah(details);
                setAyahNumber(String(details.ayahNumber));
                setArabicText(details.arabicText);
                setAyahStatus(details.status);
            } else {
                setError("Enter a valid Ayah number for this Surah.");
            }
        }).catch((loadError: unknown) => {
            if (active) setError(getErrorMessage(loadError));
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [isNew, loadAttempt, routeAyahNumber, surahNumber]);

    useEffect(() => {
        if (mode === "view") return;
        let active = true;
        setTranslatorsLoading(true);
        setTranslatorsError("");
        listQuranTranslators(selectedLanguage).then((rows) => {
            if (active) setTranslators(rows);
        }).catch((loadError: unknown) => {
            if (active) setTranslatorsError(getErrorMessage(loadError));
        }).finally(() => {
            if (active) setTranslatorsLoading(false);
        });
        return () => { active = false; };
    }, [mode, selectedLanguage]);

    const selectedLanguageInfo = languages.find((language) => language.code === selectedLanguage)!;
    const selectedTranslations = useMemo(
        () => (ayah?.translations || []).filter((translation) => translation.languageCode === selectedLanguage),
        [ayah?.translations, selectedLanguage],
    );
    const selectedTranslators = translators.filter((translator) => translator.languageCode === selectedLanguage);
    const selectedTranslatorAlreadyUsed = selectedTranslations.some((translation) =>
        String(translation.translatorId) === translationTranslatorId
        && translation.translatorId !== editingTranslation?.translatorId,
    );

    const retryTranslators = async () => {
        setTranslatorsLoading(true);
        setTranslatorsError("");
        try {
            setTranslators(await listQuranTranslators(selectedLanguage, { force: true }));
        } catch (loadError) {
            setTranslatorsError(getErrorMessage(loadError));
        } finally {
            setTranslatorsLoading(false);
        }
    };

    const saveAyah = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!surah || savingAyah) return;
        const number = Number(ayahNumber);
        const validationError = validateAyahRecord({
            surahNumber,
            ayahNumber: number,
            ayahCount: surah.ayahCount,
            arabicText,
            existingAyahs,
            editingAyahNumber: ayah?.ayahNumber,
        });
        if (validationError) {
            setError(validationError);
            return;
        }
        setSavingAyah(true);
        setError("");
        try {
            const saved = await saveAyahRecord({
                surahNumber,
                ayahNumber: number,
                arabicText,
                status: ayahStatus,
                editing: Boolean(ayah),
            });
            notify.success(`Ayah ${surahNumber}:${number} saved.`);
            if (isNew) onNavigateAyah(saved.ayahNumber);
            else {
                setAyah((current) => current ? { ...current, ...saved } : current);
                setExistingAyahs((records) => records.some((record) => record.ayahNumber === number)
                    ? records.map((record) => record.ayahNumber === number ? { ...record, ...saved } : record)
                    : [...records, saved]);
            }
        } catch (saveError) {
            const message = getUserFacingError(saveError, "The Ayah could not be saved.");
            notify.error(message);
        } finally {
            setSavingAyah(false);
        }
    };

    const openAddTranslation = () => {
        setEditingTranslation(null);
        setTranslationTranslatorId("");
        setTranslationText("");
        setTranslationStatus("DRAFT");
        setTranslationFormOpen(true);
        setError("");
    };

    const openEditTranslation = (translation: AdminAyahTranslation) => {
        setEditingTranslation(translation);
        setTranslationTranslatorId(String(translation.translatorId));
        setTranslationText(translation.text);
        setTranslationStatus(translation.status);
        setTranslationFormOpen(true);
        setError("");
    };

    const saveTranslation = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!ayah || savingTranslation || selectedTranslatorAlreadyUsed) return;
        setSavingTranslation(true);
        setError("");
        try {
            const saved = await saveTranslationRecord({
                surahNumber,
                ayahNumber: ayah.ayahNumber,
                languageCode: selectedLanguage,
                translatorId: translationTranslatorId,
                text: translationText,
                status: translationStatus,
            });
            setAyah((current) => current ? {
                ...current,
                translations: [
                    ...current.translations.filter((translation) => translation.translatorId !== saved.translatorId
                        || translation.languageCode !== saved.languageCode),
                    saved,
                ],
            } : current);
            notify.success(`${selectedLanguageInfo.label} translation saved as ${saved.status.toLowerCase()}.`);
            setTranslationFormOpen(false);
            setEditingTranslation(null);
        } catch (saveError) {
            const message = getUserFacingError(saveError, "The translation could not be saved.");
            notify.error(message);
        } finally {
            setSavingTranslation(false);
        }
    };

    const toggleTranslationStatus = async (translation: AdminAyahTranslation) => {
        const nextStatus = translation.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
        setStatusBusy(translation.translatorId);
        setError("");
        try {
            const updated = await changeTranslationStatus(
                surahNumber,
                ayah!.ayahNumber,
                translation.languageCode,
                nextStatus,
                translation.translatorId,
            );
            setAyah((current) => current ? {
                ...current,
                translations: current.translations.map((record) => record.translatorId === updated.translatorId
                    && record.languageCode === updated.languageCode ? updated : record),
            } : current);
            notify.success(`${selectedLanguageInfo.label} translation is now ${updated.status.toLowerCase()}.`);
        } catch (statusError) {
            const message = getUserFacingError(statusError, "Translation status could not be updated.");
            notify.error(message);
        } finally {
            setStatusBusy(null);
        }
    };

    if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
        return <section className="admin-quran-state"><h2>Surah not found</h2><button type="button" onClick={onBack}>Return to Surahs</button></section>;
    }
    if (!isNew && (!Number.isInteger(routeAyahNumber) || routeAyahNumber === null || routeAyahNumber < 1)) {
        return <section className="admin-quran-state"><h2>Ayah not found</h2><button type="button" onClick={onBack}>Return to Surah</button></section>;
    }
    if (loading) return <section className="admin-quran-state" role="status" aria-busy="true">Loading Ayah details…</section>;
    if (error && !surah) return <section className="admin-quran-state" role="alert"><p>{error}</p><button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Retry</button><button type="button" onClick={onBack}>Return to Surah</button></section>;
    if (!surah) return <section className="admin-quran-state"><h2>Surah unavailable</h2><button type="button" onClick={onBack}>Return to Surah</button></section>;
    if (!isNew && !ayah) return <section className="admin-quran-state"><h2>Ayah unavailable</h2><p>{error || `Ayah ${surahNumber}:${routeAyahNumber} was not returned by the admin API.`}</p><button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Retry</button><button type="button" onClick={onBack}>Return to Surah</button></section>;

    return (
        <section className="admin-quran-management admin-quran-surah-management admin-quran-ayah-detail">
            <div className="admin-quran-back-row">
                <button type="button" aria-label="Back to Surah" title="Back to Surah" onClick={onBack}>
                    <Icon name="arrow" size={18} />
                </button>
            </div>
            <header className="admin-quran-detail-heading">
                <div>
                    <small>{mode === "view" ? "AYAH DETAIL" : isNew ? "NEW AYAH" : "EDIT AYAH"}</small>
                    <h2>{surah.transliterated} · Ayah {ayahNumber || routeAyahNumber}</h2>
                    <p>{surah.englishMeaning} · {surah.ayahCount} canonical Ayahs</p>
                </div>
                {ayah && <span className={`status ${ayahStatus.toLowerCase()}`}>{ayahStatus.toLowerCase()}</span>}
            </header>

            {error && <p className="admin-form-error" role="alert">{error}</p>}

            <section className="admin-quran-ayah-editor form-card" aria-labelledby="admin-ayah-editor-title">
                <div className="admin-quran-editor-heading">
                    <div><small>AYAH CONTENT</small><h3 id="admin-ayah-editor-title">{isNew ? "Add Ayah" : `Ayah ${surahNumber}:${ayah?.ayahNumber}`}</h3></div>
                </div>
                <form className="admin-quran-editor-form" onSubmit={(event) => void saveAyah(event)}>
                    <label className="field"><span>Surah number</span><input type="number" value={surahNumber} readOnly /></label>
                    <label className="field"><span>Ayah number *</span><input type="number" min="1" max={surah.ayahCount} required value={ayahNumber} readOnly={!isNew || mode === "view"} onChange={(event) => setAyahNumber(event.target.value)} /></label>
                    {ayah && <label className="field"><span>Ayah publication status</span><select value={ayahStatus} disabled={mode === "view"} onChange={(event) => setAyahStatus(event.target.value === "PUBLISHED" ? "PUBLISHED" : "DRAFT")}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label>}
                    <label className="field admin-quran-arabic-field"><span>Arabic text *</span><textarea required lang="ar" dir="rtl" rows={5} value={arabicText} readOnly={mode === "view"} onChange={(event) => setArabicText(event.target.value)} /></label>
                    {mode === "edit" && <div className="admin-form-actions">
                        <button className="btn btn-primary" type="submit" disabled={savingAyah}>{savingAyah ? "Saving…" : isNew ? "Create Ayah" : "Save Ayah"}</button>
                    </div>}
                </form>
            </section>

            {ayah && <section className="admin-quran-translation-section form-card" aria-labelledby="admin-translations-title">
                <div className="admin-quran-list-heading">
                    <div><small>RELATED CONTENT</small><h3 id="admin-translations-title">Translations</h3></div>
                    {mode === "edit" && <button className="btn btn-primary" type="button" onClick={openAddTranslation}>Add {selectedLanguageInfo.label} translation</button>}
                </div>
                <label className="field admin-quran-language-selector"><span>Language</span><select value={selectedLanguage} onChange={(event) => {
                    setSelectedLanguage(event.target.value as LanguageCode);
                    setTranslationFormOpen(false);
                    setEditingTranslation(null);
                    setTranslators([]);
                }}>
                    {languages.map((language) => <option key={language.code} value={language.code}>{language.label} ({language.code})</option>)}
                </select></label>

                {translatorsError && mode === "edit" && <div className="admin-quran-notice admin-form-error" role="alert"><span>{translatorsError}</span><button type="button" onClick={() => void retryTranslators()}>Retry translators</button></div>}
                {translatorsLoading && mode === "edit" && <p className="admin-quran-state" role="status" aria-busy="true">Loading {selectedLanguageInfo.label} translators…</p>}
                {!translatorsLoading && mode === "edit" && selectedTranslators.length === 0 && <p className="admin-quran-state">No {selectedLanguageInfo.label} translators are registered. <button className="admin-quran-inline-link" type="button" onClick={() => setTranslatorManagerOpen(true)}>Open Translator Management</button></p>}

                {translationFormOpen && mode === "edit" && <form className="admin-quran-translation-form" onSubmit={(event) => void saveTranslation(event)}>
                    <h4>{editingTranslation ? "Edit translation" : `Add ${selectedLanguageInfo.label} translation`}</h4>
                    <label className="field"><span>Language</span><input value={`${selectedLanguageInfo.label} (${selectedLanguage})`} readOnly /></label>
                    <label className="field"><span>Translator *</span><select required value={translationTranslatorId} onChange={(event) => setTranslationTranslatorId(event.target.value)} disabled={translatorsLoading}>
                        <option value="">Select a {selectedLanguageInfo.label} translator</option>
                        {selectedTranslators.map((translator) => <option
                            key={translator.id}
                            value={translator.id}
                            disabled={selectedTranslations.some((record) => record.translatorId === translator.id && record.translatorId !== editingTranslation?.translatorId)}
                        >{translator.name}</option>)}
                    </select></label>
                    {selectedTranslatorAlreadyUsed && <p className="admin-form-error" role="alert">This translator already has a {selectedLanguageInfo.label} translation for this Ayah. Edit that row instead.</p>}
                    <label className="field"><span>Translation text *</span><textarea required rows={4} lang={selectedLanguage} dir={selectedLanguageInfo.dir} value={translationText} onChange={(event) => setTranslationText(event.target.value)} /></label>
                    <label className="field"><span>Status</span><select value={translationStatus} onChange={(event) => setTranslationStatus(event.target.value as "DRAFT" | "PUBLISHED")}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label>
                    <div className="admin-form-actions">
                        <button className="btn btn-primary" type="submit" disabled={savingTranslation || translatorsLoading || selectedTranslatorAlreadyUsed}>{savingTranslation ? "Saving…" : "Save translation"}</button>
                        <button type="button" disabled={savingTranslation} onClick={() => setTranslationFormOpen(false)}>Cancel</button>
                    </div>
                </form>}

                {selectedTranslations.length === 0
                    ? <p className="admin-quran-state">No saved {selectedLanguageInfo.label} translations for this Ayah.</p>
                    : <div className="admin-quran-table-wrap">
                        <table className="admin-quran-table admin-quran-translation-table">
                            <thead><tr><th scope="col">Translator</th><th scope="col">Translation text</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
                            <tbody>{selectedTranslations.map((translation) => <tr key={`${translation.languageCode}:${translation.translatorId}`}>
                                <td data-label="Translator">{translation.translatorName || `Translator #${translation.translatorId}`}</td>
                                <td data-label="Translation text" lang={translation.languageCode} dir={selectedLanguageInfo.dir} className="admin-quran-translation-text">{translation.text}</td>
                                <td data-label="Status"><span className={`status ${translation.status.toLowerCase()}`}>{translation.status.toLowerCase()}</span></td>
                                <td data-label="Actions" className="admin-quran-actions">{mode === "edit" && <>
                                    <button type="button" onClick={() => openEditTranslation(translation)} disabled={savingTranslation || statusBusy !== null}>Edit</button>
                                    <button type="button" onClick={() => void toggleTranslationStatus(translation)} disabled={statusBusy === translation.translatorId || savingTranslation}>{statusBusy === translation.translatorId ? "Updating…" : translation.status === "PUBLISHED" ? "Unpublish" : "Publish"}</button>
                                </>}</td>
                            </tr>)}</tbody>
                        </table>
                    </div>}
            </section>}

            {translatorManagerOpen && <QuranTranslatorManagement
                presentation="dialog"
                initialLanguage={selectedLanguage}
                onClose={() => setTranslatorManagerOpen(false)}
                onCreated={(created) => {
                    if (created.languageCode === selectedLanguage) setTranslators((current) => [...current.filter((item) => item.id !== created.id), created]);
                    setTranslatorManagerOpen(false);
                }}
            />}
        </section>
    );
}
