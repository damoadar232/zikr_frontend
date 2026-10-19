export function textToLyricDocument(text = "") {
    return {
        type: "doc",
        content: String(text).replace(/\r/g, "").split("\n").map((line) => ({
            type: "paragraph",
            content: line ? [{ type: "text", text: line }] : [],
        })),
    };
}

export function isLyricDocument(value) {
    return !!value && value.type === "doc" && Array.isArray(value.content);
}

export function lyricDocumentToText(document) {
    if (!isLyricDocument(document)) return "";
    const readNode = (node) => {
        if (node.type === "text") return node.text || "";
        if (node.type === "hardBreak") return "\n";
        return (node.content || []).map(readNode).join("");
    };
    return document.content.map(readNode).join("\n");
}