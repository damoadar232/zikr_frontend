import { useEffect, useState, type FormEvent } from "react";
import { createQuranTranslator, listQuranTranslators } from "../services/quranAdminTranslators.js";
import type { AdminTranslator } from "../services/quranAdminManagement.js";
import { getUserFacingError, notify } from "../../../app/notifications/toastStore.js";

const languageOptions = [
    { code: "en", label: "English" },
    { code: "hi", label: "Hindi" },
    { code: "ur", label: "Urdu" },
] as const;

type LanguageCode = (typeof languageOptions)[number]["code"];

export function QuranTranslatorManagement({
    presentation = "section",
    initialLanguage = "en",
    onCreated,
    onClose,
}: {
    presentation?: "section" | "dialog";
    initialLanguage?: "en" | "hi" | "ur";
    onCreated?: (translator: AdminTranslator) => void;
    onClose?: () => void;
}) {
    const [language, setLanguage] = useState<LanguageCode>(initialLanguage);
    const [translators, setTranslators] = useState<AdminTranslator[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", sourceRef: "", license: "", licenseNotes: "" });
    const closeDialog = () => {
        if (!saving) onClose?.();
    };

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        listQuranTranslators(language).then((rows) => {
            if (active) setTranslators(rows);
        }).catch((loadError: unknown) => {
            if (active) setError(loadError instanceof Error ? loadError.message : "Translators could not be loaded.");
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [language]);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        setError("");
        try {
            const created = await createQuranTranslator({
                ...form,
                languageCode: language,
            });
            setForm({ name: "", sourceRef: "", license: "", licenseNotes: "" });
            setShowForm(false);
            notify.success(`${created.name} was added as a translator.`);
            try {
                setTranslators(await listQuranTranslators(language, { force: true }));
            } catch (refreshError) {
                setTranslators((current) => [...current.filter((item) => item.id !== created.id), created]);
                notify.warning(`${created.name} was added, but the list could not be refreshed.`);
            }
            onCreated?.(created);
        } catch (createError) {
            const message = getUserFacingError(createError, "The translator could not be added.");
            notify.error(message);
        } finally {
            setSaving(false);
        }
    };

    const section = (
        <section className={`admin-quran-translators${presentation === "dialog" ? " admin-quran-translators-dialog-content" : ""}`} aria-labelledby="admin-translators-title">
            <div className="admin-quran-section-heading">
                <div>
                    <h3 id="admin-translators-title">Translator Management</h3>
                    <p>Register translation attribution using verified source and license information.</p>
                </div>
                <button type="button" className="btn btn-primary" disabled={saving} onClick={() => { setShowForm((open) => !open); setError(""); }}>
                    {showForm ? "Cancel" : "Add Translator"}
                </button>
            </div>

            {error && <div className="admin-quran-notice admin-form-error" role="alert">
                <span>{error}</span>
                {!showForm && <button type="button" onClick={() => {
                    setLoading(true);
                    setError("");
                    listQuranTranslators(language, { force: true }).then(setTranslators).catch((loadError: unknown) => {
                        setError(loadError instanceof Error ? loadError.message : "Translators could not be loaded.");
                    }).finally(() => setLoading(false));
                }}>Retry</button>}
            </div>}

            {showForm && <form className="admin-quran-translator-form" onSubmit={(event) => void submit(event)}>
                <label className="field"><span>Translator name *</span><input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
                <label className="field"><span>Language *</span><select required disabled={saving} value={language} onChange={(event) => setLanguage(event.target.value as LanguageCode)}>{languageOptions.map((item) => <option key={item.code} value={item.code}>{item.label} ({item.code})</option>)}</select></label>
                <label className="field"><span>Verified source reference *</span><input required value={form.sourceRef} onChange={(event) => setForm((current) => ({ ...current, sourceRef: event.target.value }))} /></label>
                <label className="field"><span>License *</span><input required value={form.license} onChange={(event) => setForm((current) => ({ ...current, license: event.target.value }))} /></label>
                <label className="field"><span>License notes (optional)</span><textarea rows={2} value={form.licenseNotes} onChange={(event) => setForm((current) => ({ ...current, licenseNotes: event.target.value }))} /></label>
                <div className="admin-form-actions">
                    <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save Translator"}</button>
                    <button type="button" disabled={saving} onClick={() => setShowForm(false)}>Cancel</button>
                </div>
            </form>}

            <div className="admin-quran-translator-filter">
                <label className="field"><span>Filter by language</span><select disabled={saving} value={language} onChange={(event) => setLanguage(event.target.value as LanguageCode)}>{languageOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
            </div>

            {loading ? <p className="admin-quran-state" role="status" aria-busy="true">Loading translators…</p>
                : error ? null
                    : translators.length === 0 ? <p className="admin-quran-state">No {languageOptions.find((item) => item.code === language)?.label} translators have been registered.</p>
                        : <div className="admin-quran-table-wrap">
                            <table className="admin-quran-table admin-quran-translator-table">
                                <thead><tr><th scope="col">Name</th><th scope="col">Language</th><th scope="col">Source reference</th><th scope="col">License</th></tr></thead>
                                <tbody>{translators.map((translator) => <tr key={translator.id}>
                                    <td data-label="Name">{translator.name}</td>
                                    <td data-label="Language">{translator.languageCode.toUpperCase()}</td>
                                    <td data-label="Source reference">{translator.sourceRef}</td>
                                    <td data-label="License">{translator.license}</td>
                                </tr>)}</tbody>
                            </table>
                        </div>}
        </section>
    );

    if (presentation === "section") return section;

    return <div className="admin-quran-translator-overlay" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog();
    }}>
        <div className="admin-quran-translator-dialog" role="dialog" aria-modal="true" aria-label="Translator Management">
            <button type="button" className="admin-quran-translator-dialog-close" aria-label="Close Translator Management" disabled={saving} onClick={closeDialog}>×</button>
            {section}
        </div>
    </div>;
}
