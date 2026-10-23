import { useState } from "react";
import { Icon } from "../../../components/ui";
import { getYouTubeVideoId } from "../../lyrics/utils/youtubeVideo.js";

type PortfolioVideo = { id?: string; title?: string; url: string };

function PortfolioVideoCard({ video }: { video: PortfolioVideo }) {
    const [playing, setPlaying] = useState(false);
    const [thumbnailFailed, setThumbnailFailed] = useState(false);
    const videoId = getYouTubeVideoId(video.url);
    const title = video.title || "Devotional video";

    return <article className="portfolio-video-card">
        {playing && videoId
            ? <div className="youtube-embed-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${videoId}`} title={title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" /></div>
            : <button type="button" className="portfolio-video-thumbnail" onClick={() => videoId && setPlaying(true)} disabled={!videoId} aria-label={videoId ? `Play ${title}` : title}>
                {videoId && !thumbnailFailed
                    ? <img src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} alt="" loading="lazy" onError={() => setThumbnailFailed(true)} />
                    : <span className="portfolio-video-placeholder"><Icon name="play" size={30} /></span>}
                {videoId && <span className="portfolio-video-play"><Icon name="play" size={18} /></span>}
            </button>}
        <div className="portfolio-video-info"><span>{videoId ? "YOUTUBE VIDEO" : "VIDEO LINK"}</span><h3>{title}</h3><a href={video.url} target="_blank" rel="noopener noreferrer">Open on YouTube</a></div>
    </article>;
}

export function PortfolioVideoGrid({ videos }: { videos: PortfolioVideo[] }) {
    return <div className="portfolio-video-grid">{videos.map((video, index) => <PortfolioVideoCard key={video.id || video.url || index} video={video} />)}</div>;
}
