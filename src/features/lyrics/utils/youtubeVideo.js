const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;

export function getYouTubeVideoId(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== "https:") return null;
        const host = url.hostname.toLowerCase().replace(/^www\./, "");
        let videoId = null;
        if (host === "youtu.be") videoId = url.pathname.split("/").filter(Boolean)[0];
        else if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) {
            videoId = url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] || null;
        }
        return videoId && videoIdPattern.test(videoId) ? videoId : null;
    } catch {
        return null;
    }
}

export function slugifyLyricsTitle(value) {
    const slug = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return slug || "lyrics";
}