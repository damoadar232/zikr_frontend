export type LyricRecord = {
    id: string;
    title?: string;
    status?: string;
    createdAt?: string;
    artistId?: string | number;
    artistIds?: Array<string | number>;
    reciterIds?: Array<string | number>;
    reciters?: string[];
    [key: string]: unknown;
};
