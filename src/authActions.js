const actionContentTypes = {
    "download-audio": "audio",
    "download-book": "book",
    "favorite-lyric": "lyric",
    "save-audio": "audio",
    "save-book": "book",
    "bookmark-quran": "quran-ayah",
};

const returnRoutesByAction = {
    "download-audio": ["home", "audio", "audio-detail"],
    "download-book": ["ebooks", "book-detail"],
    "favorite-lyric": ["lyrics", "lyric-detail"],
    "save-audio": ["home", "audio", "audio-detail"],
    "save-book": ["ebooks", "book-detail"],
    "bookmark-quran": ["surah-read"],
};

const pendingActionKey = "zikr-pending-auth-action";
const idPattern = /^[a-z0-9][a-z0-9:-]{0,127}$/i;

export function safeReturnTo(value, actionType) {
    if (typeof value !== "string" || value.length > 640 || !value.startsWith("#") || value.startsWith("##")) return null;
    const destination = value.slice(1);
    if (/[\\\u0000-\u001f#]/.test(destination)) return null;
    const [path, ...queryParts] = destination.split("?");
    if (!returnRoutesByAction[actionType]?.includes(path)) return null;
    const query = queryParts.join("?");
    if (query.length > 512) return null;
    return `#${path}${query ? `?${query}` : ""}`;
}

export function createPendingAction({ action, contentType, contentId, returnTo }) {
    if (actionContentTypes[action] !== contentType || typeof contentId !== "string" || !idPattern.test(contentId)) return null;
    if (action === "bookmark-quran" && !/^\d{1,3}:\d{1,3}$/.test(contentId)) return null;
    const safeDestination = safeReturnTo(returnTo, action);
    if (!safeDestination) return null;
    return { version: 1, action, contentType, contentId, returnTo: safeDestination };
}

export function savePendingAction(intent, storage = globalThis.sessionStorage) {
    const validated = createPendingAction(intent || {});
    if (!validated || !storage) return false;
    try {
        storage.setItem(pendingActionKey, JSON.stringify(validated));
        return true;
    } catch {
        return false;
    }
}

export function readPendingAction(storage = globalThis.sessionStorage) {
    if (!storage) return null;
    try {
        const value = JSON.parse(storage.getItem(pendingActionKey) || "null");
        return createPendingAction(value || {});
    } catch {
        return null;
    }
}

export function clearPendingAction(storage = globalThis.sessionStorage) {
    try {
        storage?.removeItem(pendingActionKey);
    } catch {
        return false;
    }
    return true;
}

export function getPendingActionStorageKey() {
    return pendingActionKey;
}
