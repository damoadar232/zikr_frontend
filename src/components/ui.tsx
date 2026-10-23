import type { ReactNode } from "react";
import logoImage from "../assests/logo.png";
import { GLOBAL_LANGUAGE_KEY } from "../interfacePreferences";
import { LocalizedText, useInterfaceText } from "../app/providers/interfaceLanguage";

export type IconName =
    | "search" | "menu" | "x" | "arrow" | "book" | "play" | "headphones"
    | "pen" | "layers" | "download" | "copy" | "share" | "user" | "mail"
    | "grid" | "volume" | "chevron" | "heart" | "eye" | "check";

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
    const paths: Record<IconName, ReactNode> = {
        search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
        menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
        x: <><path d="m6 6 12 12M18 6 6 18" /></>,
        arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
        book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22zM20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22z" /></>,
        play: <path d="m9 7 8 5-8 5z" />,
        headphones: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1z" /></>,
        pen: <><path d="m4 20 4-1 10-10-3-3L5 16zM13.5 7.5l3 3" /></>,
        layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
        download: <><path d="M12 3v12m-4-4 4 4 4-4M5 20h14" /></>,
        copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
        share: <><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 11 8-5M8 13l8 5" /></>,
        user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
        mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
        grid: <><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><rect x="14" y="14" width="6" height="6" /></>,
        volume: <><path d="M5 10v4h4l5 4V6l-5 4z" /><path d="M17 9a4 4 0 0 1 0 6" /></>,
        chevron: <path d="m9 6 6 6-6 6" />,
        heart: <path d="M20.8 5.7a5.4 5.4 0 0 0-7.6 0L12 6.9l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 22l8.8-8.7a5.4 5.4 0 0 0 0-7.6z" />,
        eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
        check: <path d="m5 12 4 4L19 6" />,
    };
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function Logo({ compact = false }: { compact?: boolean }) {
    return <div className={`logo${compact ? " compact" : ""}`}><img className="logo-image" src={logoImage} alt="Zikr-e-Ilahi" /></div>;
}

export function Btn({ children, onClick, variant = "primary", icon, type = "button", disabled = false }: { children: ReactNode; onClick?: () => void; variant?: string; icon?: IconName; type?: "button" | "submit"; disabled?: boolean }) {
    const t = useInterfaceText();
    const label = typeof children === "string" ? t(children) : children;
    return <button type={type} className={`btn btn-${variant}`} onClick={onClick} disabled={disabled}>{label}{icon && <Icon name={icon} size={17} />}</button>;
}

export function InterfaceControls({ language, setLanguage, fontScale, setFontScale }: { language: string; setLanguage: (value: string) => void; fontScale: number; setFontScale: (value: number) => void }) {
    const t = useInterfaceText();
    return <div className="interface-controls">
        <label className="interface-language"><span className="sr-only">{t("Language")}</span><select aria-label={t("Language")} value={language} onChange={(event) => { const value = event.target.value; try { window.localStorage.setItem(GLOBAL_LANGUAGE_KEY, value); } catch { /* Storage is optional. */ } setLanguage(value); }}><option value="en">EN</option><option value="hi">हिन्दी</option><option value="ur">اردو</option></select></label>
        <button className="interface-control" aria-label={t("Decrease font size")} title={t("Decrease font size")} onClick={() => setFontScale(Math.max(0.9, Number((fontScale - 0.1).toFixed(2))))}><LocalizedText text={"A−"} /></button>
        <button className="interface-control" aria-label={t("Increase font size")} title={t("Increase font size")} onClick={() => setFontScale(Math.min(1.2, Number((fontScale + 0.1).toFixed(2))))}><LocalizedText text={"A+"} /></button>
    </div>;
}

export function SectionThemeControl({ theme, setTheme }: { theme: string; setTheme: (value: string) => void }) {
    const t = useInterfaceText();
    const nextTheme = theme === "dark" ? "light" : "dark";
    return <button className="interface-control section-theme-toggle" aria-label={t(theme === "dark" ? "Light theme" : "Dark theme")} title={t(theme === "dark" ? "Light theme" : "Dark theme")} onClick={() => setTheme(nextTheme)}>
        {theme === "dark" ? "☼" : "◐"}
        <span><LocalizedText text={theme === "dark" ? "Light theme" : "Dark theme"} /></span>
    </button>;
}