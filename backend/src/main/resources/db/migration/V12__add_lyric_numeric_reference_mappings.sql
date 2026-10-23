CREATE TABLE artist_numeric_mappings (
    id          BIGINT          NOT NULL AUTO_INCREMENT,
    artist_key  VARCHAR(120)    NOT NULL,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_artist_numeric_mappings PRIMARY KEY (id),
    CONSTRAINT uq_artist_numeric_mapping_key UNIQUE (artist_key),
    CONSTRAINT fk_artist_numeric_mapping_artist FOREIGN KEY (artist_key)
        REFERENCES artists (id) ON DELETE CASCADE
);

INSERT INTO artist_numeric_mappings (artist_key)
    SELECT id FROM artists ORDER BY id;

CREATE TABLE category_numeric_mappings (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    category_key    VARCHAR(80)     NOT NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_category_numeric_mappings PRIMARY KEY (id),
    CONSTRAINT uq_category_numeric_mapping_key UNIQUE (category_key),
    CONSTRAINT fk_category_numeric_mapping_category FOREIGN KEY (category_key)
        REFERENCES lyric_categories (id) ON DELETE RESTRICT
);

INSERT INTO category_numeric_mappings (category_key)
    SELECT id FROM lyric_categories ORDER BY id;

CREATE TABLE subject_numeric_mappings (
    id              BIGINT          NOT NULL AUTO_INCREMENT,
    subject_key     VARCHAR(80)     NOT NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_subject_numeric_mappings PRIMARY KEY (id),
    CONSTRAINT uq_subject_numeric_mapping_key UNIQUE (subject_key),
    CONSTRAINT fk_subject_numeric_mapping_subject FOREIGN KEY (subject_key)
        REFERENCES lyric_subjects (id) ON DELETE RESTRICT
);

INSERT INTO subject_numeric_mappings (subject_key)
    SELECT id FROM lyric_subjects ORDER BY id;
