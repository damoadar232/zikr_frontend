export type LyricRecord = {
    id: string;
    title?: string;
    status?: string;
    createdAt?: string;
    artistId?: string | number;
    artistIds?: Array<string | number>;
    artistProfiles?: Array<{
        id: string | number;
        artistKey?: string;
        fullName: string;
        displayName?: string | null;
        profileImageUrl?: string | null;
    }>;
    reciterIds?: Array<string | number>;
    reciters?: string[];
    [key: string]: unknown;
};
