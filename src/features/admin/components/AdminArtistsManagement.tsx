import { useEffect, useMemo, useState, type FormEvent } from "react";
import { artistsApi } from "../../artists/services/artistsApiService.js";
import type { ApiArtist, ApiArtistPage, ApiArtistRoleDto, ApiArtistStatus, CreateArtistRequest, UpdateArtistRequest } from "../../artists/services/artistsApiService.js";
import { Icon } from "../../../components/ui";
import { getUserFacingError, notify } from "../../../app/notifications/toastStore.js";

const pageSize = 20;
type ArtistFormFields = "fullName" | "roles";
type ArtistRowAction = "status" | "delete";
type ArtistFormValues = {
    fullName: string;
    displayName: string;
    roles: ApiArtist["roles"];
    biography: string;
    status: ApiArtistStatus;
};

const emptyForm: ArtistFormValues = {
    fullName: "",
    displayName: "",
    roles: [],
    biography: "",
    status: "ACTIVE",
};

function formatUpdatedAt(value: string | null | undefined) {
    if (!value) return "—";
    const timestamp = new Date(value);
    return Number.isNaN(timestamp.getTime()) ? "—" : timestamp.toLocaleDateString();
}

export function AdminArtistsManagement() {
    const [result, setResult] = useState<ApiArtistPage | null>(null);
    const [page, setPage] = useState(0);
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [roles, setRoles] = useState<ApiArtistRoleDto[]>([]);
    const [rolesLoading, setRolesLoading] = useState(true);
    const [rolesError, setRolesError] = useState("");
    const [rolesRequestId, setRolesRequestId] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [listRequestId, setListRequestId] = useState(0);
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<ArtistFormValues>(emptyForm);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<ArtistFormFields, string>>>({});
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ id: number; type: ArtistRowAction } | null>(null);
    const roleLabels = useMemo(() => new Map(roles.map(({ code, label }) => [code, label])), [roles]);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        let current = true;
        setRolesLoading(true);
        setRolesError("");
        void artistsApi.getArtistRoles()
            .then((response) => {
                if (!Array.isArray(response)) throw new Error("Artist roles API returned an invalid response.");
                if (current) setRoles(response);
            })
            .catch((loadError: unknown) => {
                if (current) setRolesError(loadError instanceof Error ? loadError.message : "Artist roles could not be loaded.");
            })
            .finally(() => {
                if (current) setRolesLoading(false);
            });
        return () => { current = false; };
    }, [rolesRequestId]);

    useEffect(() => {
        let current = true;
        setResult(null);
        setLoading(true);
        setError("");
        void artistsApi.getArtists({
            page,
            size: pageSize,
            query: debouncedQuery || undefined,
            status: (statusFilter || undefined) as ApiArtistStatus | undefined,
            role: roleFilter || undefined,
        })
            .then((response) => {
                if (!response || !Array.isArray(response.items)
                    || typeof response.page !== "number"
                    || typeof response.totalPages !== "number"
                    || typeof response.totalElements !== "number") {
                    throw new Error("Artists API returned an invalid paginated response.");
                }
                if (current) setResult(response);
            })
            .catch((loadError: unknown) => {
                if (current) setError(loadError instanceof Error ? loadError.message : "Artists could not be loaded.");
            })
            .finally(() => {
                if (current) setLoading(false);
            });
        return () => { current = false; };
    }, [page, debouncedQuery, statusFilter, roleFilter, listRequestId]);

    const hasFilters = Boolean(query.trim() || roleFilter || statusFilter);
    const changeFilter = (update: () => void) => {
        setResult(null);
        setLoading(true);
        setPage(0);
        update();
    };
    const clearFilters = () => {
        setQuery("");
        setDebouncedQuery("");
        setRoleFilter("");
        setStatusFilter("");
        setPage(0);
        setResult(null);
        setLoading(true);
        setError("");
    };
    const closeForm = () => {
        if (saving) return;
        setFormOpen(false);
        setEditingId(null);
        setForm(emptyForm);
        setFieldErrors({});
        setFormError("");
    };
    const startCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setFieldErrors({});
        setFormError("");
        setFormOpen(true);
    };
    const startEdit = async (artist: ApiArtist) => {
        setError("");
        setFormError("");
        setFieldErrors({});
        setEditingId(artist.id);
        setFormOpen(true);
        setFormLoading(true);
        try {
            const details = await artistsApi.getArtistById(artist.id);
            setForm({
                fullName: details.fullName,
                displayName: details.displayName || "",
                roles: [...details.roles],
                biography: details.biography || "",
                status: details.status,
            });
        } catch (loadError) {
            setFormError(loadError instanceof Error ? loadError.message : "Artist details could not be loaded.");
        } finally {
            setFormLoading(false);
        }
    };
    const saveArtist = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const nextFieldErrors: Partial<Record<ArtistFormFields, string>> = {};
        const fullName = form.fullName.trim();
        if (!fullName) nextFieldErrors.fullName = "Enter the artist's full name.";
        if (!form.roles.length) nextFieldErrors.roles = "Select at least one role.";
        setFieldErrors(nextFieldErrors);
        setFormError("");
        if (Object.keys(nextFieldErrors).length) return;

        const payload: CreateArtistRequest & UpdateArtistRequest = {
            fullName,
            displayName: form.displayName.trim() || undefined,
            roles: form.roles,
            biography: form.biography.trim() || undefined,
            status: form.status,
        };
        setSaving(true);
        try {
            if (editingId) await artistsApi.updateArtist(editingId, payload);
            else await artistsApi.createArtist(payload);
            notify.success(editingId ? "Artist updated successfully." : "Artist created successfully.");
            setFormOpen(false);
            setEditingId(null);
            setForm(emptyForm);
            setFieldErrors({});
            setPage(0);
            setResult(null);
            setLoading(true);
            setError("");
            setListRequestId((current) => current + 1);
        } catch (saveError) {
            const message = getUserFacingError(saveError, "Artist could not be saved.");
            notify.error(message);
        } finally {
            setSaving(false);
        }
    };
    const toggleRole = (role: ApiArtistRoleDto["code"], checked: boolean) => {
        setForm((current) => ({
            ...current,
            roles: checked
                ? [...new Set([...current.roles, role])]
                : current.roles.filter((currentRole) => currentRole !== role),
        }));
        setFieldErrors((current) => ({ ...current, roles: undefined }));
    };
    const refreshArtists = () => {
        setResult(null);
        setLoading(true);
        setError("");
        setListRequestId((current) => current + 1);
    };
    const changeArtistStatus = async (artist: ApiArtist) => {
        const nextStatus: ApiArtistStatus = artist.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        const actionLabel = nextStatus === "ACTIVE" ? "activate" : "deactivate";
        if (!window.confirm(`${actionLabel[0].toUpperCase()}${actionLabel.slice(1)} ${artist.fullName}?`)) return;

        setPendingAction({ id: artist.id, type: "status" });
        try {
            await artistsApi.updateArtistStatus(artist.id, nextStatus);
            notify.success(`${artist.fullName} was ${nextStatus === "ACTIVE" ? "activated" : "deactivated"}.`);
            refreshArtists();
        } catch (statusError) {
            const message = getUserFacingError(statusError, `Artist could not be ${actionLabel}d.`);
            notify.error(message);
        } finally {
            setPendingAction(null);
        }
    };
    const deleteArtist = async (artist: ApiArtist) => {
        if (!window.confirm(`Delete ${artist.fullName}? This cannot be undone. If the artist is referenced by lyrics, deletion will be blocked; deactivation is recommended instead.`)) return;

        setPendingAction({ id: artist.id, type: "delete" });
        try {
            await artistsApi.deleteArtist(artist.id);
            notify.success(`${artist.fullName} was deleted.`);
            setPage(0);
            refreshArtists();
        } catch (deleteError) {
            const message = getUserFacingError(deleteError, "Artist could not be deleted. If it is referenced by lyrics, deactivate it instead.");
            notify.error(message);
        } finally {
            setPendingAction(null);
        }
    };

    return (
        <section className="admin-artists-management">
            <div className="admin-artists-heading">
                <p>Manage artists and their contributor roles across the site.</p>
                {!formOpen && <button type="button" className="btn btn-primary" onClick={startCreate} disabled={rolesLoading || !!rolesError}>
                    <Icon name="pen" size={16} />Add Artist
                </button>}
            </div>

            {rolesError && (
                <div className="admin-form-error" role="alert">
                    <span>Artist roles could not be loaded: {rolesError}</span>
                    <button type="button" onClick={() => setRolesRequestId((current) => current + 1)}>Retry roles</button>
                </div>
            )}

            {formOpen && (
                <form className="form-card admin-artist-form" onSubmit={(event) => void saveArtist(event)} noValidate>
                    <div className="admin-artist-form-heading">
                        <h2>{editingId ? "Edit Artist" : "Add Artist"}</h2>
                        <button type="button" className="btn btn-outline" onClick={closeForm} disabled={saving}>Close</button>
                    </div>
                    {formLoading ? <p className="admin-artists-state" role="status">Loading artist details…</p> : (
                        <>
                            <label className="field">
                                <span>Full Name *</span>
                                <input
                                    required
                                    maxLength={200}
                                    value={form.fullName}
                                    aria-invalid={!!fieldErrors.fullName}
                                    aria-describedby={fieldErrors.fullName ? "artist-full-name-error" : undefined}
                                    onChange={(event) => {
                                        setForm((current) => ({ ...current, fullName: event.target.value }));
                                        setFieldErrors((current) => ({ ...current, fullName: undefined }));
                                    }}
                                />
                                {fieldErrors.fullName && <small id="artist-full-name-error" className="admin-field-error">{fieldErrors.fullName}</small>}
                            </label>
                            <label className="field">
                                <span>Display Name (optional)</span>
                                <input maxLength={200} value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} />
                            </label>
                            <fieldset className="admin-choice-group" aria-describedby={fieldErrors.roles ? "artist-roles-error" : undefined}>
                                <legend>Roles *</legend>
                                {rolesLoading ? <p role="status">Loading available roles…</p> : roles.map((role) => (
                                    <label key={role.code}>
                                        <input type="checkbox" checked={form.roles.includes(role.code)} onChange={(event) => toggleRole(role.code, event.target.checked)} />
                                        {role.label}
                                    </label>
                                ))}
                                {fieldErrors.roles && <small id="artist-roles-error" className="admin-field-error">{fieldErrors.roles}</small>}
                            </fieldset>
                            <label className="field">
                                <span>Biography (optional)</span>
                                <textarea rows={4} value={form.biography} onChange={(event) => setForm((current) => ({ ...current, biography: event.target.value }))} />
                            </label>
                            <label className="field">
                                <span>Status</span>
                                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ApiArtistStatus }))}>
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                </select>
                            </label>
                            {formError && <p className="admin-form-error" role="alert">{formError}</p>}
                            <div className="admin-form-actions">
                                <button type="button" className="btn btn-outline" onClick={closeForm} disabled={saving}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving || rolesLoading || roles.length === 0}>
                                    {saving ? "Saving…" : editingId ? "Save Changes" : "Create Artist"}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            )}

            {!formOpen && <div className="admin-artists-filters">
                <label className="search-box admin-search">
                    <Icon name="search" size={17} />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => changeFilter(() => setQuery(event.target.value))}
                        placeholder="Search artists by name"
                        aria-label="Search artists by name"
                    />
                </label>
                <label className="sr-only" htmlFor="artist-role-filter">Filter artists by role</label>
                <select
                    id="artist-role-filter"
                    value={roleFilter}
                    onChange={(event) => changeFilter(() => setRoleFilter(event.target.value))}
                    disabled={rolesLoading || !!rolesError}
                >
                    <option value="">All roles</option>
                    {roles.map((role) => <option key={role.code} value={role.code}>{role.label}</option>)}
                </select>
                <label className="sr-only" htmlFor="artist-status-filter">Filter artists by status</label>
                <select
                    id="artist-status-filter"
                    value={statusFilter}
                    onChange={(event) => changeFilter(() => setStatusFilter(event.target.value))}
                >
                    <option value="">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                </select>
                <button type="button" className="btn btn-outline" onClick={clearFilters} disabled={!hasFilters}>
                    Clear filters
                </button>
            </div>}

            {!formOpen && error && (
                <div className="admin-form-error admin-artists-error" role="alert">
                    <span>{error}</span>
                    <button type="button" onClick={() => setListRequestId((current) => current + 1)}>Retry</button>
                </div>
            )}

            {!formOpen && loading && <p className="admin-artists-state" role="status">Loading artists…</p>}

            {!formOpen && !loading && !error && result && result.items.length > 0 && (
                <>
                    <div className="admin-artists-table-wrap">
                        <table className="admin-artists-table" aria-label="Artists">
                            <thead>
                                <tr>
                                    <th scope="col">Full Name</th>
                                    <th scope="col">Display Name</th>
                                    <th scope="col">Roles</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Updated At</th>
                                    <th scope="col">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.items.map((artist: ApiArtist) => (
                                    <tr key={artist.id}>
                                        <th scope="row" className="admin-artist-full-name">{artist.fullName || "—"}</th>
                                        <td>{artist.displayName?.trim() || "—"}</td>
                                        <td>
                                            <div className="admin-artist-role-list">
                                                {artist.roles?.length ? artist.roles.map((role) => (
                                                    <span className="admin-artist-role" key={role}>{roleLabels.get(role) || role}</span>
                                                )) : "—"}
                                            </div>
                                        </td>
                                        <td>
                                            {artist.status
                                                ? <span className={`admin-artist-status admin-artist-status-${artist.status.toLowerCase()}`}>{artist.status}</span>
                                                : "—"}
                                        </td>
                                        <td>{formatUpdatedAt(artist.updatedAt)}</td>
                                        <td>
                                            <div className="admin-artist-actions" role="group" aria-label={`Actions for ${artist.fullName}`}>
                                                <button type="button" className="admin-artist-edit" aria-label={`Edit ${artist.fullName}`} onClick={() => void startEdit(artist)} disabled={pendingAction !== null}>
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="admin-artist-edit"
                                                    aria-label={`${artist.status === "ACTIVE" ? "Deactivate" : "Activate"} ${artist.fullName}`}
                                                    onClick={() => void changeArtistStatus(artist)}
                                                    disabled={pendingAction !== null}
                                                >
                                                    {pendingAction?.id === artist.id && pendingAction.type === "status"
                                                        ? (artist.status === "ACTIVE" ? "Deactivating…" : "Activating…")
                                                        : artist.status === "ACTIVE" ? "Deactivate" : "Activate"}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="admin-artist-edit"
                                                    aria-label={`Delete ${artist.fullName}`}
                                                    onClick={() => void deleteArtist(artist)}
                                                    disabled={pendingAction !== null}
                                                >
                                                    {pendingAction?.id === artist.id && pendingAction.type === "delete" ? "Deleting…" : "Delete"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {result.totalPages > 1 && (
                        <nav className="admin-pagination" aria-label="Artist pages">
                            <button type="button" disabled={result.page <= 0} onClick={() => { setResult(null); setLoading(true); setPage((current) => current - 1); }}>Previous</button>
                            <span>Page {result.page + 1} of {result.totalPages}</span>
                            <button type="button" disabled={result.page + 1 >= result.totalPages} onClick={() => { setResult(null); setLoading(true); setPage((current) => current + 1); }}>Next</button>
                        </nav>
                    )}
                </>
            )}

            {!formOpen && !loading && !error && result && result.items.length === 0 && (
                <div className="admin-empty">
                    <Icon name="search" size={24} />
                    <b>{hasFilters ? "No matching artists" : "No artists yet"}</b>
                    <span>{hasFilters ? "Adjust or clear the search and filters." : "Artists will appear here when they are added."}</span>
                </div>
            )}
        </section>
    );
}
