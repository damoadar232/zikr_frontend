package com.zikrelahi.api.lyrics;

import com.fasterxml.jackson.databind.JsonNode;

public final class TiptapDocumentRules {

    private TiptapDocumentRules() {
    }

    public static void requirePersistable(JsonNode document) {
        TiptapDocumentValidator.validate(document);
    }
}