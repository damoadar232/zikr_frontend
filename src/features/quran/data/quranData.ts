export type TranslationLanguage = "en" | "hi" | "ur" | "ta";

export type TranslationResource = {
    id: string;
    languageCode: TranslationLanguage;
    language: string;
    name: string;
    attribution: string;
};

export type AyahTimingSegment = {
    surahNumber: number;
    ayahNumber: number;
    startTime: number;
    endTime: number;
};

export type SurahAudioMetadata = {
    surahNumber: number;
    reciter: string;
    source: string;
    duration?: number;
    timingStatus: "verified" | "illustrative" | "unavailable";
    timings: AyahTimingSegment[];
};

export type AyahAudioMetadata = {
    surahNumber: number;
    ayahNumber: number;
    reciter: string;
    source: string;
    duration?: number;
};

export const translationResources: TranslationResource[] = [
    { id: "prototype-en", languageCode: "en", language: "English", name: "English sample", attribution: "Existing prototype sample; translator attribution not recorded" },
    { id: "prototype-hi", languageCode: "hi", language: "Hindi", name: "Hindi sample", attribution: "Existing prototype sample; translator attribution not recorded" },
    { id: "prototype-ur", languageCode: "ur", language: "Urdu", name: "Urdu sample", attribution: "Existing prototype sample; translator attribution not recorded" },
    { id: "prototype-ta", languageCode: "ta", language: "Tamil", name: "Tamil translation", attribution: "No translation text is available in the local mock data" },
];

export const ayahContent: Record<number, Record<number, { arabic: string; translations: Partial<Record<TranslationLanguage, string>> }>> = {
    1: {
        1: {
            arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
            translations: {
                en: "In the name of Allah, the Most Compassionate, the Most Merciful.",
                hi: "अल्लाह के नाम से जो अत्यन्त कृपाशील तथा दयावान् है।",
                ur: "اللہ کے نام سے جو نہایت مہربان، رحم فرمانے والا ہے۔",
            },
        },
    },
};

export const quranAyahRecords = Object.entries(ayahContent).flatMap(([surahNumber, ayahs]) =>
    Object.entries(ayahs).map(([ayahNumber, content]) => ({
        id: `${surahNumber}:${ayahNumber}`,
        surahNumber: Number(surahNumber),
        ayahNumber: Number(ayahNumber),
        arabic: content.arabic,
        translations: content.translations,
        status: "published",
    })),
);

export const juzStarts = [
    { juz: 1, surah: 1, ayah: 1 }, { juz: 2, surah: 2, ayah: 142 }, { juz: 3, surah: 2, ayah: 253 },
    { juz: 4, surah: 3, ayah: 93 }, { juz: 5, surah: 4, ayah: 24 }, { juz: 6, surah: 4, ayah: 148 },
    { juz: 7, surah: 5, ayah: 82 }, { juz: 8, surah: 6, ayah: 111 }, { juz: 9, surah: 7, ayah: 88 },
    { juz: 10, surah: 8, ayah: 41 }, { juz: 11, surah: 9, ayah: 93 }, { juz: 12, surah: 11, ayah: 6 },
    { juz: 13, surah: 12, ayah: 53 }, { juz: 14, surah: 15, ayah: 1 }, { juz: 15, surah: 17, ayah: 1 },
    { juz: 16, surah: 18, ayah: 75 }, { juz: 17, surah: 21, ayah: 1 }, { juz: 18, surah: 23, ayah: 1 },
    { juz: 19, surah: 25, ayah: 21 }, { juz: 20, surah: 27, ayah: 56 }, { juz: 21, surah: 29, ayah: 46 },
    { juz: 22, surah: 33, ayah: 31 }, { juz: 23, surah: 36, ayah: 28 }, { juz: 24, surah: 39, ayah: 32 },
    { juz: 25, surah: 41, ayah: 47 }, { juz: 26, surah: 46, ayah: 1 }, { juz: 27, surah: 51, ayah: 31 },
    { juz: 28, surah: 58, ayah: 1 }, { juz: 29, surah: 67, ayah: 1 }, { juz: 30, surah: 78, ayah: 1 },
];

export const mushafPageStarts = [
    { page: 1, surah: 1, ayah: 1 },
    { page: 2, surah: 2, ayah: 1 },
];

export const audioSources: Record<number, SurahAudioMetadata> = {};
export const ayahAudioSources: Record<string, AyahAudioMetadata> = {};

export const surahMeanings = [
    "The Opening", "The Cow", "Family of Imran", "The Women", "The Table Spread", "The Cattle", "The Heights", "The Spoils of War", "The Repentance", "Jonah",
    "Hud", "Joseph", "The Thunder", "Abraham", "The Rocky Tract", "The Bee", "The Night Journey", "The Cave", "Mary", "Ta-Ha",
    "The Prophets", "The Pilgrimage", "The Believers", "The Light", "The Criterion", "The Poets", "The Ant", "The Stories", "The Spider", "The Romans",
    "Luqman", "The Prostration", "The Confederates", "Sheba", "The Originator", "Ya-Sin", "Those Who Set the Ranks", "Sad", "The Groups", "The Forgiver",
    "Explained in Detail", "The Consultation", "Ornaments of Gold", "The Smoke", "The Crouching", "The Sandhills", "Muhammad", "The Victory", "The Rooms", "Qaf",
    "The Winnowing Winds", "The Mount", "The Star", "The Moon", "The Beneficent", "The Inevitable", "The Iron", "The Pleading Woman", "The Exile", "The Examined Woman",
    "The Ranks", "Friday", "The Hypocrites", "Mutual Disillusion", "The Divorce", "The Prohibition", "The Sovereignty", "The Pen", "The Reality", "The Ascending Stairways",
    "Noah", "The Jinn", "The Enshrouded One", "The Cloaked One", "The Resurrection", "The Human", "The Emissaries", "The Tidings", "Those Who Pull Out", "He Frowned",
    "The Folding Up", "The Cleaving", "The Defrauding", "The Splitting Open", "The Constellations", "The Nightcomer", "The Most High", "The Overwhelming", "The Dawn", "The City",
    "The Sun", "The Night", "The Morning Hours", "The Relief", "The Fig", "The Clinging Clot", "The Power", "The Clear Proof", "The Earthquake", "The Courser",
    "The Calamity", "Competition", "Time", "The Slanderer", "The Elephant", "Quraysh", "Small Kindnesses", "Abundance", "The Disbelievers", "Divine Support",
    "Palm Fiber", "Sincerity", "The Daybreak", "Mankind",
];
