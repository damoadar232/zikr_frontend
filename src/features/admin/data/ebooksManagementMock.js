import { artists, poets } from "../../../lyricsData.js";
import { ebookCategories } from "../../../bookData.js";

const categoryOptions = ebookCategories.filter((category) => category.id !== "all-books");

const publicationAuthors = [
    { id: "editorial-collection", name: "Editorial Collection" },
    { id: "compiled-edition", name: "Compiled Edition" },
    { id: "ala-hazrat-publications", name: "Ala Hazrat Publications" },
];

export const ebookAuthorOptions = [...artists, ...poets, ...publicationAuthors]
    .map(({ id, name, profile }) => ({
        value: id,
        label: name,
        description: profile || "Ebook author or writer",
    }));

export const ebookCategoryOptions = categoryOptions.map(({ id, name }) => ({
    value: id,
    label: name,
}));

export const ebookLanguageOptions = [
    { code: "en", name: "English" },
    { code: "ur", name: "Urdu" },
    { code: "hi", name: "Hindi" },
    { code: "ar", name: "Arabic" },
    { code: "ta", name: "Tamil" },
];

const coverPalette = [
    ["#244b3e", "#d9b866"],
    ["#623d45", "#e7c37a"],
    ["#263b58", "#d7b76b"],
    ["#846c45", "#f0d48d"],
    ["#485747", "#c5a75f"],
];

