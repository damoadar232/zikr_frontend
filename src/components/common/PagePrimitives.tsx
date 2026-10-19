import { useEffect, useRef, useState, type ReactNode } from "react";
import { interfaceAttributeText, LocalizedText, useInterfaceText } from "../../app/providers/interfaceLanguage";
import { Icon } from "../ui";

type NavigateTo = (route: string) => void;

export function Breadcrumbs({ items, go }: { items: string[]; go: NavigateTo }) {
    const t = useInterfaceText();
    return <div className="breadcrumbs"><button onClick={() => go("home")}>{t("Home")}</button>{items.map((item, index) => <span key={item}><Icon name="chevron" size={13} /><b>{t(item)}</b>{index < items.length - 1 ? "" : ""}</span>)}</div>;
}

export function DirectoryHeader({ go, title, text }: { go: NavigateTo; title: string; text: string }) {
    const t = useInterfaceText();
    return <div className="cream-top"><div className="container"><Breadcrumbs items={[title]} go={go} /><span className="eyebrow"><LocalizedText text={"ZIKR-E-ILAHI LIBRARY"} /></span><h1>{t(title)}</h1><p>{t(text)}</p></div></div>;
}

export function PageHero({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children?: ReactNode }) {
    const t = useInterfaceText();
    return <section className="page-hero"><div className="container"><span className="eyebrow">{t(eyebrow)}</span><h1>{t(title)}</h1><p>{t(text)}</p>{children}</div></section>;
}

export function Tabs({ items, active, setActive }: { items: string[]; active: string; setActive: (value: string) => void }) {
    const t = useInterfaceText();
    return <div className="tabs" role="tablist">{items.map(item => <button key={item} type="button" role="tab" aria-selected={active === item} className={active === item ? "active" : ""} onClick={() => setActive(item)}>{t(item)}</button>)}</div>;
}

export function SearchBox({ value, setValue, placeholder = "Search by title, artist, writer..." }: { value: string; setValue: (value: string) => void; placeholder?: string }) {
    const t = useInterfaceText();
    const translatedPlaceholder = t(placeholder);
    return <label className="search-box"><Icon name="search" /><input value={value} onChange={event => setValue(event.target.value)} placeholder={translatedPlaceholder} aria-label={translatedPlaceholder} />{value && <button onClick={() => setValue("")} aria-label={t("Clear search")}><Icon name="x" size={16} /></button>}</label>;
}

export function CategoryBrowseControl({ items, value, onChange, label = "Browse" }: { items: string[]; value: string; onChange: (value: string) => void; label?: string }) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const t = useInterfaceText();

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    return <div className="lyrics-browse-wrap" ref={menuRef}>
        <button type="button" className="lyrics-browse-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`${label} categories`} onClick={() => setOpen(current => !current)}>{t(label)} <Icon name="chevron" size={14} /></button>
        {open && <div className="lyrics-browse-menu" role="menu" aria-label={`${label} categories`}>{items.map(item => <button key={item} type="button" role="menuitemradio" aria-checked={value === item} className={value === item ? "active" : ""} onClick={() => { onChange(item); setOpen(false); }}>{t(item)}</button>)}</div>}
    </div>;
}