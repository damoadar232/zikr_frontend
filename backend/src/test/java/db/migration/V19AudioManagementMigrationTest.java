package db.migration;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.fail;

class V19AudioManagementMigrationTest {

    private static final String MIGRATION = "db/migration/V19__create_audio_management.sql";

    @Test
    void createsAudioSchemaSeedsAndRelationshipsIdempotently() throws Exception {
        String databaseName = "audio_v19_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection connection = DriverManager.getConnection(
                "jdbc:h2:mem:" + databaseName + ";MODE=MySQL")) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("CREATE TABLE artists (id BIGINT NOT NULL PRIMARY KEY)");
                statement.execute("INSERT INTO artists (id) VALUES (1)");
            }

            ClassPathResource migration = new ClassPathResource(MIGRATION);
            ScriptUtils.executeSqlScript(connection, new EncodedResource(migration, StandardCharsets.UTF_8));

            String migrationSql;
            try (var input = migration.getInputStream()) {
                migrationSql = new String(input.readAllBytes(), StandardCharsets.UTF_8);
            }
            reapplySeedStatements(connection, migrationSql);

            assertEquals(4, count(connection, "languages"));
            assertEquals(6, count(connection, "audio_categories"));
            assertEquals(Set.of("ur", "hi", "en", "ta"), values(connection, "SELECT code FROM languages"));
            assertEquals(
                    Set.of("naat-sharif", "hamd", "durood-o-salam", "sufi-kalam", "manqabat", "qawwali"),
                    values(connection, "SELECT category_key FROM audio_categories"));
            assertEquals("Urdu", languageName(connection, "ur"));
            assertEquals("Hindi", languageName(connection, "hi"));
            assertEquals("English", languageName(connection, "en"));
            assertEquals("Tamil", languageName(connection, "ta"));
            assertEquals("Naat Sharif", categoryName(connection, "naat-sharif"));
            assertEquals("Hamd", categoryName(connection, "hamd"));
            assertEquals("Durood-o-Salam", categoryName(connection, "durood-o-salam"));
            assertEquals("Sufi Kalam", categoryName(connection, "sufi-kalam"));
            assertEquals("Manqabat", categoryName(connection, "manqabat"));
            assertEquals("Qawwali", categoryName(connection, "qawwali"));

            assertEquals(Set.of("CODE"), primaryKeyColumns(connection, "LANGUAGES"));
            assertEquals(Set.of("ID"), primaryKeyColumns(connection, "AUDIOS"));
            assertEquals(Set.of("CATEGORY_KEY"), primaryKeyColumns(connection, "AUDIO_CATEGORIES"));
            assertEquals(
                    Set.of("AUDIO_ID", "CATEGORY_ID"),
                    primaryKeyColumns(connection, "AUDIO_CATEGORY_ASSIGNMENTS"));
            assertEquals(
                    Set.of("AUDIO_ID", "ARTIST_ID", "ROLE"),
                    primaryKeyColumns(connection, "AUDIO_ARTIST_IDS"));

            assertForeignKey(connection, "AUDIOS", "LANGUAGE_CODE", "LANGUAGES", "CODE");
            assertForeignKey(connection, "AUDIO_CATEGORY_ASSIGNMENTS", "AUDIO_ID", "AUDIOS", "ID");
            assertForeignKey(
                    connection,
                    "AUDIO_CATEGORY_ASSIGNMENTS",
                    "CATEGORY_ID",
                    "AUDIO_CATEGORIES",
                    "CATEGORY_KEY");
            assertForeignKey(connection, "AUDIO_ARTIST_IDS", "AUDIO_ID", "AUDIOS", "ID");
            assertForeignKey(connection, "AUDIO_ARTIST_IDS", "ARTIST_ID", "ARTISTS", "ID");
            assertEquals(1, count(connection, "artists"), "The migration must not change Artist records.");

            long audioId;
            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate(
                        "INSERT INTO audios (title, language_code, status) VALUES ('constraint test', 'ur', 'DRAFT')",
                        Statement.RETURN_GENERATED_KEYS);
                try (ResultSet keys = statement.getGeneratedKeys()) {
                    keys.next();
                    audioId = keys.getLong(1);
                }
            }
            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate(
                        "INSERT INTO audio_category_assignments (audio_id, category_id) VALUES ("
                                + audioId + ", 'hamd')");
                assertThrows(SQLException.class, () -> statement.executeUpdate(
                        "INSERT INTO audio_category_assignments (audio_id, category_id) VALUES ("
                                + audioId + ", 'hamd')"));

                statement.executeUpdate(
                        "INSERT INTO audio_artist_ids (audio_id, artist_id, role, position) VALUES ("
                                + audioId + ", 1, 'SINGER', 0)");
                assertThrows(SQLException.class, () -> statement.executeUpdate(
                        "INSERT INTO audio_artist_ids (audio_id, artist_id, role, position) VALUES ("
                                + audioId + ", 1, 'SINGER', 1)"));
            }
        }
    }

    private static void reapplySeedStatements(Connection connection, String migrationSql) throws Exception {
        Matcher matcher = Pattern.compile(
                "(?is)INSERT INTO (?:languages|audio_categories).*?;")
                .matcher(migrationSql);
        try (Statement statement = connection.createStatement()) {
            while (matcher.find()) {
                statement.execute(matcher.group().substring(0, matcher.group().length() - 1));
            }
        }
    }

    private static int count(Connection connection, String table) throws Exception {
        try (Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            result.next();
            return result.getInt(1);
        }
    }

    private static Set<String> values(Connection connection, String query) throws Exception {
        Set<String> values = new HashSet<>();
        try (Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery(query)) {
            while (result.next()) {
                values.add(result.getString(1));
            }
        }
        return values;
    }

    private static String languageName(Connection connection, String code) throws Exception {
        try (var statement = connection.prepareStatement("SELECT name FROM languages WHERE code = ?")) {
            statement.setString(1, code);
            try (ResultSet result = statement.executeQuery()) {
                result.next();
                return result.getString(1);
            }
        }
    }

    private static String categoryName(Connection connection, String categoryKey) throws Exception {
        try (var statement = connection.prepareStatement(
                "SELECT name FROM audio_categories WHERE category_key = ?")) {
            statement.setString(1, categoryKey);
            try (ResultSet result = statement.executeQuery()) {
                result.next();
                return result.getString(1);
            }
        }
    }

    private static Set<String> primaryKeyColumns(Connection connection, String table) throws Exception {
        Set<String> columns = new HashSet<>();
        DatabaseMetaData metadata = connection.getMetaData();
        try (ResultSet keys = metadata.getPrimaryKeys(null, "PUBLIC", table)) {
            while (keys.next()) {
                columns.add(keys.getString("COLUMN_NAME").toUpperCase(Locale.ROOT));
            }
        }
        return columns;
    }

    private static void assertForeignKey(
            Connection connection,
            String table,
            String column,
            String referencedTable,
            String referencedColumn) throws Exception {
        DatabaseMetaData metadata = connection.getMetaData();
        try (ResultSet keys = metadata.getImportedKeys(null, "PUBLIC", table)) {
            while (keys.next()) {
                if (column.equalsIgnoreCase(keys.getString("FKCOLUMN_NAME"))
                        && referencedTable.equalsIgnoreCase(keys.getString("PKTABLE_NAME"))
                        && referencedColumn.equalsIgnoreCase(keys.getString("PKCOLUMN_NAME"))) {
                    return;
                }
            }
        }
        fail("Missing foreign key " + table + "." + column
                + " -> " + referencedTable + "." + referencedColumn);
    }
}
