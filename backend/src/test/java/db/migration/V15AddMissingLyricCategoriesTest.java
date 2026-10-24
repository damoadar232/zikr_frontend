package db.migration;

import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class V15AddMissingLyricCategoriesTest {

    private static final Map<String, Long> EXPECTED_MAPPINGS = Map.of(
            "durood-o-salam", 1L,
            "hamd", 2L,
            "manqabat", 3L,
            "naat-sharif", 4L,
            "qawwali", 5L,
            "sufi-kalam", 6L,
            "dua", 7L,
            "other-kalam", 8L,
            "tazmeen", 9L);

    @Test
    void addsOnlyMissingRecordsAfterTheSixCategoryV12History() throws Exception {
        try (Connection connection = connection()) {
            createSchema(connection);
            seedV12CategoriesAndMappings(connection);
            seedExistingLyricAssignment(connection);

            V15__add_missing_lyric_categories.apply(connection);

            assertEquals(9, readCategories(connection).size());
            assertEquals(EXPECTED_MAPPINGS, readMappings(connection));
            assertEquals(1, scalar(connection,
                    "SELECT COUNT(*) FROM lyric_category_assignments WHERE lyric_id = 41 AND category_id = 'hamd'"));
        }
    }

    @Test
    void acceptsExactPreexistingCategoriesAndMappingsWithoutChangingThem() throws Exception {
        try (Connection connection = connection()) {
            createSchema(connection);
            seedAllCategoriesAndMappings(connection);
            Map<String, String> categoriesBefore = readCategories(connection);
            Map<String, Long> mappingsBefore = readMappings(connection);

            V15__add_missing_lyric_categories.apply(connection);

            assertEquals(categoriesBefore, readCategories(connection));
            assertEquals(mappingsBefore, readMappings(connection));
        }
    }

    @Test
    void fillsMissingMappingsAndCategoriesAroundExactPartialRecords() throws Exception {
        try (Connection connection = connection()) {
            createSchema(connection);
            seedV12CategoriesAndMappings(connection);
            insertCategory(connection, "dua", "Dua");
            insertMapping(connection, 7, "dua");

            V15__add_missing_lyric_categories.apply(connection);

            assertEquals(EXPECTED_MAPPINGS, readMappings(connection));
            assertEquals("Dua", readCategories(connection).get("dua"));
            assertEquals("Other Kalam", readCategories(connection).get("other-kalam"));
            assertEquals("Tazmeen", readCategories(connection).get("tazmeen"));
        }
    }

    @Test
    void doesNotRecreateMissingHistoricalCategories() throws Exception {
        try (Connection connection = connection()) {
            createSchema(connection);
            seedV12CategoriesAndMappings(connection);
            try (Statement statement = connection.createStatement()) {
                statement.execute("DELETE FROM category_numeric_mappings WHERE category_key = 'hamd'");
                statement.execute("DELETE FROM lyric_categories WHERE id = 'hamd'");
            }
            Map<String, String> categoriesBefore = readCategories(connection);
            Map<String, Long> mappingsBefore = readMappings(connection);

            IllegalStateException error = assertThrows(IllegalStateException.class,
                    () -> V15__add_missing_lyric_categories.apply(connection));

            assertTrue(error.getMessage().contains("required existing category 'hamd'"));
            assertEquals(categoriesBefore, readCategories(connection));
            assertEquals(mappingsBefore, readMappings(connection));
        }
    }

    @Test
    void rejectsExistingCategoryKeyMappedToUnexpectedNumericIdBeforeWriting() throws Exception {
        try (Connection connection = connection()) {
            createSchema(connection);
            seedV12CategoriesAndMappings(connection);
            insertCategory(connection, "dua", "Dua");
            insertMapping(connection, 70, "dua");
            Map<String, String> categoriesBefore = readCategories(connection);
            Map<String, Long> mappingsBefore = readMappings(connection);

            IllegalStateException error = assertThrows(IllegalStateException.class,
                    () -> V15__add_missing_lyric_categories.apply(connection));

            assertTrue(error.getMessage().contains("category key 'dua'"));
            assertEquals(categoriesBefore, readCategories(connection));
            assertEquals(mappingsBefore, readMappings(connection));
        }
    }

    @Test
    void rejectsNumericIdOccupiedByAnotherCategoryBeforeWriting() throws Exception {
        try (Connection connection = connection()) {
            createSchema(connection);
            seedV12CategoriesAndMappings(connection);
            insertCategory(connection, "custom-category", "Custom Category");
            insertMapping(connection, 7, "custom-category");
            Map<String, String> categoriesBefore = readCategories(connection);
            Map<String, Long> mappingsBefore = readMappings(connection);

            IllegalStateException error = assertThrows(IllegalStateException.class,
                    () -> V15__add_missing_lyric_categories.apply(connection));

            assertTrue(error.getMessage().contains("numeric category ID 7"));
            assertEquals(categoriesBefore, readCategories(connection));
            assertEquals(mappingsBefore, readMappings(connection));
        }
    }

    @Test
    void rejectsCategoryIdOrNameConflictsWithoutOverwritingRecords() throws Exception {
        try (Connection connection = connection()) {
            createSchema(connection);
            seedV12CategoriesAndMappings(connection);
            insertCategory(connection, "dua", "Not Dua");
            Map<String, String> categoriesBefore = readCategories(connection);

            IllegalStateException error = assertThrows(IllegalStateException.class,
                    () -> V15__add_missing_lyric_categories.apply(connection));

            assertTrue(error.getMessage().contains("category ID 'dua'"));
            assertEquals(categoriesBefore, readCategories(connection));
        }

        try (Connection connection = connection()) {
            createSchema(connection);
            seedV12CategoriesAndMappings(connection);
            insertCategory(connection, "custom-dua", "Dua");
            Map<String, String> categoriesBefore = readCategories(connection);

            IllegalStateException error = assertThrows(IllegalStateException.class,
                    () -> V15__add_missing_lyric_categories.apply(connection));

            assertTrue(error.getMessage().contains("category name 'Dua'"));
            assertEquals(categoriesBefore, readCategories(connection));
        }
    }

    private Connection connection() throws Exception {
        return DriverManager.getConnection("jdbc:h2:mem:v15_" + UUID.randomUUID()
                + ";MODE=MySQL;DB_CLOSE_DELAY=-1");
    }

    private void createSchema(Connection connection) throws Exception {
        try (Statement statement = connection.createStatement()) {
            statement.execute("""
                    CREATE TABLE lyric_categories (
                        id VARCHAR(80) NOT NULL PRIMARY KEY,
                        name VARCHAR(120) NOT NULL UNIQUE
                    )
                    """);
            statement.execute("""
                    CREATE TABLE category_numeric_mappings (
                        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                        category_key VARCHAR(80) NOT NULL UNIQUE,
                        CONSTRAINT fk_test_category FOREIGN KEY (category_key)
                            REFERENCES lyric_categories (id)
                    )
                    """);
            statement.execute("CREATE TABLE lyrics (id BIGINT NOT NULL PRIMARY KEY)");
            statement.execute("""
                    CREATE TABLE lyric_category_assignments (
                        lyric_id BIGINT NOT NULL,
                        category_id VARCHAR(80) NOT NULL,
                        PRIMARY KEY (lyric_id, category_id),
                        FOREIGN KEY (lyric_id) REFERENCES lyrics (id),
                        FOREIGN KEY (category_id) REFERENCES lyric_categories (id)
                    )
                    """);
        }
    }

    private void seedV12CategoriesAndMappings(Connection connection) throws Exception {
        for (Map.Entry<String, Long> entry : EXPECTED_MAPPINGS.entrySet()) {
            if (entry.getValue() > 6) {
                continue;
            }
            String key = entry.getKey();
            insertCategory(connection, key, categoryName(key));
            insertMapping(connection, entry.getValue(), key);
        }
    }

    private void seedAllCategoriesAndMappings(Connection connection) throws Exception {
        for (Map.Entry<String, Long> entry : EXPECTED_MAPPINGS.entrySet()) {
            String key = entry.getKey();
            insertCategory(connection, key, categoryName(key));
            insertMapping(connection, entry.getValue(), key);
        }
    }

    private void seedExistingLyricAssignment(Connection connection) throws Exception {
        try (Statement statement = connection.createStatement()) {
            statement.execute("INSERT INTO lyrics (id) VALUES (41)");
            statement.execute("""
                    INSERT INTO lyric_category_assignments (lyric_id, category_id)
                    VALUES (41, 'hamd')
                    """);
        }
    }

    private void insertCategory(Connection connection, String id, String name) throws Exception {
        try (PreparedStatement insert = connection.prepareStatement(
                "INSERT INTO lyric_categories (id, name) VALUES (?, ?)")) {
            insert.setString(1, id);
            insert.setString(2, name);
            insert.executeUpdate();
        }
    }

    private void insertMapping(Connection connection, long id, String key) throws Exception {
        try (PreparedStatement insert = connection.prepareStatement(
                "INSERT INTO category_numeric_mappings (id, category_key) VALUES (?, ?)")) {
            insert.setLong(1, id);
            insert.setString(2, key);
            insert.executeUpdate();
        }
    }

    private Map<String, String> readCategories(Connection connection) throws Exception {
        Map<String, String> categories = new LinkedHashMap<>();
        try (Statement statement = connection.createStatement();
                ResultSet results = statement.executeQuery("SELECT id, name FROM lyric_categories ORDER BY id")) {
            while (results.next()) {
                categories.put(results.getString("id"), results.getString("name"));
            }
        }
        return categories;
    }

    private Map<String, Long> readMappings(Connection connection) throws Exception {
        Map<String, Long> mappings = new LinkedHashMap<>();
        try (Statement statement = connection.createStatement();
                ResultSet results = statement.executeQuery(
                        "SELECT id, category_key FROM category_numeric_mappings ORDER BY id")) {
            while (results.next()) {
                mappings.put(results.getString("category_key"), results.getLong("id"));
            }
        }
        return mappings;
    }

    private int scalar(Connection connection, String sql) throws Exception {
        try (Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getInt(1);
        }
    }

    private String categoryName(String key) {
        return switch (key) {
            case "durood-o-salam" -> "Durood-o-Salam";
            case "naat-sharif" -> "Naat Sharif";
            case "sufi-kalam" -> "Sufi Kalam";
            case "other-kalam" -> "Other Kalam";
            default -> key.substring(0, 1).toUpperCase() + key.substring(1);
        };
    }
}
