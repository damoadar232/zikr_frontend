export type ReciterRole =
    | "Singer / Reciter"
    | "Poet / Lyricist"
    | "Composer"
    | "Music Producer"
    | "Performer"
    | "Other";

export type ReciterProfile = {
    id: string;
    name: string;
    roles: ReciterRole[];
    biography: string;
    languages: string[];
    location?: string;
    profileImage?: string;
    socialLinks?: string[];
    status: "active" | "inactive";
};

export const reciterRoles: ReciterRole[] = [
    "Singer / Reciter",
    "Poet / Lyricist",
    "Composer",
    "Music Producer",
    "Performer",
    "Other",
];

export const reciterProfiles: ReciterProfile[] = [
    {
        id: "owais-raza-qadri",
        name: "Owais Raza Qadri",
        roles: ["Singer / Reciter", "Performer"],
        biography: "Renowned reciter of devotional naats and supplications.",
        languages: ["Urdu", "Arabic"],
        location: "Karachi, Pakistan",
        status: "active",
    },
    {
        id: "zohaib-ashrafi",
        name: "Zohaib Ashrafi",
        roles: ["Singer / Reciter", "Performer"],
        biography: "Beloved reciter with expressive, heartfelt delivery.",
        languages: ["Urdu"],
        location: "Pakistan",
        status: "active",
    },
    {
        id: "traditional",
        name: "Traditional",
        roles: ["Singer / Reciter", "Other"],
        biography: "Community-recited devotional works carried through generations.",
        languages: ["Urdu", "Arabic"],
        status: "active",
    },
];
