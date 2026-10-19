export const audioCategories = [
    { id: "all", name: "All Audio" },
    { id: "naat-sharif", name: "Naat Sharif" },
    { id: "hamd", name: "Hamd" },
    { id: "manqabat", name: "Manqabat" },
    { id: "durood-o-salam", name: "Durood-o-Salam" },
    { id: "quran-recitation", name: "Quran Recitation" },
    { id: "bayan", name: "Bayan" },
];

export const audioLibrary = [
    {
        id: "karam-mangta-hoon",
        slug: "karam-mangta-hoon",
        title: "Karam Mangta Hoon",
        artist: "Owais Raza Qadri",
        categories: ["Naat Sharif"],
        duration: "06:24",
        description: "A heartfelt naat for reflection, mercy, and remembrance.",
        date: "2025-05-08T00:00:00Z",
        featured: true,
        color: "green",
        image: "https://images.unsplash.com/photo-1778754607042-5fc1e79b300f?auto=format&fit=crop&w=900&q=80",
        source: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        downloadable: false,
        isDemo: true,
        relatedLyrics: ["karam-mangta-hoon", "mustafa-jaan-e-rehmat"],
    },
    {
        id: "mustafa-jaan-e-rehmat",
        slug: "mustafa-jaan-e-rehmat",
        title: "Mustafa Jaan-e-Rehmat",
        artist: "Zohaib Ashrafi",
        categories: ["Durood-o-Salam"],
        duration: "08:42",
        description: "A soothing Durood narration marked by devotion and calm.",
        date: "2025-05-04T00:00:00Z",
        featured: true,
        color: "gold",
        image: "https://images.unsplash.com/photo-1537181534458-45dcee76ae90?auto=format&fit=crop&w=900&q=80",
        source: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        downloadable: false,
        isDemo: true,
        relatedLyrics: ["mustafa-jaan-e-rehmat", "786-durood"],
    },
    {
        id: "ya-ilahi-har-jagah",
        slug: "ya-ilahi-har-jagah",
        title: "Ya Ilahi Har Jagah",
        artist: "Zikr Ensemble",
        categories: ["Hamd"],
        duration: "05:18",
        description: "A lyrical hamd that brings clarity and peace to remembrance.",
        date: "2025-04-29T00:00:00Z",
        featured: false,
        color: "ink",
        image: "https://images.unsplash.com/photo-1671105424304-5aed79f1156a?auto=format&fit=crop&w=900&q=80",
        source: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        downloadable: false,
        isDemo: true,
        relatedLyrics: ["kabe-ki-ronaq"],
    },
    {
        id: "madina-noor-bayan",
        slug: "madina-noor-bayan",
        title: "Madina Noor Bayan",
        artist: "Abdul Hadi Khan",
        categories: ["Bayan"],
        duration: "12:48",
        description: "A reflective bayan on light, remembrance, and spiritual intent.",
        date: "2025-04-18T00:00:00Z",
        featured: false,
        color: "emerald",
        image: "https://images.unsplash.com/photo-1567712595315-545da0d341b2?auto=format&fit=crop&w=900&q=80",
        source: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
        downloadable: false,
        isDemo: true,
        relatedLyrics: ["allah-hu-allah-hu"],
    },
    {
        id: "surah-al-mulk",
        slug: "surah-al-mulk",
        title: "Surah Al-Mulk Recitation",
        artist: "Abdul Basit",
        categories: ["Quran Recitation"],
        duration: "11:05",
        description: "A calm Quran recitation sample for peaceful listening and reflection.",
        date: "2025-04-12T00:00:00Z",
        featured: true,
        color: "sand",
        image: "https://images.unsplash.com/photo-1554110838-816383ce7956?auto=format&fit=crop&w=900&q=80",
        source: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
        downloadable: false,
        isDemo: true,
        relatedLyrics: ["allah-hu-allah-hu"],
    },
    {
        id: "noor-e-rahmat",
        slug: "noor-e-rahmat",
        title: "Noor-e-Rahmat",
        artist: "Ammar Ali",
        categories: ["Manqabat", "Durood-o-Salam"],
        duration: "07:10",
        description: "A manqabat and peace-filled recital for hearts longing for mercy.",
        date: "2025-04-02T00:00:00Z",
        featured: false,
        color: "wine",
        image: "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?auto=format&fit=crop&w=900&q=80",
        source: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
        downloadable: false,
        isDemo: true,
        relatedLyrics: ["mustafa-jaan-e-rehmat"],
    },
];

export function filterAudioLibrary(list = audioLibrary, options = {}) {
    const { search = "", category = "All Audio" } = options;
    const query = (search || "").trim().toLowerCase();

    return [...list]
        .filter((item) => {
            const matchesSearch =
                !query ||
                `${item.title} ${item.artist}`.toLowerCase().includes(query) ||
                item.categories.some((entry) => entry.toLowerCase().includes(query));

            const categoryMatches =
                category === "All Audio" ||
                item.categories.includes(category) ||
                (category === "Quran Audio" && item.categories.includes("Quran Recitation"));

            return matchesSearch && categoryMatches;
        })
        .sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
}

export function getAudioById(id) {
    return audioLibrary.find((item) => item.id === id || item.slug === id) || null;
}
