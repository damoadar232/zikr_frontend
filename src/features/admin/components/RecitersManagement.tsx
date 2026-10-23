import { useMemo, useState, type FormEvent } from "react";
import { useContentCollection } from "../../../app/hooks/useContentCollection";
import { Icon } from "../../../components/ui";
import { lyrics as initialLyrics } from "../../../lyricsData";
import { reciterProfiles, reciterRoles, type ReciterProfile, type ReciterRole } from "../../lyrics/data/reciterProfiles";
import { getLyricReciterIds } from "../../lyrics/utils/lyricsPresentation";
import { contentRepository } from "../services/contentRepository.js";

type Mode = "list" | "form";
type Draft = Omit<ReciterProfile, "id">;

const emptyDraft: Draft = {
    name: "",
    roles: [],
    biography: "",
    languages: [],
    location: "",
    profileImage: "",
    socialLinks: [],
    status: "active",
};

function slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function validWebUrl(value: string) {
    try {
        return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
        return false;
    }
}

export function RecitersManagement({ onBack, onLogout, onNavigate }: { onBack: () => void; onLogout?: () => void; onNavigate?: (section: "lyrics" | "quran" | "portfolio") => void }) {
    const profiles = useContentCollection<ReciterProfile>("reciters", reciterProfiles);
    const lyrics = useContentCollection("lyrics", initialLyrics);
    const [mode, setMode] = useState<Mode>("list");
    const [selected, setSelected] = useState<ReciterProfile | null>(null);
    const [editingId, setEditingId] = useState("");
    const [draft, setDraft] = useState<Draft>(emptyDraft);
    const [query, setQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(0);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const pageSize = 10;
    const filtered = useMemo(() => profiles.filter((profile) =>
        profile.name.toLowerCase().includes(query.trim().toLowerCase())
        && (roleFilter === "all" || profile.roles.includes(roleFilter as ReciterRole))
        && (statusFilter === "all" || profile.status === statusFilter),
    ), [profiles, query, roleFilter, statusFilter]);
    const visibleProfiles = filtered.slice(page * pageSize, (page + 1) * pageSize);

    const lyricsCount = (profileId: string) => lyrics.filter((lyric) => getLyricReciterIds(lyric).includes(profileId)).length;
    const setDraftField = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

    const startCreate = () => {
        setEditingId("");
        setDraft(emptyDraft);
        setSelected(null);
        setError("");
        setMessage("");
        setMode("form");
    };

    const startEdit = (profile: ReciterProfile) => {
        const { id: _id, ...editable } = profile;
        setEditingId(profile.id);
        setDraft({ ...emptyDraft, ...editable });
        setSelected(profile);
        setError("");
        setMessage("");
        setMode("form");
    };

    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setMessage("");
        const name = draft.name.trim();
        const biography = draft.biography.trim();
        const profileImage = draft.profileImage?.trim() || "";
        const socialLinks = (draft.socialLinks || []).map((item) => item.trim()).filter(Boolean);
        if (!name) {
            setError("Enter a display name.");
            return;
        }
        if (!draft.roles.length) {
            setError("Select at least one role.");
            return;
        }
        if (profileImage && !validWebUrl(profileImage)) {
            setError("Profile image must use a valid HTTPS or HTTP URL.");
            return;
        }
        if (socialLinks.some((link) => !validWebUrl(link))) {
            setError("Each social link must be a valid HTTPS or HTTP URL.");
            return;
        }
        if (editingId && draft.status === "inactive" && profiles.find((profile) => profile.id === editingId)?.status === "active"
            && !window.confirm(`Deactivate ${name}? Their profile and lyric associations will remain intact.`)) return;

        const record: ReciterProfile = {
            ...draft,
            id: editingId || slugify(name) || `reciter-${Date.now()}`,
            name,
            biography,
            languages: [...new Set(draft.languages.map((item) => item.trim()).filter(Boolean))],
            profileImage,
            socialLinks,
        };
        try {
            if (editingId) contentRepository.update("reciters", editingId, record, reciterProfiles);
            else contentRepository.create("reciters", record, reciterProfiles);
            setSelected(record);
            setMessage("Reciter profile saved in browser demo storage.");
            setMode("list");
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "The reciter profile could not be saved.");
        }
    };

    const deactivate = (profile: ReciterProfile) => {
        if (!window.confirm(`Deactivate ${profile.name}? Their profile and lyric associations will remain intact.`)) return;
        try {
            contentRepository.update("reciters", profile.id, { status: "inactive" }, reciterProfiles);
            setSelected({ ...profile, status: "inactive" });
            setMessage(`${profile.name} was deactivated. Existing lyric associations were preserved.`);
            setError("");
        } catch (updateError) {
            setError(updateError instanceof Error ? updateError.message : "The reciter could not be deactivated.");
        }
    };

    const updateFilter = (setter: (value: string) => void, value: string) => {
        setter(value);
        setPage(0);
    };

    return <main className="admin admin-content-management reciters-admin">
        <aside>
            <button type="button" className="reciters-back" onClick={onBack}>‹ Back to content admin</button>
            <small>CONTENT ADMIN · BROWSER DEMO</small>
            <nav className="reciters-admin-nav" aria-label="Admin sections">
                <button type="button" onClick={onBack}><Icon name="grid" size={17} />Dashboard</button>
                <button type="button" onClick={() => onNavigate?.("lyrics")}><Icon name="pen" size={17} />Lyrics Management</button>
                <button type="button" onClick={() => onNavigate?.("quran")}><Icon name="book" size={17} />Quran Management</button>
                <button type="button" className="active" aria-current="page"><Icon name="user" size={17} />Reciters</button>
                <button type="button" onClick={() => onNavigate?.("portfolio")}><Icon name="grid" size={17} />Portfolio Management</button>
            </nav>
            <h1>Reciters</h1>
            <p>Manage profiles used by lyric records. Deactivation never deletes profile associations.</p>
            <button type="button" className="admin-signout" onClick={() => onLogout?.()}><Icon name="x" size={17} />Sign out</button>
        </aside>
        <div className="admin-main">
            <header>
                <div><small>PROFILE MANAGEMENT</small><h2>{mode === "form" ? editingId ? "Edit reciter" : "New reciter" : "Reciters"}</h2></div>
                {mode === "list" && <button type="button" className="btn btn-primary" onClick={startCreate}>Add reciter</button>}
                {mode === "form" && <button type="button" className="btn btn-outline" onClick={() => setMode("list")}>Back to list</button>}
            </header>
            <div className="admin-demo-warning" role="note">Profiles are saved to browser demo storage only. They are not connected to a production API.</div>
            {message && <p className="admin-success" role="status">{message}</p>}
            {error && <p className="admin-form-error" role="alert">{error}</p>}

            {mode === "list" && <>
                <div className="reciters-filters">
                    <label className="field"><span>Search by name</span><input value={query} onChange={(event) => updateFilter(setQuery, event.target.value)} /></label>
                    <label className="field"><span>Filter by role</span><select value={roleFilter} onChange={(event) => updateFilter(setRoleFilter, event.target.value)}><option value="all">All roles</option>{reciterRoles.map((role) => <option key={role}>{role}</option>)}</select></label>
                    <label className="field"><span>Filter by status</span><select value={statusFilter} onChange={(event) => updateFilter(setStatusFilter, event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
                </div>
                {visibleProfiles.length ? <div className="reciter-admin-list">{visibleProfiles.map((profile) => <article key={profile.id}>
                    {profile.profileImage ? <img src={profile.profileImage} alt="" /> : <span className="reciter-avatar" aria-hidden="true">{profile.name.slice(0, 1)}</span>}
                    <div className="reciter-admin-summary"><b>{profile.name}</b><span>{profile.roles.join(" · ")}</span><small>{profile.languages.join(", ") || "No languages"} · {lyricsCount(profile.id)} associated {lyricsCount(profile.id) === 1 ? "lyric" : "lyrics"}</small></div>
                    <span className={`status ${profile.status}`}>{profile.status}</span>
                    <div className="admin-record-actions"><button type="button" onClick={() => setSelected(profile)}>View</button><button type="button" onClick={() => startEdit(profile)}>Edit</button>{profile.status === "active" && <button type="button" className="danger-action" onClick={() => deactivate(profile)}>Deactivate</button>}</div>
                </article>)}</div> : <div className="admin-empty"><Icon name="search" size={24} /><b>{profiles.length ? "No matching reciters" : "No reciters yet"}</b><span>{profiles.length ? "Adjust your search or filters." : "Add a profile to associate it with lyrics."}</span></div>}
                {filtered.length > pageSize && <nav className="reciter-pagination" aria-label="Reciter pages"><button type="button" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page + 1} of {Math.ceil(filtered.length / pageSize)}</span><button type="button" disabled={(page + 1) * pageSize >= filtered.length} onClick={() => setPage((current) => current + 1)}>Next</button></nav>}
                {selected && <article className="reciter-admin-preview">
                    {selected.profileImage && <img src={selected.profileImage} alt="" />}
                    <div><small>PROFILE PREVIEW</small><h3>{selected.name}</h3><p>{selected.roles.join(" · ")}</p><p>{selected.biography || "No biography supplied."}</p><p>{selected.languages.join(", ") || "Languages not supplied"}{selected.location ? ` · ${selected.location}` : ""}</p><span>{lyricsCount(selected.id)} associated {lyricsCount(selected.id) === 1 ? "lyric" : "lyrics"}</span></div>
                    <button type="button" aria-label="Close profile preview" onClick={() => setSelected(null)}>×</button>
                </article>}
            </>}

            {mode === "form" && <form className="reciter-admin-form" onSubmit={save}>
                <div className="form-card">
                    <label className="field"><span>Display name *</span><input required value={draft.name} onChange={(event) => setDraftField("name", event.target.value)} /></label>
                    <label className="field"><span>Profile image URL</span><input type="url" value={draft.profileImage || ""} onChange={(event) => setDraftField("profileImage", event.target.value)} placeholder="https://…" /></label>
                    <fieldset className="admin-choice-group"><legend>Roles *</legend>{reciterRoles.map((role) => <label key={role}><input type="checkbox" checked={draft.roles.includes(role)} onChange={(event) => setDraftField("roles", event.target.checked ? [...draft.roles, role] : draft.roles.filter((item) => item !== role))} />{role}</label>)}</fieldset>
                    <label className="field"><span>Short biography</span><textarea rows={4} value={draft.biography} onChange={(event) => setDraftField("biography", event.target.value)} /></label>
                    <label className="field"><span>Languages (comma separated)</span><input value={draft.languages.join(", ")} onChange={(event) => setDraftField("languages", event.target.value.split(","))} /></label>
                    <label className="field"><span>Location (optional)</span><input value={draft.location || ""} onChange={(event) => setDraftField("location", event.target.value)} /></label>
                    <label className="field"><span>Social-media links (one per line)</span><textarea rows={3} value={(draft.socialLinks || []).join("\n")} onChange={(event) => setDraftField("socialLinks", event.target.value.split(/\r?\n/))} /></label>
                    <label className="field"><span>Status</span><select value={draft.status} onChange={(event) => setDraftField("status", event.target.value as Draft["status"])}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
                    <div className="admin-form-actions"><button type="button" className="btn btn-outline" onClick={() => setMode("list")}>Cancel</button><button type="submit" className="btn btn-primary">Save profile</button></div>
                </div>
                <aside className="reciter-form-preview" aria-label="Profile preview">
                    <small>LIVE PROFILE PREVIEW</small>
                    {draft.profileImage && validWebUrl(draft.profileImage) ? <img src={draft.profileImage} alt="" /> : <span className="reciter-avatar" aria-hidden="true">{draft.name.trim().slice(0, 1) || "?"}</span>}
                    <h3>{draft.name || "Reciter name"}</h3><p>{draft.roles.join(" · ") || "Roles"}</p><p>{draft.biography || "A short biography will appear here."}</p><small>{draft.languages.join(", ") || "Languages"}{draft.location ? ` · ${draft.location}` : ""}</small>
                </aside>
            </form>}
        </div>
    </main>;
}
