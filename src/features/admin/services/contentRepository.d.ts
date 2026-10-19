export type ContentRecord = { id: string; status?: string;[key: string]: unknown };

export const ADMIN_CONTENT_STORAGE_KEY: string;
export const ADMIN_CONTENT_UPDATED_EVENT: string;

export function createContentRepository(options?: { storage?: Storage | null; eventTarget?: EventTarget | null }): {
    readonly mode: "browser-demo";
    list<T extends ContentRecord>(collection: string, fallback?: T[]): T[];
    create<T extends ContentRecord>(collection: string, record: T, fallback?: T[]): T[];
    update<T extends ContentRecord>(collection: string, id: string, changes: Partial<T>, fallback?: T[]): T[];
    remove<T extends ContentRecord>(collection: string, id: string, fallback?: T[]): T[];
    replace<T extends ContentRecord>(collection: string, records: T[]): T[];
};

export const contentRepository: ReturnType<typeof createContentRepository>;