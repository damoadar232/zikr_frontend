package com.zikrelahi.api.lyrics;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
class MySqlLyricMigrationTest {

    @Container
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4");

    @DynamicPropertySource
    static void configureDataSource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
        registry.add("spring.datasource.driver-class-name", mysql::getDriverClassName);
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void flywayAppliesLyricsAndArtistMigrationsWithoutSeedingLyrics() {
        assertEquals(9, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '9' AND success = TRUE", Integer.class));
        assertEquals(10, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '10' AND success = TRUE", Integer.class));
        assertEquals(6, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM lyric_categories", Integer.class));
        assertEquals(8, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM lyric_subjects", Integer.class));
        assertEquals(0, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM lyrics", Integer.class));
        assertEquals(3, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM artists", Integer.class));
        assertEquals(8, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM artist_roles", Integer.class));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM artists WHERE artist_key = 'owais-raza-qadri'", Integer.class));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM artists WHERE artist_key = 'zohaib-ashrafi'", Integer.class));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM artists WHERE artist_key = 'traditional'", Integer.class));
        assertEquals("json", jdbcTemplate.queryForObject(
                "SELECT data_type FROM information_schema.columns WHERE table_schema = DATABASE() " +
                        "AND table_name = 'lyric_language_versions' AND column_name = 'document'",
                String.class));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '11' AND success = TRUE",
                Integer.class));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() " +
                        "AND table_name = 'lyric_language_versions' AND column_name = 'content_format'",
                Integer.class));
        assertEquals("TIPTAP_JSON", jdbcTemplate.queryForObject(
                "SELECT column_default FROM information_schema.columns WHERE table_schema = DATABASE() " +
                        "AND table_name = 'lyric_language_versions' AND column_name = 'content_format'",
                String.class));
        assertEquals(2, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() " +
                        "AND table_name = 'lyric_revisions' AND column_name IN " +
                        "('content_format', 'html_content_snapshot')",
                Integer.class));
        assertEquals("TIPTAP_JSON", jdbcTemplate.queryForObject(
                "SELECT column_default FROM information_schema.columns WHERE table_schema = DATABASE() " +
                        "AND table_name = 'lyric_revisions' AND column_name = 'content_format'",
                String.class));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '12' AND success = TRUE",
                Integer.class));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '14' AND success = TRUE",
                Integer.class));
        assertEquals(2, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() " +
                        "AND table_name = 'lyrics' AND column_name IN ('artist_id', 'writer_id') " +
                        "AND data_type = 'bigint'",
                Integer.class));
        assertEquals(2, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() " +
                        "AND table_name = 'lyrics' AND column_name IN ('artist_id_legacy', 'writer_id_legacy')",
                Integer.class));
        assertEquals(2, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.key_column_usage WHERE table_schema = DATABASE() " +
                        "AND table_name = 'lyrics' AND constraint_name IN " +
                        "('fk_lyrics_artist_numeric', 'fk_lyrics_writer_numeric')",
                Integer.class));
        assertEquals(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM artists", Integer.class),
                jdbcTemplate.queryForObject("SELECT COUNT(*) FROM artist_numeric_mappings", Integer.class));
        assertEquals(1L, jdbcTemplate.queryForObject(
                "SELECT id FROM artists WHERE artist_key = 'owais-raza-qadri'", Long.class));
        assertEquals("bigint", jdbcTemplate.queryForObject(
                "SELECT data_type FROM information_schema.columns WHERE table_schema = DATABASE() " +
                        "AND table_name = 'artists' AND column_name = 'id'",
                String.class));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() " +
                        "AND table_name = 'lyric_artist_ids' AND column_name IN ('role', 'position')",
                Integer.class));
        assertEquals(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM lyric_categories", Integer.class),
                jdbcTemplate.queryForObject("SELECT COUNT(*) FROM category_numeric_mappings", Integer.class));
        assertEquals(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM lyric_subjects", Integer.class),
                jdbcTemplate.queryForObject("SELECT COUNT(*) FROM subject_numeric_mappings", Integer.class));
    }
}