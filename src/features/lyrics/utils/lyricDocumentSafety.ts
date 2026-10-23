import type { JSONContent } from "@tiptap/core";

export const lyricFontFamilies = [
    "Noto Naskh Arabic",
    "Amiri",
    "Noto Nastaliq Urdu",
    "Noto Sans Arabic",
    "Noto Sans Devanagari",
    "Noto Serif Devanagari",
    "Noto Sans Tamil",
    "Noto Serif",
    "Inter",
    "Playfair Display",
] as const;

const allowedFontFamilies = new Set<string>(lyricFontFamilies);
const allowedFontSizes = new Set(["14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px"]);
const allowedParagraphSpacing = new Set(["8px", "16px", "24px", "32px"]);
const allowedTextMarks = new Set(["bold", "italic", "underline", "strike", "textStyle", "highlight"]);

function safeColor(value: unknown) {
    return typeof value === "string"
        && (/^#[\da-f]{3,8}$/i.test(value) || /^rgba?\([\d.%\s,]+\)$/i.test(value))
        ? value
        : null;
}

function sanitizeAttributes(type: string, value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const attributes = { ...(value as Record<string, unknown>) };
    if (type === "textStyle") {
        if (typeof attributes.fontFamily !== "string" || !allowedFontFamilies.has(attributes.fontFamily)) delete attributes.fontFamily;
        if (!allowedFontSizes.has(String(attributes.fontSize))) delete attributes.fontSize;
        if (attributes.color !== undefined) {
            const color = safeColor(attributes.color);
            if (color) attributes.color = color;
            else delete attributes.color;
        }
    } else if (type === "highlight" && attributes.color !== undefined) {
        const color = safeColor(attributes.color);
        if (color) attributes.color = color;
        else delete attributes.color;
    } else if (type === "paragraph" && !allowedParagraphSpacing.has(String(attributes.paragraphSpacing))) {
        delete attributes.paragraphSpacing;
    }
    return attributes;
}

export function sanitizeLyricDocument(document: JSONContent): JSONContent {
    const sanitizeNode = (node: JSONContent): JSONContent => ({
        ...node,
        ...(node.attrs ? { attrs: sanitizeAttributes(node.type || "", node.attrs) as Record<string, unknown> } : {}),
        ...(node.marks ? {
            marks: node.marks.filter((mark) => allowedTextMarks.has(mark.type)).map((mark) => ({
                ...mark,
                ...(mark.attrs ? { attrs: sanitizeAttributes(mark.type, mark.attrs) as Record<string, unknown> } : {}),
            })),
        } : {}),
        ...(node.content ? { content: node.content.map(sanitizeNode) } : {}),
    });
    return sanitizeNode(document);
}

export function sanitizePastedLyricHTML(html: string) {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    parsed.body.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach((node) => node.remove());
    for (const element of parsed.body.querySelectorAll<HTMLElement>("*")) {
        for (const attribute of Array.from(element.attributes)) {
            if (attribute.name === "style") continue;
            if (attribute.name === "dir" && ["ltr", "rtl", "auto"].includes(attribute.value)) continue;
            if (attribute.name === "lang" && /^[a-z]{2,3}(?:-[a-z0-9]+)*$/i.test(attribute.value)) continue;
            element.removeAttribute(attribute.name);
        }
        const style = element.style;
        const color = safeColor(style.color);
        const backgroundColor = safeColor(style.backgroundColor);
        const fontFamily = style.fontFamily.replace(/["']/g, "").trim();
        const fontSize = style.fontSize;
        const textAlign = style.textAlign;
        const marginBottom = style.marginBottom;
        element.removeAttribute("style");
        if (color) element.style.color = color;
        if (backgroundColor) element.style.backgroundColor = backgroundColor;
        if (allowedFontFamilies.has(fontFamily)) element.style.fontFamily = fontFamily;
        if (allowedFontSizes.has(fontSize)) element.style.fontSize = fontSize;
        if (["left", "center", "right", "justify"].includes(textAlign)) element.style.textAlign = textAlign;
        if (allowedParagraphSpacing.has(marginBottom)) element.style.marginBottom = marginBottom;
    }
    return parsed.body.innerHTML;
}
