export type AudioRecord = {
    id: string;
    slug?: string;
    title: string;
    artist: string;
    category?: string;
    categories: string[];
    duration: string;
    description?: string;
    date: string;
    featured?: boolean;
    color: string;
    image: string;
    source: string;
    downloadUrl?: string;
    downloadable: boolean;
    isDemo?: boolean;
    relatedLyrics?: string[];
    singers?: string[];
    singerCredits?: AudioArtistCredit[];
    writers?: string[];
    [key: string]: any;
};

export type AudioArtistCredit = {
    id: number;
    artistKey: string;
    fullName: string;
    displayName: string | null;
    position: number;
    profileImageUrl?: string | null;
};

export type AudioPage = {
    items: AudioRecord[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
};

export const audioCategories: Array<{ id: string; name: string }>;
export const audioLibrary: AudioRecord[];
export function filterAudioLibrary(list?: AudioRecord[], options?: { search?: string; category?: string }): AudioRecord[];
export function getAudioById(id: string): AudioRecord | null;
