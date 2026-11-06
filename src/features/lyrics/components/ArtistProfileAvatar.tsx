import { useEffect, useState } from "react";
import { Icon } from "../../../components/ui";
import "../../../assests/scss/lyrics-artist-profile-image.scss";

type ArtistProfileAvatarProps = {
    imageUrl?: string | null;
    size?: "inline" | "directory" | "popup" | "profile";
};

export function ArtistProfileAvatar({ imageUrl, size = "inline" }: ArtistProfileAvatarProps) {
    const [imageFailed, setImageFailed] = useState(false);
    const source = imageUrl?.trim() || "";

    useEffect(() => setImageFailed(false), [source]);

    return (
        <span className={`lyrics-artist-avatar lyrics-artist-avatar--${size}`} aria-hidden="true">
            {source && !imageFailed
                ? <img src={source} alt="" loading="lazy" onError={() => setImageFailed(true)} />
                : <Icon name="user" size={size === "profile" ? 36 : size === "directory" ? 21 : 15} />}
        </span>
    );
}
