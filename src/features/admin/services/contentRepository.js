export const ADMIN_CONTENT_STORAGE_KEY = "zikr-admin-content-demo-v1";
export const ADMIN_CONTENT_UPDATED_EVENT = "zikr-admin-content-updated";

function getBrowserStorage() {
    try {
        return globalThis.localStorage || null;
    } catch {
        return null;
    }
}

function readDocument(storage) {
    if (!storage) return {};
    try {
        const value = JSON.parse(storage.getItem(ADMIN_CONTENT_STORAGE_KEY) || "{}");
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
        return {};
    }
}

export function createContentRepository({ storage = getBrowserStorage(), eventTarget = globalThis.window } = {}) {
    const persist = (document) => {
        if (!storage) throw new Error("Browser demo storage is unavailable.");
        storage.setItem(ADMIN_CONTENT_STORAGE_KEY, JSON.stringify(document));
        eventTarget?.dispatchEvent(new Event(ADMIN_CONTENT_UPDATED_EVENT));
    };

    return {
        mode: "browser-demo",
        list(collection, fallback = []) {
            const records = readDocument(storage)[collection];
            return Array.isArray(records) ? records : fallback;
        },
        create(collection, record, fallback = []) {
            const records = this.list(collection, fallback);
            if (records.some((item) => item.id === record.id)) throw new Error("A record with this identifier already exists.");
            const nextRecords = [...records, record];
            persist({ ...readDocument(storage), [collection]: nextRecords });
            return nextRecords;
        },
        update(collection, id, changes, fallback = []) {
            const records = this.list(collection, fallback);
            if (!records.some((item) => item.id === id)) throw new Error("The selected record no longer exists.");
            const nextRecords = records.map((item) => item.id === id ? { ...item, ...changes, id } : item);
            persist({ ...readDocument(storage), [collection]: nextRecords });
            return nextRecords;
        },
        remove(collection, id, fallback = []) {
            const records = this.list(collection, fallback);
            if (!records.some((item) => item.id === id)) throw new Error("The selected record no longer exists.");
            const nextRecords = records.filter((item) => item.id !== id);
            persist({ ...readDocument(storage), [collection]: nextRecords });
            return nextRecords;
        },
        replace(collection, records) {
            persist({ ...readDocument(storage), [collection]: records });
            return records;
        },
    };
}

export const contentRepository = createContentRepository();