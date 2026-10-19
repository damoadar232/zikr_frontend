import { useEffect, useState } from "react";
import { ADMIN_CONTENT_UPDATED_EVENT, contentRepository, type ContentRecord } from "../../features/admin/services/contentRepository.js";

export function useContentCollection<T extends ContentRecord>(collection: string, fallback: T[]) {
    const [records, setRecords] = useState<T[]>(() => contentRepository.list(collection, fallback));

    useEffect(() => {
        const refresh = () => setRecords(contentRepository.list(collection, fallback));
        window.addEventListener(ADMIN_CONTENT_UPDATED_EVENT, refresh);
        window.addEventListener("storage", refresh);
        refresh();
        return () => {
            window.removeEventListener(ADMIN_CONTENT_UPDATED_EVENT, refresh);
            window.removeEventListener("storage", refresh);
        };
    }, [collection, fallback]);

    return records;
}