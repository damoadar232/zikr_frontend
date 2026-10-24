package com.zikrelahi.api.quran.importer;

/**
 * Summary returned after a successful commit.
 * `imported` = new Ayahs created.
 * `updated`  = retained for response compatibility; append-only import always returns 0.
 * `translationsCreated` = new translation rows inserted.
 * `translationsUpdated`  = retained for response compatibility; append-only import always returns 0.
 */
public record ImportSummary(
        int imported,
        int updated,
        int translationsCreated,
        int translationsUpdated) {}
