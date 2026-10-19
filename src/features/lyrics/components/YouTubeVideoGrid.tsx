import { useState } from "react";
import { getYouTubeVideoId } from "../utils/youtubeVideo.js";

type VideoReference = { id?: string; title?: string; url: string };

function YouTubeVideoCard({ video }: { video: VideoReference }) {
    const [embedFailed, setEmbedFailed] = useState(false);
    const videoId = getYouTubeVideoId(video.url);
    const title = video.title || "YouTube video reference";

    return <article className="youtube-reference-card">
        {videoId && !embedFailed ? <div className="youtube-embed-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${videoId}`} title={title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" onError={() => setEmbedFailed(true)} /></div> : <div className="youtube-embed-fallback">{embedFailed ? "Embedding is unavailable in this browser." : "This video URL cannot be embedded."}</div>}
        <div><h3>{title}</h3><a href={video.url} target="_blank" rel="noopener noreferrer">Open on YouTube</a></div>
    </article>;
}

export function YouTubeVideoGrid({ videos }: { videos: VideoReference[] }) {
    return <div className="youtube-reference-grid">{videos.map((video, index) => <YouTubeVideoCard key={video.id || video.url || index} video={video} />)}</div>;
}
