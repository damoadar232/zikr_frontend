package db.migration;

import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class V16CreateBooksCatalogTest {

    private static final Map<String, String> REQUIRED_BOOK_AUTHORS = Map.ofEntries(
            Map.entry("Hadaiq-e-Bakhshish", "Imam Ahmed Raza Khan"),
            Map.entry("Wasail-e-Bakhshish", "Muhammad Ilyas Attar Qadri"),
            Map.entry("Safina-e-Bakhshish", "Akhtar Raza Khan (Huzoor Tajushariyah)"),
            Map.entry("Zauq-e-Naat", "Maulana Hasan Raza Khan"),
            Map.entry("Qabala-e-Bakhshish", "Hazrat Maulana Muhammad Jameel-ur-Rahman Qadri Razvi"),
            Map.entry("Wasail-e-Firdous", "Muhammad Ilyas Attar Qadri"),
            Map.entry("Bayaz-e-Pak", "Maulana Hamid Raza Khan Barelvi"),
            Map.entry("Saman-e-Bakhshish", "Mufti Mustafa Raza Khan Noori (Mufti-e-Azam Hind)"),
            Map.entry("Manaqib-e-Attar", "Majlis Al-Madina-tul-Ilmiyya"),
            Map.entry("Guldasta-e-Noorani", "Taj-ul-Ulama Syed Noorani Miya Ashraf Ashrafi Al-Jilani"),
            Map.entry("Aarzoo-e-Deedar-e-Madina", "Muhammad Ilyas Attar Qadri"),
            Map.entry("Deewan-e-Salik", "Mufti Ahmad Yar Khan Naeemi"),
            Map.entry("Kulliyat-e-Naseer Gillani", "Pir Naseeruddin Naseer Gilani"),
            Map.entry("Riaz-e-Naeem", "Sadr-ul-Afazil Allama Maulana Syed Naeemuddin Muradabadi"));

    @Test
    void seedsRequiredBooksAndPreservesExistingLyricReferencesIdempotently() throws Exception {
        try (Connection connection = newConnection()) {
            createLyricsTable(connection);
            try (PreparedStatement insert = connection.prepareStatement(
                    "INSERT INTO lyrics (book_id) VALUES (?), (?)")) {
                insert.setString(1, "legacy-custom-reference");
                insert.setString(2, "noor-e-sadaqat");
                insert.executeUpdate();
            }

            V16__create_books_catalog.apply(connection);
            V16__create_books_catalog.apply(connection);

            assertEquals(14, countRequiredBooks(connection));
            assertEquals(18, countBooks(connection));
            assertEquals(countBooks(connection), countDistinctIds(connection));
            for (Map.Entry<String, String> expected : REQUIRED_BOOK_AUTHORS.entrySet()) {
                assertEquals(expected.getValue(), authorFor(connection, slugForName(expected.getKey())));
            }
            assertEquals("Hadaiq-e-Bakhshish", nameFor(connection, "hadaiq-e-bakhshish"));
            assertEquals(null, authorFor(connection, "legacy-custom-reference"));
            assertEquals("legacy-custom-reference", nameFor(connection, "legacy-custom-reference"));
            assertEquals(Set.of("legacy-custom-reference", "noor-e-sadaqat"),
                    lyricReferences(connection));
        }
    }

    @Test
    void validatesRatherThanOverwritingConflictingPartialSeedData() throws Exception {
        try (Connection connection = newConnection()) {
            createLyricsTable(connection);
            V16__create_books_catalog.apply(connection);
            try (PreparedStatement update = connection.prepareStatement(
                    "UPDATE books SET author = ? WHERE slug = ?")) {
                update.setString(1, "Conflicting author");
                update.setString(2, "hadaiq-e-bakhshish");
                update.executeUpdate();
            }

            Exception error = assertThrows(Exception.class, () -> V16__create_books_catalog.apply(connection));

            assertTrue(error.getMessage().contains("conflicting title or author"));
            assertEquals("Conflicting author", authorFor(connection, "hadaiq-e-bakhshish"));
        }
    }

    @Test
    void fillsMissingBooksFromAnExactPartiallySeededCatalogWithoutChangingExistingId() throws Exception {
        try (Connection connection = newConnection()) {
            createLyricsTable(connection);
            try (Statement statement = connection.createStatement()) {
                statement.execute("""
                        CREATE TABLE books (
                            id BIGINT NOT NULL AUTO_INCREMENT,
                            name VARCHAR(250) NOT NULL,
                            author VARCHAR(300) NULL,
                            slug VARCHAR(180) NOT NULL,
                            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            CONSTRAINT pk_books PRIMARY KEY (id),
                            CONSTRAINT uq_books_slug UNIQUE (slug)
                        )
                        """);
            }
            try (PreparedStatement insert = connection.prepareStatement(
                    "INSERT INTO books (id, name, author, slug) VALUES (43, ?, ?, ?)")) {
                insert.setString(1, "Hadaiq-e-Bakhshish");
                insert.setString(2, "Imam Ahmed Raza Khan");
                insert.setString(3, "hadaiq-e-bakhshish");
                insert.executeUpdate();
            }

            V16__create_books_catalog.apply(connection);

            assertEquals(43L, idFor(connection, "hadaiq-e-bakhshish"));
            assertEquals(17, countBooks(connection));
            assertEquals(countBooks(connection), countDistinctIds(connection));
        }
    }

    private Connection newConnection() throws Exception {
        String database = "books_" + UUID.randomUUID().toString().replace("-", "");
        return DriverManager.getConnection("jdbc:h2:mem:" + database + ";MODE=MySQL;DB_CLOSE_DELAY=-1");
    }

    private void createLyricsTable(Connection connection) throws Exception {
        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE lyrics (id BIGINT AUTO_INCREMENT PRIMARY KEY, book_id VARCHAR(120))");
        }
    }

    private int countRequiredBooks(Connection connection) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM books WHERE slug = ?")) {
            int count = 0;
            for (V16__create_books_catalog.BookSeed book : V16__create_books_catalog.requiredBooks()) {
                statement.setString(1, book.slug());
                try (ResultSet result = statement.executeQuery()) {
                    result.next();
                    count += result.getInt(1);
                }
            }
            return count;
        }
    }

    private int countBooks(Connection connection) throws Exception {
        try (Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM books")) {
            result.next();
            return result.getInt(1);
        }
    }

    private int countDistinctIds(Connection connection) throws Exception {
        try (Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery("SELECT COUNT(DISTINCT id) FROM books")) {
            result.next();
            return result.getInt(1);
        }
    }

    private String authorFor(Connection connection, String slug) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT author FROM books WHERE slug = ?")) {
            statement.setString(1, slug);
            try (ResultSet result = statement.executeQuery()) {
                assertTrue(result.next());
                return result.getString(1);
            }
        }
    }

    private String nameFor(Connection connection, String slug) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT name FROM books WHERE slug = ?")) {
            statement.setString(1, slug);
            try (ResultSet result = statement.executeQuery()) {
                assertTrue(result.next());
                return result.getString(1);
            }
        }
    }

    private String slugForName(String name) {
        return V16__create_books_catalog.requiredBooks().stream()
                .filter(book -> book.name().equals(name))
                .map(V16__create_books_catalog.BookSeed::slug)
                .findFirst()
                .orElseThrow();
    }

    private long idFor(Connection connection, String slug) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT id FROM books WHERE slug = ?")) {
            statement.setString(1, slug);
            try (ResultSet result = statement.executeQuery()) {
                assertTrue(result.next());
                return result.getLong(1);
            }
        }
    }

    private Set<String> lyricReferences(Connection connection) throws Exception {
        Set<String> references = new HashSet<>();
        try (Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery("SELECT book_id FROM lyrics")) {
            while (result.next()) {
                references.add(result.getString(1));
            }
        }
        return references;
    }
}
