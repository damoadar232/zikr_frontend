ALTER TABLE lyric_language_versions
    MODIFY COLUMN document JSON NULL;

ALTER TABLE lyric_language_versions
    ADD COLUMN content_format VARCHAR(20) NOT NULL DEFAULT 'TIPTAP_JSON';

ALTER TABLE lyric_language_versions
    ADD COLUMN html_content LONGTEXT NULL;

ALTER TABLE lyric_language_versions
    ADD CONSTRAINT ck_lyric_version_content_format
        CHECK (
            (content_format = 'TIPTAP_JSON' AND document IS NOT NULL AND html_content IS NULL)
            OR (content_format = 'HTML' AND document IS NULL AND html_content IS NOT NULL)
        );

ALTER TABLE lyric_revisions
    MODIFY COLUMN document_snapshot JSON NULL;

ALTER TABLE lyric_revisions
    ADD COLUMN content_format VARCHAR(20) NOT NULL DEFAULT 'TIPTAP_JSON';

ALTER TABLE lyric_revisions
    ADD COLUMN html_content_snapshot LONGTEXT NULL;

ALTER TABLE lyric_revisions
    ADD CONSTRAINT ck_lyric_revision_content_format
        CHECK (
            (content_format = 'TIPTAP_JSON' AND document_snapshot IS NOT NULL AND html_content_snapshot IS NULL)
            OR (content_format = 'HTML' AND document_snapshot IS NULL AND html_content_snapshot IS NOT NULL)
        );
