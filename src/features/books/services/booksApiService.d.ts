import type { AdminApiError } from "../../auth/services/adminAuth.js";

export interface ApiBook {
    id: number;
    name: string;
    author: string | null;
    slug: string;
    createdAt: string;
    updatedAt: string;
}

export interface BooksApiService {
    listBooks(): Promise<ApiBook[]>;
}

export declare function createBooksApi(options?: { baseUrl?: string; fetchImpl?: typeof fetch }): BooksApiService;
export declare const booksApi: BooksApiService;
export { AdminApiError };
