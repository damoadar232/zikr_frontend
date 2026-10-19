import { createContext, useContext } from "react";
import { GLOBAL_LANGUAGE_KEY, readPreference, translateInterface } from "../../interfacePreferences";

export const InterfaceLanguageContext = createContext("en");

export function useInterfaceLanguage() {
    return useContext(InterfaceLanguageContext);
}

export function useInterfaceText() {
    const language = useInterfaceLanguage();
    return (value: string) => translateInterface(language, value);
}

export function interfaceAttributeText(value: string) {
    return translateInterface(readPreference(GLOBAL_LANGUAGE_KEY, "en"), value);
}

export function LocalizedText({ text, leading = "", trailing = "" }: { text: string; leading?: string; trailing?: string }) {
    const language = useInterfaceLanguage();
    const t = useInterfaceText();
    return <span className="localized-text" lang={language} dir={language === "ur" ? "rtl" : "ltr"}>{leading}{t(text)}{trailing}</span>;
}