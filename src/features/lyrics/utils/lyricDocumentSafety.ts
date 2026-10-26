import type { JSONContent } from "@tiptap/core";

export const lyricFontFamilies = [
    "Noto Nastaliq Urdu",
    "Noto Sans Devanagari",
    "DM Sans",
    "Georgia",
] as const;

const allowedFontFamilies = new Set<string>(lyricFontFamilies);
const allowedFontSizes = new Set(["14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px"]);
const allowedParagraphSpacing = new Set(["8px", "16px", "24px", "32px"]);
const allowedTextAlignments = new Set(["left", "center", "right", "justify"]);
const allowedTextMarks = new Set(["bold", "italic", "underline", "strike", "textStyle", "highlight"]);

function safeColor(value: unknown) {
    if (typeof value !== "string") return null;
    const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value);
    if (hex) {
        const digits = hex[1].length === 3
            ? [...hex[1]].map((digit) => `${digit}${digit}`).join("")
            : hex[1];
        return `#${digits.toUpperCase()}`;
    }

    const rgb = /^rgba?\(\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)(?:\s*,\s*([\d.]+%?))?\s*\)$/i.exec(value);
    if (!rgb || (rgb[4] !== undefined && Number(rgb[4].replace("%", "")) !== (rgb[4].endsWith("%") ? 100 : 1))) {
        return null;
    }

    const channels = rgb.slice(1, 4).map((channel) => {
        const percentage = channel.endsWith("%");
        const number = Number(channel.replace("%", ""));
        const maximum = percentage ? 100 : 255;
        if (!Number.isFinite(number) || number < 0 || number > maximum) return null;
        return Math.round(percentage ? number * 255 / 100 : number).toString(16).padStart(2, "0");
    });
    return channels.every((channel): channel is string => channel !== null)
        ? `#${channels.join("")}`.toUpperCase()
        : null;
}

function sanitizeAttributes(type: string, value: unknown, rejectInvalidColors: boolean) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    const attributes = { ...(value as Record<string, unknown>) };
    if (type === "textStyle") {
        if (typeof attributes.fontFamily !== "string" || !allowedFontFamilies.has(attributes.fontFamily)) delete attributes.fontFamily;
        if (!allowedFontSizes.has(String(attributes.fontSize))) delete attributes.fontSize;
        if (attributes.color !== undefined) {
            const color = safeColor(attributes.color);
            if (attributes.color === null) delete attributes.color;
            else if (color) attributes.color = color;
            else if (rejectInvalidColors) throw new Error("Text color must be a six-digit hexadecimal color.");
            else delete attributes.color;
        }
    } else if (type === "highlight" && attributes.color !== undefined) {
        const color = safeColor(attributes.color);
        if (attributes.color === null) delete attributes.color;
        else if (color) attributes.color = color;
        else if (rejectInvalidColors) throw new Error("Highlight color must be a six-digit hexadecimal color.");
        else delete attributes.color;
    } else if (type === "paragraph") {
        if (!allowedParagraphSpacing.has(String(attributes.paragraphSpacing))) delete attributes.paragraphSpacing;
        if (!allowedTextAlignments.has(String(attributes.textAlign))) delete attributes.textAlign;
    }
    return attributes;
}

export function sanitizeLyricDocument(
    document: JSONContent,
    { rejectInvalidColors = false }: { rejectInvalidColors?: boolean } = {},
): JSONContent {
    const sanitizeNode = (node: JSONContent): JSONContent => {
        const { marks: originalMarks, ...nodeWithoutMarks } = node;
        const marks = node.type === "hardBreak" ? undefined : originalMarks?.flatMap((mark) => {
            if (!allowedTextMarks.has(mark.type)) return [];
            const attrs = mark.attrs
                ? sanitizeAttributes(mark.type, mark.attrs, rejectInvalidColors) as Record<string, unknown>
                : undefined;
            if (mark.type === "textStyle" && (!attrs || Object.keys(attrs).length === 0)) return [];
            return [{ ...mark, ...(attrs ? { attrs } : {}) }];
        });
        return {
            ...nodeWithoutMarks,
            ...(node.attrs ? { attrs: sanitizeAttributes(node.type || "", node.attrs, rejectInvalidColors) as Record<string, unknown> } : {}),
            ...(marks?.length ? { marks } : {}),
            ...(node.content ? { content: node.content.map(sanitizeNode) } : {}),
        };
    };
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
        if (allowedTextAlignments.has(textAlign)) element.style.textAlign = textAlign;
        if (allowedParagraphSpacing.has(marginBottom)) element.style.marginBottom = marginBottom;
    }
    return parsed.body.innerHTML;
}
