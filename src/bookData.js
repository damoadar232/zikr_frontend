export const ebookCategories = [
    { id: "all-books", name: "All Books" },
    { id: "islamic-books", name: "Islamic Books" },
    { id: "naat-books", name: "Naat Books" },
    { id: "ala-hazrat-books", name: "Ala Hazrat Books" },
    { id: "durood-o-salam", name: "Durood-o-Salam" },
    { id: "dua-books", name: "Dua Books" },
];

export const ebookLibrary = [
    {
        id: "gardens-of-devotion",
        title: "Gardens of Devotion",
        author: "Editorial Collection",
        category: "Naat Books",
        date: "2025-05-10",
        downloadable: false,
        color: "emerald",
        language: "English & Urdu",
        format: "Digital Edition",
        access: "Read online",
        readOnline: true,
        description: "A refined collection of devotional reflections curated for quiet reading, remembrance, and spiritual uplift.",
        previewText: "May this collection serve as a gentle companion for remembrance, gratitude, and renewal of the heart.",
        pageCount: 48,
        relatedBooks: ["pathways-of-remembrance", "prayers-for-every-day", "durood-salam"],
    },
    {
        id: "pathways-of-remembrance",
        title: "Pathways of Remembrance",
        author: "Editorial Collection",
        category: "Islamic Books",
        date: "2025-05-01",
        downloadable: false,
        color: "wine",
        language: "English",
        format: "Digital Edition",
        access: "Read online",
        readOnline: true,
        description: "A thoughtful companion on zikr, reflection, and daily practice rooted in the tradition of remembrance.",
        previewText: "Every remembrance is both a lesson and a return to the heart. This book reflects that journey with clarity and calm.",
        pageCount: 52,
        relatedBooks: ["gardens-of-devotion", "wisdom-of-reflection", "prayers-for-every-day"],
    },
    {
        id: "durood-salam",
        title: "Durood & Salam",
        author: "Compiled Edition",
        category: "Durood-o-Salam",
        date: "2025-04-24",
        downloadable: false,
        color: "navy",
        language: "Urdu & English",
        format: "Digital Edition",
        access: "Read online",
        readOnline: true,
        description: "A collection of revered supplications and salutations, arranged for personal reading and daily spiritual practice.",
        previewText: "The beloved prayers of the Prophet ﷺ continue to guide the heart toward mercy, gratitude, and peace.",
        pageCount: 44,
        relatedBooks: ["gardens-of-devotion", "pathways-of-remembrance"],
    },
    {
        id: "prayers-for-every-day",
        title: "Prayers for Every Day",
        author: "Editorial Collection",
        category: "Dua Books",
        date: "2025-04-16",
        downloadable: false,
        color: "sand",
        language: "English",
        format: "Digital Edition",
        access: "Read online",
        readOnline: true,
        description: "A daily collection of supplications, reminders, and concise duas suitable for reflection and remembrance.",
        previewText: "Supplication is not merely a ritual, but a conversation of the heart with its Creator.",
        pageCount: 40,
        relatedBooks: ["pathways-of-remembrance", "gardens-of-devotion"],
    },
    {
        id: "wisdom-of-reflection",
        title: "Wisdom of Reflection",
        author: "Ala Hazrat Publications",
        category: "Ala Hazrat Books",
        date: "2025-04-03",
        downloadable: false,
        color: "wine",
        language: "Urdu",
        format: "Digital Edition",
        access: "Read online",
        readOnline: true,
        description: "A reflective and devotional reading on the heart, patience, and the spiritual lesson found in everyday remembrance.",
        previewText: "A calm and measured inquiry into the inner life, the soul, and the lessons woven through worship.",
        pageCount: 36,
        relatedBooks: ["pathways-of-remembrance", "gardens-of-devotion"],
    },
].sort((a, b) => new Date(b.date) - new Date(a.date));

export function filterEbooks(items = ebookLibrary, { search = "", category = "All Books" } = {}) {
    const query = String(search || "").trim().toLowerCase();
    const categoryFilter = category && category !== "All Books" ? category : null;

    return [...items]
        .filter((book) => {
            const matchesSearch = !query || [book.title, book.author].join(" ").toLowerCase().includes(query);
            const matchesCategory = !categoryFilter || book.category === categoryFilter;
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getEbookById(id) {
    return ebookLibrary.find((book) => book.id === id) || null;
}
