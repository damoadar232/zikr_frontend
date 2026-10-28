ALTER TABLE translations
    ADD CONSTRAINT uq_translation_per_translator
        UNIQUE (surah_number, ayah_number, language_code, translator_id);

ALTER TABLE translations
    DROP INDEX uq_translation_per_language;

CREATE INDEX idx_translations_translator_publication
    ON translations (translator_id, status, surah_number, ayah_number);
