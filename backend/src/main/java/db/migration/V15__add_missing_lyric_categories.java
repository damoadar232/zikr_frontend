package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class V15__add_missing_lyric_categories extends BaseJavaMigration {

    private static final List<Category> CATEGORIES = List.of(
            new Category("durood-o-salam", "Durood-o-Salam", 1, false),
            new Category("hamd", "Hamd", 2, false),
            new Category("manqabat", "Manqabat", 3, false),
            new Category("naat-sharif", "Naat Sharif", 4, false),
            new Category("qawwali", "Qawwali", 5, false),
            new Category("sufi-kalam", "Sufi Kalam", 6, false),
            new Category("dua", "Dua", 7, true),
            new Category("other-kalam", "Other Kalam", 8, true),
            new Category("tazmeen", "Tazmeen", 9, true));

    @Override
    public void migrate(Context context) throws Exception {
        apply(context.getConnection());
    }

    static void apply(Connection connection) throws SQLException {
        Map<String, String> existingCategories = readCategories(connection);
        Map<Long, String> existingMappings = readMappings(connection);
        Map<String, Long> mappingIdsByKey = new LinkedHashMap<>();
        existingMappings.forEach((id, key) -> mappingIdsByKey.put(key, id));

        validateCategories(existingCategories);
        validateMappings(existingMappings, mappingIdsByKey);
        insertMissingCategories(connection, existingCategories);
        insertMissingMappings(connection, mappingIdsByKey);
    }

    private static Map<String, String> readCategories(Connection connection) throws SQLException {
        Map<String, String> categories = new LinkedHashMap<>();
        try (Statement statement = connection.createStatement();
                ResultSet results = statement.executeQuery("SELECT id, name FROM lyric_categories")) {
            while (results.next()) {
                categories.put(results.getString("id"), results.getString("name"));
            }
        }
        return categories;
    }

    private static Map<Long, String> readMappings(Connection connection) throws SQLException {
        Map<Long, String> mappings = new LinkedHashMap<>();
        try (Statement statement = connection.createStatement();
                ResultSet results = statement.executeQuery(
                        "SELECT id, category_key FROM category_numeric_mappings")) {
            while (results.next()) {
                mappings.put(results.getLong("id"), results.getString("category_key"));
            }
        }
        return mappings;
    }

    private static void validateCategories(Map<String, String> existingCategories) {
        Map<String, String> idsByNormalizedName = new LinkedHashMap<>();
        Map<String, Map.Entry<String, String>> categoriesByNormalizedId = new LinkedHashMap<>();
        existingCategories.forEach((id, name) -> {
            idsByNormalizedName.put(normalize(name), id);
            categoriesByNormalizedId.put(normalize(id), Map.entry(id, name));
        });
        for (Category category : CATEGORIES) {
            Map.Entry<String, String> existing = categoriesByNormalizedId.get(normalize(category.id()));
            if (existing != null && (!existing.getKey().equals(category.id())
                    || !existing.getValue().equals(category.name()))) {
                throw new IllegalStateException("V15 cannot apply: category ID '" + existing.getKey()
                        + "' already has the name '" + existing.getValue() + "', expected '"
                        + category.id() + "' / '" + category.name() + "'.");
            }
            if (existing == null && !category.insertIfMissing()) {
                throw new IllegalStateException("V15 cannot apply: required existing category '"
                        + category.id() + "' ('" + category.name() + "') is missing.");
            }
            String existingId = idsByNormalizedName.get(normalize(category.name()));
            if (existingId != null && !existingId.equals(category.id())) {
                throw new IllegalStateException("V15 cannot apply: category name '" + category.name()
                        + "' already belongs to ID '" + existingId + "', expected '" + category.id() + "'.");
            }
        }
    }

    private static void validateMappings(
            Map<Long, String> existingMappings,
            Map<String, Long> mappingIdsByKey) {
        Map<String, Map.Entry<Long, String>> mappingsByNormalizedKey = new LinkedHashMap<>();
        existingMappings.forEach((id, key) -> mappingsByNormalizedKey.put(normalize(key), Map.entry(id, key)));
        for (Category category : CATEGORIES) {
            Map.Entry<Long, String> existing = mappingsByNormalizedKey.get(normalize(category.id()));
            if (existing != null && (!existing.getValue().equals(category.id())
                    || existing.getKey() != category.numericId())) {
                throw new IllegalStateException("V15 cannot apply: category key '" + existing.getValue()
                        + "' is mapped to numeric ID " + existing.getKey() + ", expected '"
                        + category.id() + "' / " + category.numericId() + ".");
            }
            String existingKey = existingMappings.get(category.numericId());
            if (existingKey != null && !existingKey.equals(category.id())) {
                throw new IllegalStateException("V15 cannot apply: numeric category ID " + category.numericId()
                        + " already maps to '" + existingKey + "', expected '" + category.id() + "'.");
            }
        }
    }

    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT);
    }

    private static void insertMissingCategories(
            Connection connection,
            Map<String, String> existingCategories) throws SQLException {
        List<Category> missing = CATEGORIES.stream()
                .filter(category -> category.insertIfMissing() && !existingCategories.containsKey(category.id()))
                .toList();
        try (PreparedStatement insert = connection.prepareStatement(
                "INSERT INTO lyric_categories (id, name) VALUES (?, ?)")) {
            for (Category category : missing) {
                insert.setString(1, category.id());
                insert.setString(2, category.name());
                insert.executeUpdate();
            }
        }
    }

    private static void insertMissingMappings(
            Connection connection,
            Map<String, Long> mappingIdsByKey) throws SQLException {
        List<Category> missing = CATEGORIES.stream()
                .filter(category -> !mappingIdsByKey.containsKey(category.id()))
                .toList();
        try (PreparedStatement insert = connection.prepareStatement(
                "INSERT INTO category_numeric_mappings (id, category_key) VALUES (?, ?)")) {
            for (Category category : missing) {
                insert.setLong(1, category.numericId());
                insert.setString(2, category.id());
                insert.executeUpdate();
            }
        }
    }

    private record Category(String id, String name, long numericId, boolean insertIfMissing) {
    }
}
