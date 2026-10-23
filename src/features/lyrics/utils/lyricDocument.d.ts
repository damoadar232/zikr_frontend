import type { JSONContent } from "@tiptap/core";

export function textToLyricDocument(text?: string): JSONContent;
export function isLyricDocument(value: unknown): value is JSONContent;
export function lyricDocumentToText(document: JSONContent): string;
