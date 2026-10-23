export function splitLyricTitle(title) {
    const separator = title.indexOf("/");
    if (separator < 0) return null;

    const primary = title.slice(0, separator).trim();
    const secondary = title.slice(separator + 1).trim();
    return primary && secondary ? { primary, secondary } : null;
}
