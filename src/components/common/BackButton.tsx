import { useLocation, useNavigate } from "react-router-dom";
import { interfaceAttributeText, LocalizedText } from "../../app/providers/interfaceLanguage";
import { Icon } from "../ui";

function getFallbackRoute(routePath: string) {
    if (routePath === "lyric-detail") return "lyrics";
    if (routePath.startsWith("lyrics")) return "home";
    if (routePath === "surah-read") return "surahs";
    if (["surahs", "para", "quran-topics"].includes(routePath)) return "quran";
    if (routePath === "quran") return "home";
    if (routePath === "audio-detail") return "audio";
    if (routePath === "audio") return "home";
    if (routePath === "book-detail" || routePath === "book-reader") return "ebooks";
    if (routePath === "ebooks") return "home";
    if (routePath === "services" || routePath === "about" || routePath === "contact") return "home";
    return "home";
}

export function BackButton({ routePath }: { routePath: string }) {
    const location = useLocation();
    const navigate = useNavigate();
    const routeState = location.state as { zikrPrevious?: unknown } | null;
    const previousRoute = routeState?.zikrPrevious;
    const canReturnInApp = typeof previousRoute === "string"
        && previousRoute.startsWith("/")
        && previousRoute !== `${location.pathname}${location.search}`;

    return <button
        type="button"
        className="app-back-button"
        onClick={() => canReturnInApp ? navigate(-1) : navigate(`/${getFallbackRoute(routePath) === "home" ? "" : getFallbackRoute(routePath)}`)}
        aria-label={interfaceAttributeText("Back")}
    >
        <Icon name="chevron" size={17} />
        <LocalizedText text={"Back"} />
    </button>;
}
