import { useId, useState } from "react";
import { getLyricArtistNames } from "../utils/lyricsPresentation";

export function ReciterDisclosure({ item }: { item: any }) {
    const names = getLyricArtistNames(item);
    const [open, setOpen] = useState(false);
    const listId = useId();
    if (names.length < 2) return <span>{names[0] || "Unknown artist"}</span>;

    const toggle = () => setOpen((value) => !value);
    return <span className="reciter-disclosure">
        <button type="button" aria-expanded={open} aria-controls={listId} onClick={(event) => { event.stopPropagation(); toggle(); }} onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                toggle();
            }
        }}>{names.length} people</button>
        {open && <ul id={listId} className="reciter-list">{names.map((name) => <li key={name}>{name}</li>)}</ul>}
    </span>;
}