export const lyricCategories = [
    { id: "hamd", name: "Hamd" },
    { id: "dua", name: "Dua" },
    { id: "naat-sharif", name: "Naat Sharif" },
    { id: "manqabat", name: "Manqabat" },
    { id: "sufi-kalam", name: "Sufi Kalam" },
    { id: "durood-o-salam", name: "Durood-o-Salam" },
    { id: "tazmeen", name: "Tazmeen" },
    { id: "qawwali", name: "Qawwali" },
    { id: "other-kalam", name: "Other Kalam" },
];

export const lyricCategoryNumericIds = {
    "durood-o-salam": 1,
    hamd: 2,
    manqabat: 3,
    "naat-sharif": 4,
    qawwali: 5,
    "sufi-kalam": 6,
    dua: 7,
    "other-kalam": 8,
    tazmeen: 9,
};

export const artists = [
    { id: "owais-raza-qadri", name: "Owais Raza Qadri", profile: "Renowned reciter of devotional naats and supplications." },
    { id: "zohaib-ashrafi", name: "Zohaib Ashrafi", profile: "Beloved reciter with expressive, heartfelt delivery." },
    { id: "traditional", name: "Traditional", profile: "Community-recited and heritage devotional phrase." },
];

export const poets = [
    { id: "imam-ahmed-raza-khan", name: "Imam Ahmed Raza Khan", profile: "Celebrated writer of devotional poetry and praise." },
    { id: "muzaffar-warsi", name: "Muzaffar Warsi", profile: "Poetic expression rooted in remembrance and compassion." },
    { id: "pir-nasiruddin-nasir", name: "Pir Nasiruddin Nasir", profile: "Writer of emotionally resonant naats and supplications." },
    { id: "traditional-poet", name: "Traditional", profile: "Shared devotional phrase carried through generations." },
];

export const lyricBooks = [
    { id: "noor-e-sadaqat", title: "Noor-e-Sadaqat", author: "Editorial Collection", description: "A curated devotional anthology for reflection and remembrance.", coverColor: "emerald" },
    { id: "madina-roses", title: "Madina Roses", author: "Editorial Collection", description: "Short praise and remembrance pieces for the beloved city of Madina.", coverColor: "gold" },
    { id: "salam-o-durood", title: "Salam o Durood", author: "Compiled Edition", description: "Words of blessing and love written in gentle, meditative form.", coverColor: "navy" },
];

export const lyricSubjects = [
    { id: "madina", name: "Madina" },
    { id: "prophet", name: "Prophet ﷺ" },
    { id: "ramadan", name: "Ramadan" },
    { id: "eid", name: "Eid" },
    { id: "karbala", name: "Karbala" },
    { id: "namaz", name: "Namaz" },
    { id: "mercy", name: "Mercy" },
    { id: "tawakkul", name: "Tawakkul" },
];

