CREATE TABLE ebooks (
    id                       BIGINT        NOT NULL AUTO_INCREMENT,
    title                    VARCHAR(255)  NOT NULL,
    description              VARCHAR(1200) NOT NULL,
    language_code            VARCHAR(20)   NOT NULL,
    original_cover_filename  VARCHAR(255)  NOT NULL,
    cover_image_url          VARCHAR(1000) NOT NULL,
    cover_image_public_id    VARCHAR(255)  NOT NULL,
    cover_image_format       VARCHAR(20)   NOT NULL,
    cover_image_size         BIGINT        NOT NULL,
    original_book_filename   VARCHAR(255)  NOT NULL,
    book_file_url            VARCHAR(1000) NOT NULL,
    book_file_public_id      VARCHAR(255)  NOT NULL,
    book_file_format         VARCHAR(20)   NOT NULL,
    book_file_size           BIGINT        NOT NULL,
    published_date           DATE          NOT NULL,
    status                   VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    created_at               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_ebooks PRIMARY KEY (id),
    CONSTRAINT fk_ebooks_language FOREIGN KEY (language_code)
        REFERENCES languages (code) ON DELETE RESTRICT,
    CONSTRAINT ck_ebooks_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'INACTIVE'))
);

CREATE INDEX idx_ebooks_status ON ebooks (status);
CREATE INDEX idx_ebooks_language ON ebooks (language_code);
CREATE INDEX idx_ebooks_published_date ON ebooks (published_date);
CREATE INDEX idx_ebooks_title ON ebooks (title);

CREATE TABLE ebook_categories (
    category_key  VARCHAR(80)  NOT NULL,
    name          VARCHAR(150) NOT NULL,
    description   VARCHAR(500) NULL,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_ebook_categories PRIMARY KEY (category_key),
    CONSTRAINT uq_ebook_categories_name UNIQUE (name)
);

CREATE TABLE ebook_category_assignments (
    ebook_id      BIGINT      NOT NULL,
    category_key  VARCHAR(80) NOT NULL,
    CONSTRAINT pk_ebook_category_assignments PRIMARY KEY (ebook_id, category_key),
    CONSTRAINT fk_ebook_category_ebook FOREIGN KEY (ebook_id)
        REFERENCES ebooks (id) ON DELETE RESTRICT,
    CONSTRAINT fk_ebook_category_category FOREIGN KEY (category_key)
        REFERENCES ebook_categories (category_key) ON DELETE RESTRICT
);

CREATE INDEX idx_ebook_category_category ON ebook_category_assignments (category_key, ebook_id);

CREATE TABLE ebook_author_ids (
    ebook_id    BIGINT NOT NULL,
    artist_id   BIGINT NOT NULL,
    position    INT    NOT NULL DEFAULT 0,
    CONSTRAINT pk_ebook_author_ids PRIMARY KEY (ebook_id, artist_id),
    CONSTRAINT fk_ebook_author_ebook FOREIGN KEY (ebook_id)
        REFERENCES ebooks (id) ON DELETE RESTRICT,
    CONSTRAINT fk_ebook_author_artist FOREIGN KEY (artist_id)
        REFERENCES artists (id) ON DELETE RESTRICT,
    CONSTRAINT uq_ebook_author_position UNIQUE (ebook_id, position),
    CONSTRAINT ck_ebook_author_position CHECK (position >= 0)
);

CREATE INDEX idx_ebook_author_artist ON ebook_author_ids (artist_id, ebook_id);

INSERT IGNORE INTO ebook_categories (category_key, name) VALUES
    ('islamic-books', 'Islamic Books'),
    ('naat-books', 'Naat Books'),
    ('ala-hazrat-books', 'Ala Hazrat Books'),
    ('durood-o-salam', 'Durood-o-Salam'),
    ('dua-books', 'Dua Books');
