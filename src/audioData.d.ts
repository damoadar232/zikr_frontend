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
    [key: string]: any;
};

export const audioCategories: Array<{ id: string; name: string }>;
export const audioLibrary: AudioRecord[];
export function filterAudioLibrary(list?: AudioRecord[], options?: { search?: string; category?: string }): AudioRecord[];
export function getAudioById(id: string): AudioRecord | null;
