import { useEffect } from "react";

const CANONICAL_ORIGIN = "https://www.zikreilahi.com";

type PageMetadataOptions = {
    canonicalPath?: string;
    robots?: string;
};

function setMetaContent(name: string, content: string | undefined) {
    const tags = document.head.querySelectorAll<HTMLMetaElement>(`meta[name="${name}"]`);
    const tag = tags[0] || document.createElement("meta");
    tags.forEach((duplicate) => {
        if (duplicate !== tag) duplicate.remove();
    });

    if (!content) {
        tag.remove();
        return;
    }

    tag.name = name;
    tag.content = content;
    if (!tag.isConnected) document.head.append(tag);
}

export function usePageMetadata(title: string, description: string, options: PageMetadataOptions = {}) {
    useEffect(() => {
        document.title = title;
        setMetaContent("description", description);
        setMetaContent("robots", options.robots);

        const canonicalTags = document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]');
        const canonicalTag = canonicalTags[0] || document.createElement("link");
        canonicalTags.forEach((duplicate) => {
            if (duplicate !== canonicalTag) duplicate.remove();
        });
        const canonicalUrl = new URL(options.canonicalPath || window.location.pathname, CANONICAL_ORIGIN);
        canonicalUrl.hash = "";
        canonicalTag.rel = "canonical";
        canonicalTag.href = canonicalUrl.toString();
        if (!canonicalTag.isConnected) document.head.append(canonicalTag);
    }, [description, options.canonicalPath, options.robots, title]);
}
