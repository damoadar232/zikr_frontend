ALTER TABLE artists
    ADD COLUMN profile_image_url VARCHAR(1000) NULL,
    ADD COLUMN profile_image_public_id VARCHAR(255) NULL,
    ADD COLUMN profile_image_format VARCHAR(20) NULL,
    ADD COLUMN profile_image_size BIGINT NULL,
    ADD COLUMN original_profile_image_filename VARCHAR(255) NULL;
