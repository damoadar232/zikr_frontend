import { useState } from "react";
import { interfaceAttributeText } from "../../app/providers/interfaceLanguage";
import { translateInterface } from "../../interfacePreferences";
import { Icon, InterfaceControls, Logo } from "../ui";

export function Header({ route, go, language, setLanguage, theme, setTheme, fontScale, setFontScale }: { route: string; go: (route: string) => void; language: string; setLanguage: (value: string) => void; theme: string; setTheme: (value: string) => void; fontScale: number; setFontScale: (value: number) => void }) {
    const [open, setOpen] = useState(false);
    const nav = [["Lyrics", "lyrics"], ["Quran", "quran"], ["Audio", "audio"], ["Services", "services"], ["E-Books", "ebooks"], ["About Us", "about"], ["Contact Us", "contact"]];
    const t = (key: string) => translateInterface(language, key);
    return <>
        <header className="header">
            <button className="brand-button" onClick={() => go("home")} aria-label={interfaceAttributeText("Zikr-e-Ilahi home")}><Logo /></button>
            <nav className="desktop-nav" aria-label={interfaceAttributeText("Main navigation")} lang={language} dir={language === "ur" ? "rtl" : "ltr"}>
                {nav.map(([label, key]) => <button key={key} onClick={() => go(key)} className={route === key ? "active" : ""}>{t(label)}</button>)}
            </nav>
            <div className="header-actions">
                <InterfaceControls language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} fontScale={fontScale} setFontScale={setFontScale} />
                <button className="login-link" onClick={() => go("login")}><Icon name="user" size={16} /> {t("Register / Login")}</button>
                <button className="menu-btn" onClick={() => setOpen(!open)} aria-label={interfaceAttributeText("Toggle menu")}><Icon name={open ? "x" : "menu"} /></button>
            </div>
            {open && <nav className="mobile-nav">{nav.map(([label, key]) => <button key={key} onClick={() => { go(key); setOpen(false); }}>{t(label)}</button>)}<button onClick={() => { go("login"); setOpen(false); }}>{t("Register / Login")}</button><InterfaceControls language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} fontScale={fontScale} setFontScale={setFontScale} /></nav>}
        </header>
    </>;
}