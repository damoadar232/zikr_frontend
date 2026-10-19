export function isAvailableDownloadUrl(value: string | undefined) {
    if (!value) return false;
    try {
        const url = new URL(value);
        if (url.protocol !== "https:") return false;
        if (url.hostname === "www.w3.org" && url.pathname.endsWith("/tests/xhtml/testfiles/resources/pdf/dummy.pdf")) return false;
        if (url.hostname === "www.soundhelix.com") return false;
        return true;
    } catch {
        return false;
    }
}