function createCover(title, index) {
    const [background, accent] = coverPalette[index % coverPalette.length];
    const safeTitle = title.replace(/[<>&]/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="420" viewBox="0 0 320 420"><rect width="320" height="420" rx="18" fill="${background}"/><rect x="17" y="17" width="286" height="386" rx="13" fill="none" stroke="${accent}" stroke-width="2"/><circle cx="160" cy="112" r="44" fill="none" stroke="${accent}" stroke-width="2"/><path d="M160 75v74m-37-37h74m-63-26 52 52m0-52-52 52" stroke="${accent}" stroke-width="2" opacity=".8"/><text x="160" y="238" text-anchor="middle" fill="#fffaf0" font-family="Georgia,serif" font-size="24">${safeTitle}</text><text x="160" y="366" text-anchor="middle" fill="${accent}" font-family="Arial,sans-serif" font-size="11" letter-spacing="3">ZIKR-E-ILAHI LIBRARY</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const ebookSeedData = [
    {
        id: "gardens-of-devotion",
        title: "Gardens of Devotion",
        description: "A refined collection of devotional reflections curated for quiet reading, remembrance, and spiritual uplift.",
        authorIds: ["editorial-collection", "imam-ahmed-raza-khan"],
        categoryIds: ["naat-books", "islamic-books"],
        languageCode: "en",
        publishedDate: "2025-05-10",
        status: "published",
        bookFileName: "gardens-of-devotion.pdf",
        bookFileSize: 2488320,
    },
    {
        id: "pathways-of-remembrance",
        title: "Pathways of Remembrance",
        description: "A thoughtful companion on zikr, reflection, and daily practice rooted in the tradition of remembrance.",
        authorIds: ["muzaffar-warsi"],
        categoryIds: ["islamic-books", "dua-books"],
        languageCode: "en",
        publishedDate: "2025-05-01",
        status: "published",
        bookFileName: "pathways-of-remembrance.pdf",
        bookFileSize: 3145728,
    },
    {
        id: "durood-salam",
        title: "Durood & Salam",
        description: "A collection of revered supplications and salutations, arranged for personal reading and daily spiritual practice.",
        authorIds: ["compiled-edition", "pir-nasiruddin-nasir"],
        categoryIds: ["durood-o-salam", "naat-books"],
        languageCode: "ur",
        publishedDate: "2025-04-24",
        status: "published",
        bookFileName: "durood-and-salam.pdf",
        bookFileSize: 1879040,
    },
    {
        id: "prayers-for-every-day",
        title: "Prayers for Every Day",
        description: "A daily collection of supplications, reminders, and concise duas suitable for reflection and remembrance.",
        authorIds: ["muzaffar-warsi"],
        categoryIds: ["dua-books", "islamic-books"],
        languageCode: "en",
        publishedDate: "2025-04-16",
        status: "draft",
        bookFileName: "prayers-for-every-day.pdf",
        bookFileSize: 1566720,
    },
    {
        id: "wisdom-of-reflection",
        title: "Wisdom of Reflection",
        description: "A reflective and devotional reading on the heart, patience, and the spiritual lesson found in everyday remembrance.",
        authorIds: ["imam-ahmed-raza-khan"],
        categoryIds: ["ala-hazrat-books", "islamic-books"],
        languageCode: "ur",
        publishedDate: "2025-04-03",
        status: "inactive",
        bookFileName: "wisdom-of-reflection.pdf",
        bookFileSize: 2764800,
    },
    {
        id: "noor-e-sadaqat",
        title: "Noor-e-Sadaqat",
        description: "A curated devotional anthology for reflection, gratitude, and remembrance.",
        authorIds: ["ala-hazrat-publications"],
        categoryIds: ["ala-hazrat-books", "naat-books"],
        languageCode: "ur",
        publishedDate: "2025-03-19",
        status: "published",
        bookFileName: "noor-e-sadaqat.pdf",
        bookFileSize: 2252800,
    },
    {
        id: "madina-roses",
        title: "Madina Roses",
        description: "Short praise and remembrance pieces for Madina, presented for calm and thoughtful reading.",
        authorIds: ["owais-raza-qadri", "traditional"],
        categoryIds: ["naat-books", "durood-o-salam"],
        languageCode: "hi",
        publishedDate: "2025-02-28",
        status: "draft",
        bookFileName: "madina-roses.pdf",
        bookFileSize: 1986560,
    },
    {
        id: "salam-o-durood",
        title: "Salam o Durood",
        description: "Words of blessing and love collected in a gentle, meditative devotional volume.",
        authorIds: ["pir-nasiruddin-nasir", "compiled-edition"],
        categoryIds: ["durood-o-salam", "dua-books"],
        languageCode: "ar",
        publishedDate: "2025-02-11",
        status: "inactive",
        bookFileName: "salam-o-durood.pdf",
        bookFileSize: 2916352,
    },
    {
        id: "daily-remembrance",
        title: "Daily Remembrance",
        description: "A practical guide to building a daily habit of prayer, gratitude, and mindful remembrance.",
        authorIds: ["zohaib-ashrafi"],
        categoryIds: ["islamic-books", "dua-books"],
        languageCode: "ta",
        publishedDate: "2025-01-22",
        status: "published",
        bookFileName: "daily-remembrance.pdf",
        bookFileSize: 1736704,
    },
    {
        id: "a-heart-at-peace",
        title: "A Heart at Peace",
        description: "Gentle reflections on patience, kindness, and finding peace through a life of faith.",
        authorIds: ["editorial-collection", "muzaffar-warsi"],
        categoryIds: ["islamic-books", "naat-books"],
        languageCode: "en",
        publishedDate: "2024-12-15",
        status: "draft",
        bookFileName: "a-heart-at-peace.pdf",
        bookFileSize: 2162688,
    },
];

export const initialEbooks = ebookSeedData.map((ebook, index) => {
    return {
        ...ebook,
        language: ebookLanguageOptions.find((language) => language.code === ebook.languageCode)?.name || "",
        authors: ebookAuthorOptions
            .filter((author) => ebook.authorIds.includes(author.value))
            .map(({ value, label }) => ({ id: value, name: label })),
        categories: ebookCategoryOptions
            .filter((category) => ebook.categoryIds.includes(category.value))
            .map(({ label }) => label),
        coverImageUrl: createCover(ebook.title, index),
        coverImageFile: null,
        pdfFile: null,
    };
}).sort((first, second) => second.publishedDate.localeCompare(first.publishedDate));
