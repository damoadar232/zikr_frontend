package com.zikrelahi.api.lyrics;

import com.fasterxml.jackson.databind.JsonNode;

final class LyricContentRules {

    private LyricContentRules() {
    }

    static void requireValid(LyricContentFormat format, JsonNode document, String html) {
        if (format == null) {
            throw new IllegalArgumentException("A lyric content format is required.");
        }
        if (format == LyricContentFormat.TIPTAP_JSON) {
            if (html != null) {
                throw new IllegalArgumentException("Tiptap JSON content cannot include HTML.");
            }
            TiptapDocumentRules.requirePersistable(document);
            return;
        }
        if (document != null) {
            throw new IllegalArgumentException("HTML content cannot include a Tiptap document.");
        }
        HtmlTranslationSanitizer.ValidatedHtml validated = HtmlTranslationSanitizer.validatePersisted(html);
        if (!validated.html().equals(html)) {
            throw new IllegalArgumentException("Persisted HTML content must already be sanitized.");
        }
    }
}
