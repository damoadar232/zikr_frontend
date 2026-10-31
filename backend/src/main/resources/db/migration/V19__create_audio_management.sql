CREATE TABLE languages (
    code          VARCHAR(20)  NOT NULL,
    name          VARCHAR(120) NOT NULL,
    native_name   VARCHAR(120) NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_languages PRIMARY KEY (code),
    CONSTRAINT uq_languages_name UNIQUE (name)
);

CREATE TABLE audio_categories (
    category_key  VARCHAR(80)  NOT NULL,
    name          VARCHAR(120) NOT NULL,
    description   TEXT         NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_audio_categories PRIMARY KEY (category_key),
    CONSTRAINT uq_audio_categories_name UNIQUE (name)
);

CREATE TABLE audios (
    id                       BIGINT        NOT NULL AUTO_INCREMENT,
    title                    VARCHAR(250)  NOT NULL,
    description              TEXT          NULL,
    language_code            VARCHAR(20)   NOT NULL,
    original_audio_filename  VARCHAR(255)  NULL,
    audio_url                VARCHAR(2048) NULL,
    audio_public_id          VARCHAR(255)  NULL,
    audio_format             VARCHAR(20)   NULL,
    audio_size               BIGINT        NULL,
    audio_duration_seconds   INT           NULL,
    original_cover_filename  VARCHAR(255)  NULL,
    cover_image_url          VARCHAR(2048) NULL,
    cover_image_public_id    VARCHAR(255)  NULL,
    cover_image_format       VARCHAR(20)   NULL,
    published_date           DATE          NULL,
    status                   VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    created_at               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_audios PRIMARY KEY (id),
    CONSTRAINT fk_audios_language FOREIGN KEY (language_code)
        REFERENCES languages (code) ON DELETE RESTRICT,
    CONSTRAINT ck_audios_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'INACTIVE'))
);

CREATE INDEX idx_audios_language ON audios (language_code);
CREATE INDEX idx_audios_status_published_date ON audios (status, published_date);

CREATE TABLE audio_category_assignments (
    audio_id     BIGINT      NOT NULL,
    category_id  VARCHAR(80) NOT NULL,
    CONSTRAINT pk_audio_category_assignments PRIMARY KEY (audio_id, category_id),
    CONSTRAINT fk_audio_category_audio FOREIGN KEY (audio_id)
        REFERENCES audios (id) ON DELETE RESTRICT,
    CONSTRAINT fk_audio_category_category FOREIGN KEY (category_id)
        REFERENCES audio_categories (category_key) ON DELETE RESTRICT
);

CREATE INDEX idx_audio_category_category ON audio_category_assignments (category_id, audio_id);

CREATE TABLE audio_artist_ids (
    audio_id    BIGINT      NOT NULL,
    artist_id   BIGINT      NOT NULL,
    role        VARCHAR(20) NOT NULL,
    position    INT         NOT NULL,
    CONSTRAINT pk_audio_artist_ids PRIMARY KEY (audio_id, artist_id, role),
    CONSTRAINT fk_audio_artist_audio FOREIGN KEY (audio_id)
        REFERENCES audios (id) ON DELETE RESTRICT,
    CONSTRAINT fk_audio_artist_artist FOREIGN KEY (artist_id)
        REFERENCES artists (id) ON DELETE RESTRICT,
    CONSTRAINT uq_audio_artist_position UNIQUE (audio_id, role, position),
    CONSTRAINT ck_audio_artist_role CHECK (role IN ('SINGER', 'WRITER')),
    CONSTRAINT ck_audio_artist_position CHECK (position >= 0)
);

CREATE INDEX idx_audio_artist_lookup ON audio_artist_ids (artist_id, role, audio_id);

INSERT INTO languages (code, name, native_name, is_active)
SELECT 'ur', 'Urdu', 'اردو', TRUE
WHERE NOT EXISTS (SELECT 1 FROM languages WHERE code = 'ur');

INSERT INTO languages (code, name, native_name, is_active)
SELECT 'hi', 'Hindi', 'हिन्दी', TRUE
WHERE NOT EXISTS (SELECT 1 FROM languages WHERE code = 'hi');

INSERT INTO languages (code, name, native_name, is_active)
SELECT 'en', 'English', 'English', TRUE
WHERE NOT EXISTS (SELECT 1 FROM languages WHERE code = 'en');

INSERT INTO languages (code, name, native_name, is_active)
SELECT 'ta', 'Tamil', 'தமிழ்', TRUE
WHERE NOT EXISTS (SELECT 1 FROM languages WHERE code = 'ta');

INSERT INTO audio_categories (category_key, name)
SELECT 'naat-sharif', 'Naat Sharif'
WHERE NOT EXISTS (SELECT 1 FROM audio_categories WHERE category_key = 'naat-sharif');

INSERT INTO audio_categories (category_key, name)
SELECT 'hamd', 'Hamd'
WHERE NOT EXISTS (SELECT 1 FROM audio_categories WHERE category_key = 'hamd');

INSERT INTO audio_categories (category_key, name)
SELECT 'durood-o-salam', 'Durood-o-Salam'
WHERE NOT EXISTS (SELECT 1 FROM audio_categories WHERE category_key = 'durood-o-salam');

INSERT INTO audio_categories (category_key, name)
SELECT 'sufi-kalam', 'Sufi Kalam'
WHERE NOT EXISTS (SELECT 1 FROM audio_categories WHERE category_key = 'sufi-kalam');

INSERT INTO audio_categories (category_key, name)
SELECT 'manqabat', 'Manqabat'
WHERE NOT EXISTS (SELECT 1 FROM audio_categories WHERE category_key = 'manqabat');

INSERT INTO audio_categories (category_key, name)
SELECT 'qawwali', 'Qawwali'
WHERE NOT EXISTS (SELECT 1 FROM audio_categories WHERE category_key = 'qawwali');
