import { useEffect, useMemo, useState } from "react";
import { quranAdminApi } from "../services/quranAdminApi.js";
import { QuranTranslatorManagement } from "./QuranTranslatorManagement";

type Surah = {
    number: number;
    arabicName?: string;
    transliterated?: string;
    englishMeaning?: string;
    ayahCount?: number;
    revelation?: string;
    status?: string;
};

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "The Quran request failed.";
}

export function AdminQuranManagement({
    onNavigate,
}: {
    onNavigate: (surahNumber?: number, mode?: "view" | "edit") => void;
}) {
    const [surahs, setSurahs] = useState<Surah[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    const loadSurahs = async () => {
        setLoading(true);
        setError("");
        try {
            const rows = await quranAdminApi.listSurahs() as Surah[];
            setSurahs(rows.slice().sort((a, b) => a.number - b.number));
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;
        quranAdminApi.listSurahs().then((rows) => {
            if (active) setSurahs((rows as Surah[]).slice().sort((a, b) => a.number - b.number));
        }).catch((loadError: unknown) => {
            if (active) setError(getErrorMessage(loadError));
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, []);

    const filteredSurahs = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        if (!query) return surahs;
        return surahs.filter((surah) => [
            String(surah.number),
            surah.arabicName,
            surah.transliterated,
            surah.englishMeaning,
        ].some((value) => value?.toLocaleLowerCase().includes(query)));
    }, [search, surahs]);

    return (
        <section className="admin-quran-management">
            {/* <header className="admin-quran-heading">
                <div>
                    <small>QURAN CONTENT</small>
                    <h2>Browse all Surahs</h2>
                    <p>Browse Surah metadata and manage verified Ayah content and translations.</p>
                </div>
                <div className="admin-quran-total"><strong>114</strong><span>Total Surahs</span></div>
            </header> */}

            <section className="admin-quran-surah-section" aria-labelledby="admin-surah-list-title">
                <div className="admin-quran-section-heading">
                    <div>
                        <h3 id="admin-surah-list-title">Surah directory</h3>
                        <p>{loading ? "Loading Surahs…" : `${surahs.length} Surahs returned by the admin API`}</p>
                    </div>
                    <label className="admin-quran-search">
                        <span className="sr-only">Search Surahs</span>
                        {/* <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search number, name, or meaning"
                            aria-label="Search Surahs by number, Arabic name, transliteration, or English meaning"
                        /> */}
                    </label>
                </div>

                {error && <div className="admin-quran-notice admin-form-error" role="alert">
                    <span>{error}</span>
                    <button type="button" onClick={() => void loadSurahs()}>Retry Surahs</button>
                </div>}
                {!error && loading && <p className="admin-quran-state" role="status" aria-busy="true">Loading Surah records…</p>}
                {!error && !loading && surahs.length !== 114 && surahs.length > 0 && <p className="admin-quran-state" role="status">The admin API returned {surahs.length} of 114 Surahs. Only records returned by the API are shown.</p>}
                {!error && !loading && surahs.length === 0 && <div className="admin-quran-state">
                    <p>No Surahs were returned by the admin API.</p>
                    <button type="button" onClick={() => void loadSurahs()}>Retry</button>
                </div>}
                {!loading && !error && surahs.length > 0 && filteredSurahs.length === 0 && <p className="admin-quran-state">No Surahs match “{search}”.</p>}
                {!loading && !error && filteredSurahs.length > 0 && <div className="admin-quran-table-wrap">
                    <table className="admin-quran-table">
                        <thead><tr>
                            <th scope="col">No.</th>
                            <th scope="col">Arabic name</th>
                            <th scope="col">Transliteration</th>
                            <th scope="col">English meaning</th>
                            <th scope="col">Revelation</th>
                            <th scope="col">Status</th>
                            <th scope="col">Ayahs</th>
                            <th scope="col"><span className="sr-only">Actions</span></th>
                        </tr></thead>
                        <tbody>{filteredSurahs.map((surah) => (
                            <tr key={surah.number}>
                                <td data-label="No.">{surah.number}</td>
                                <td data-label="Arabic name" className="admin-quran-arabic" lang="ar" dir="rtl">{surah.arabicName || "—"}</td>
                                <td data-label="Transliteration">{surah.transliterated || "—"}</td>
                                <td data-label="English meaning">{surah.englishMeaning || "—"}</td>
                                <td data-label="Revelation">{surah.revelation || "—"}</td>
                                <td data-label="Status">{surah.status
                                    ? <span className={`status ${surah.status.toLowerCase()}`}>{surah.status.toLowerCase()}</span>
                                    : "—"}</td>
                                <td data-label="Ayahs">{surah.ayahCount ?? "—"}</td>
                                <td data-label="Actions" className="admin-quran-actions">
                                    <button type="button" aria-label={`View ${surah.transliterated || `Surah ${surah.number}`}`} onClick={() => onNavigate(surah.number, "view")}>View</button>
                                    <button type="button" aria-label={`Edit ${surah.transliterated || `Surah ${surah.number}`}`} onClick={() => onNavigate(surah.number, "edit")}>Edit</button>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>}
            </section>

            <QuranTranslatorManagement />
        </section>
    );
}