export const lyrics = [
    {
        id: "786-durood",
        title: "786 Durood",
        slug: "786-durood",
        artistId: "traditional",
        writerId: "traditional-poet",
        categoryIds: ["durood-o-salam"],
        subjectIds: ["mercy", "ramadan"],
        bookId: "salam-o-durood",
        tags: ["blessing", "remembrance"],
        createdAt: "2025-05-16T10:00:00Z",
        status: "published",
        featured: false,
        image: "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?auto=format&fit=crop&w=1200&q=82",
        languageVersions: [
            { code: "ur", label: "Urdu", script: "Urdu", dir: "rtl", text: "بِسْمِ اللّٰهِ، دُرُودُ سَلَام، خُشُکُ دلوں پر نُور آتا ہے\nرحمت کا سامان، ہِمْت کا سِفر، دلوں کو سُکُون ملتا ہے" },
            { code: "en", label: "English", script: "Roman", dir: "ltr", text: "In the name of Allah, blessings and peace rise within the heart.\nMercy becomes a gentle light, and the soul learns calm." },
            { code: "hi", label: "Hindi", script: "Devanagari", dir: "ltr", text: "हर दिल में इश्क़-ए-रहमत की लौ जलती है।\nसामना करे रब की रहमत, मन को शांति मिलती है।" },
        ],
        relatedAudio: [{ title: "786 Durood audio", url: "https://example.com/audio/786-durood" }],
        relatedVideos: [{ title: "Live Urdu recitation", url: "https://www.youtube.com/watch?v=example786" }],
    },
    {
        id: "mustafa-jaan-e-rehmat",
        title: "Mustafa Jaan-e-Rehmat",
        slug: "mustafa-jaan-e-rehmat",
        artistId: "owais-raza-qadri",
        artistIds: ["owais-raza-qadri", "zohaib-ashrafi"],
        reciterIds: ["owais-raza-qadri", "zohaib-ashrafi"],
        writerId: "imam-ahmed-raza-khan",
        categoryIds: ["durood-o-salam"],
        subjectIds: ["prophet", "madina"],
        bookId: "noor-e-sadaqat",
        tags: ["love", "prophet", "madina"],
        createdAt: "2025-05-12T10:00:00Z",
        status: "published",
        featured: true,
        image: "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=1200&q=82",
        languageVersions: [
            { code: "ur", label: "Urdu", script: "Urdu", dir: "rtl", text: "مُحَمَّد ﷺ کی محبت، دل کی سیرابیاں\nمَدینَہ کے درِخُدا میں، حُب کا سِلسِلَہ سجایا گیا" },
            { code: "en", label: "English", script: "Roman", dir: "ltr", text: "The beloved’s message is a river of mercy.\nIn the heart of Madina, love finds its gentle home." },
            { code: "hi", label: "Hindi", script: "Devanagari", dir: "ltr", text: "प्यारे नबी की शान में दिल रोशन है।\nमदीना की राहों में इश्क़ का दरिया बहता है।" },
        ],
        relatedAudio: [{ title: "Devotional recital", url: "https://example.com/audio/mustafa-jaan-e-rehmat" }],
        relatedVideos: [{ title: "Madina remembrance video", url: "https://www.youtube.com/watch?v=exampleMadina" }],
    },
    {
        id: "karam-mangta-hoon",
        title: "Karam Mangta Hoon",
        slug: "karam-mangta-hoon",
        artistId: "owais-raza-qadri",
        writerId: "muzaffar-warsi",
        categoryIds: ["naat-sharif"],
        subjectIds: ["mercy", "prophet"],
        bookId: "madina-roses",
        tags: ["naat", "compassion"],
        createdAt: "2025-05-08T10:00:00Z",
        status: "published",
        featured: true,
        image: "https://images.unsplash.com/photo-1567712595315-545da0d341b2?auto=format&fit=crop&w=1200&q=82",
        languageVersions: [
            { code: "ur", label: "Urdu", script: "Urdu", dir: "rtl", text: "کرم مانگتا ہوں، دل سے پکار کر\nرحم کے درِخُدا سے، نُور کا دَریا دِکھا" },
            { code: "en", label: "English", script: "Roman", dir: "ltr", text: "I ask for compassion, from the deepest heart.\nI seek a path of mercy and the light of remembrance." },
        ],
        relatedAudio: [{ title: "Karam Mangta Hoon live", url: "https://example.com/audio/karam-mangta-hoon" }],
        relatedVideos: [],
    },
    {
        id: "main-so-jaun",
        title: "Main So Jaun",
        slug: "main-so-jaun",
        artistId: "zohaib-ashrafi",
        writerId: "traditional-poet",
        categoryIds: ["naat-sharif"],
        subjectIds: ["tawakkul", "ramadan"],
        bookId: null,
        tags: ["peace", "sleep"],
        createdAt: "2025-05-02T10:00:00Z",
        status: "published",
        featured: false,
        image: "https://images.unsplash.com/photo-1596612265825-f7d7506ae4ad?auto=format&fit=crop&w=1200&q=82",
        languageVersions: [
            { code: "ur", label: "Urdu", script: "Urdu", dir: "rtl", text: "میں سُو جاوں، دل کی تھکَھن مٹ جائے\nحُسنِ سُکُون سے، نَفْس کو پُرچِمَہ مل جائے" },
            { code: "en", label: "English", script: "Roman", dir: "ltr", text: "Let my heart rest in stillness and peace.\nMay gentle remembrance settle the soul for rest." },
        ],
        relatedAudio: [],
        relatedVideos: [{ title: "Naat recital from the archive", url: "https://www.youtube.com/watch?v=exampleMainSoJaun" }],
    },
    {
        id: "kabe-ki-ronaq",
        title: "Kabe Ki Ronaq",
        slug: "kabe-ki-ronaq",
        artistId: "owais-raza-qadri",
        writerId: "traditional-poet",
        categoryIds: ["hamd"],
        subjectIds: ["madina", "namaz"],
        bookId: null,
        tags: ["kaaba", "prayer"],
        createdAt: "2025-04-28T10:00:00Z",
        status: "published",
        featured: false,
        image: "https://images.unsplash.com/photo-1554110838-816383ce7956?auto=format&fit=crop&w=1200&q=82",
        languageVersions: [
            { code: "hi", label: "Hindi", script: "Devanagari", dir: "ltr", text: "क़ाबा की रौनक में नूरा-ए-तरीक़त है\nदुआ की गूँज में दिल का हर कलीश मिटता है" },
            { code: "ur", label: "Urdu", script: "Urdu", dir: "rtl", text: "کعبہ کی رونق میں نُورِ حُب پیدا ہے\nدُعا کی گونج میں دل کا غم رُک جاتا ہے" },
        ],
        relatedAudio: [{ title: "Kabe Ki Ronaq recital", url: "https://example.com/audio/kabe-ki-ronaq" }],
        relatedVideos: [],
    },
    {
        id: "mere-aaqa-aao",
        title: "Mere Aaqa Aao",
        slug: "mere-aaqa-aao",
        artistId: "zohaib-ashrafi",
        writerId: "pir-nasiruddin-nasir",
        categoryIds: ["naat-sharif"],
        subjectIds: ["prophet", "eid"],
        bookId: "madina-roses",
        tags: ["love", "joy"],
        createdAt: "2025-04-20T10:00:00Z",
        status: "published",
        featured: false,
        image: "https://images.unsplash.com/photo-1533082385145-b152cdde7ccd?auto=format&fit=crop&w=1200&q=82",
        languageVersions: [
            { code: "ur", label: "Urdu", script: "Urdu", dir: "rtl", text: "میرے آقا آؤ، دل میں رِہمت کی گُرُج آتی ہے\nسَردِ دِل کے لیے، نُورِ حُب کا یارِا ملتا ہے" },
            { code: "en", label: "English", script: "Roman", dir: "ltr", text: "Come, beloved one, and fill the heart with mercy.\nFor a weary soul, love becomes a faithful light." },
        ],
        relatedAudio: [],
        relatedVideos: [{ title: "Live gathering video", url: "https://www.youtube.com/watch?v=exampleMereAaqaAao" }],
    },
    {
        id: "allah-hu-allah-hu",
        title: "Allah Hu Allah Hu",
        slug: "allah-hu-allah-hu",
        artistId: "traditional",
        writerId: "traditional-poet",
        categoryIds: ["sufi-kalam"],
        subjectIds: ["mercy", "tawakkul"],
        bookId: null,
        tags: ["zikr", "sufi"],
        createdAt: "2025-04-14T10:00:00Z",
        status: "published",
        featured: false,
        image: "https://images.unsplash.com/photo-1537181534458-45dcee76ae90?auto=format&fit=crop&w=900&q=80",
        languageVersions: [
            { code: "ur", label: "Urdu", script: "Urdu", dir: "rtl", text: "اَللّٰہُ ھُوَ اَللّٰہُ، دلِ نَازِک کو سُکُون دے\nذِکرِ اَللّٰہ سے، ہِمْت کو نُور ملتا ہے" },
            { code: "en", label: "English", script: "Roman", dir: "ltr", text: "Allah is the light that steadies the tender heart.\nIn remembrance, courage grows and peace returns." },
        ],
        relatedAudio: [{ title: "Zikr session", url: "https://example.com/audio/allah-hu-allah-hu" }],
        relatedVideos: [],
    },
];

