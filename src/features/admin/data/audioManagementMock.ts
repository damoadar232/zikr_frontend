import { audioCategories, audioLibrary } from "../../../audioData.js";

export type AdminAudioStatus = "draft" | "published" | "inactive";

export interface AdminAudioTrack {
    id: string;
    title: string;
    description: string;
    categoryId: string;
    language: string;
    singerIds: string[];
    singerNames: string[];
    writerId: string;
    writerName: string;
    publishedAt: string;
    status: AdminAudioStatus;
    featured: boolean;
    coverImageUrl: string;
    audioUrl: string;
    audioFileName: string;
    audioFileSize: number | null;
}

export function getAudioManagementPreviewTracks(): AdminAudioTrack[] {
    return audioLibrary.map((track) => ({
        id: track.id,
        title: track.title,
        description: track.description || "",
        categoryId: audioCategories.find((category) => category.name === track.categories[0])?.id || "",
        language: "",
        singerIds: [],
        singerNames: [track.artist],
        writerId: "",
        writerName: "",
        publishedAt: track.date.slice(0, 10),
        status: "published",
        featured: !!track.featured,
        coverImageUrl: track.image,
        audioUrl: track.source,
        audioFileName: track.source.split("/").pop()?.split("?")[0] || "",
        audioFileSize: null,
    }));
}
