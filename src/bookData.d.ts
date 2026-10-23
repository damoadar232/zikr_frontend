export type EbookRecord = {
    id: string;
    title: string;
    author: string;
    category: string;
    date: string;
    downloadable: boolean;
    downloadUrl?: string;
    color: string;
    language: string;
    format: string;
    access: string;
    readOnline: boolean;
    description: string;
    previewText: string;
    pageCount: number;
    relatedBooks: string[];
    [key: string]: any;
};

export const ebookCategories: Array<{ id: string; name: string }>;
export const ebookLibrary: EbookRecord[];
export function filterEbooks(items?: EbookRecord[], options?: { search?: string; category?: string }): EbookRecord[];
export function getEbookById(id: string): EbookRecord | null;