export function getPublishedLyrics(list = lyrics) {
    return [...list]
        .filter((item) => item.status !== "draft" && item.status !== "archived")
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function getLyricsByCategory(list = lyrics, categoryId) {
    const published = getPublishedLyrics(list);
    if (!categoryId) return [];
    return published.filter((item) => (item.categoryIds || []).includes(categoryId));
}

export function getLyricsByArtist(list = lyrics, artistId) {
    const published = getPublishedLyrics(list);
    if (!artistId) return [];
    return published.filter((item) => Array.isArray(item.reciterIds) && item.reciterIds.length
        ? item.reciterIds.includes(artistId)
        : item.artistId === artistId || (item.artistIds || []).includes(artistId));
}

export function getLyricsByPoet(list = lyrics, poetId) {
    const published = getPublishedLyrics(list);
    if (!poetId) return [];
    return published.filter((item) => item.writerId === poetId);
}

export function getLyricsByBook(list = lyrics, bookId) {
    const published = getPublishedLyrics(list);
    if (!bookId) return [];
    return published.filter((item) => item.bookId === bookId);
}

export function getLyricsByLanguage(list = lyrics, languageCode) {
    const published = getPublishedLyrics(list);
    if (!languageCode) return [];
    const targetCode = normalizeLyricLanguageCode(languageCode);
    return published.filter((item) => item.languageVersions?.some((version) => normalizeLyricLanguageCode(version.code || version.label || version.script) === targetCode));
}

export function normalizeLyricLanguageCode(value) {
    const normalized = String(value || "").trim().toLowerCase().replace(/_/g, "-");
    const primary = normalized.split("-")[0];
    const aliases = {
        hindi: "hi",
        devanagari: "hi",
        english: "en",
        roman: "en",
        urdu: "ur",
        arabic: "ar",
        tamil: "ta",
    };
    return aliases[normalized] || aliases[primary] || primary;
}

export function getLyricsBySubject(list = lyrics, subjectId) {
    const published = getPublishedLyrics(list);
    if (!subjectId) return [];
    return published.filter((item) => (item.subjectIds || []).includes(subjectId));
}

export function filterLyricsByTitle(list, search = "", letter = "All") {
    const query = (search || "").trim().toLowerCase();
    return list.filter((item) => {
        const title = (item.title || "").trim();
        const matchesTitle = !query || title.toLowerCase().includes(query);
        if (!matchesTitle) return false;
        if (letter === "All") return true;
        const firstMeaningful = (title.match(/[A-Za-z0-9]/) || [""])[0];
        if (!firstMeaningful) return false;
        if (letter === "0-9") return /\d/.test(firstMeaningful);
        return firstMeaningful.toUpperCase() === letter.toUpperCase();
    });
}

export function getRelatedRecordName(collection, id) {
    if (!collection || !id) return "";
    const item = collection.find((entry) => entry.id === id);
    return item?.name || item?.title || "";
}

export function findLyricById(id) {
    return getPublishedLyrics().find((item) => item.id === id || item.slug === id) || null;
}
