import { splitLyricTitle } from "../utils/lyricTitle.js";

export function LyricTitle({ title }: { title: string }) {
    const parts = splitLyricTitle(title);
    if (!parts) return <>{title}</>;

    return <>
        <span className="lyric-title-primary" lang="hi" dir="ltr">{parts.primary}</span>
        <span className="lyric-title-secondary" lang="en" dir="ltr">{parts.secondary}</span>
    </>;
}
