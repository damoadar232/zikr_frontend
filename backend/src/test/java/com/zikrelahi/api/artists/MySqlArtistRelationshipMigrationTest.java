package com.zikrelahi.api.artists;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Testcontainers(disabledWithoutDocker = true)
class MySqlArtistRelationshipMigrationTest {

    @Container
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4");

    @Test
    void migrationPreservesNumericIdsAndBackfillsResolvableLegacyAssignments() {
        DataSource dataSource = new DriverManagerDataSource(
                mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
        verifyMigration(dataSource);
    }

    static void verifyMigration(DataSource dataSource) {
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target(MigrationVersion.fromVersion("12"))
                .load()
                .migrate();

        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        Long originalWriterMapping = jdbc.queryForObject("""
                SELECT id FROM artist_numeric_mappings WHERE artist_key = 'owais-raza-qadri'
                """, Long.class);
        jdbc.update("INSERT INTO artists (id, full_name, display_name, status) VALUES (?, ?, ?, ?)",
                "migration-writer", "Migration Writer", null, "ACTIVE");
        jdbc.update("INSERT INTO artist_roles (artist_id, role) VALUES (?, ?)",
                "migration-writer", "WRITER");
        jdbc.update("INSERT INTO artist_roles (artist_id, role) VALUES (?, ?)",
                "owais-raza-qadri", "WRITER");
        jdbc.update("""
                INSERT INTO lyrics (legacy_id, title, slug, artist_id, writer_id, writer_name, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, "migration-fixture", "Migration Fixture", "migration-fixture",
                "traditional", "owais-raza-qadri", "Owais Raza Qadri", "DRAFT");
        Long lyricId = jdbc.queryForObject(
                "SELECT id FROM lyrics WHERE legacy_id = 'migration-fixture'", Long.class);
        jdbc.update("INSERT INTO lyric_artist_ids (lyric_id, artist_id) VALUES (?, ?)",
                lyricId, "migration-writer");
        jdbc.update("INSERT INTO lyric_artist_ids (lyric_id, artist_id) VALUES (?, ?)",
                lyricId, "traditional");
        jdbc.update("INSERT INTO lyric_artist_ids (lyric_id, artist_id) VALUES (?, ?)",
                lyricId, "unresolved-legacy-artist");
        jdbc.update("INSERT INTO lyric_reciters (lyric_id, position, display_name) VALUES (?, ?, ?)",
                lyricId, 0, "Owais Raza Qadri");
        jdbc.update("INSERT INTO lyric_reciters (lyric_id, position, display_name) VALUES (?, ?, ?)",
                lyricId, 1, "Zohaib Ashrafi");
        jdbc.update("INSERT INTO lyric_reciters (lyric_id, position, display_name) VALUES (?, ?, ?)",
                lyricId, 2, "Unmatched Reciter");

        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target(MigrationVersion.fromVersion("13"))
                .load()
                .migrate();

        assertEquals(originalWriterMapping, jdbc.queryForObject(
                "SELECT id FROM artists WHERE artist_key = 'owais-raza-qadri'", Long.class));
        assertEquals(originalWriterMapping, jdbc.queryForObject(
                "SELECT id FROM artist_numeric_mappings WHERE artist_key = 'owais-raza-qadri'", Long.class));
        assertEquals(1, jdbc.queryForObject("""
                SELECT COUNT(*) FROM lyric_artist_ids la
                JOIN artists a ON a.id = la.artist_id
                WHERE la.lyric_id = ? AND a.artist_key = 'migration-writer' AND la.role = 'WRITER'
                """, Integer.class, lyricId));
        assertEquals(2, jdbc.queryForObject("""
                SELECT COUNT(*) FROM lyric_artist_ids la
                JOIN artists a ON a.id = la.artist_id
                WHERE la.lyric_id = ? AND a.artist_key = 'owais-raza-qadri'
                  AND la.role IN ('WRITER', 'RECITER')
                """, Integer.class, lyricId));
        assertEquals(3, jdbc.queryForObject("""
                SELECT COUNT(*) FROM lyric_artist_ids
                WHERE lyric_id = ? AND role = 'RECITER'
                """, Integer.class, lyricId));
        assertEquals(jdbc.queryForObject(
                        "SELECT id FROM artists WHERE artist_key = 'migration-writer'", Long.class),
                jdbc.queryForObject(
                        "SELECT id FROM artist_numeric_mappings WHERE artist_key = 'migration-writer'", Long.class));
        assertEquals(1, jdbc.queryForObject("""
                SELECT COUNT(*) FROM lyric_reciters
                WHERE lyric_id = ? AND display_name = 'Unmatched Reciter'
                """, Integer.class, lyricId));
        assertEquals(1, jdbc.queryForObject("""
                SELECT COUNT(*) FROM lyric_artist_ids_legacy
                WHERE lyric_id = ? AND artist_id = 'unresolved-legacy-artist'
                """, Integer.class, lyricId));
    }
}
