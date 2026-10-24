package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class V16__create_books_catalog extends BaseJavaMigration {

    private static final List<BookSeed> BOOKS = List.of(
            new BookSeed("hadaiq-e-bakhshish", "Hadaiq-e-Bakhshish", "Imam Ahmed Raza Khan"),
            new BookSeed("wasail-e-bakhshish", "Wasail-e-Bakhshish", "Muhammad Ilyas Attar Qadri"),
            new BookSeed("safina-e-bakhshish", "Safina-e-Bakhshish", "Akhtar Raza Khan (Huzoor Tajushariyah)"),
            new BookSeed("zauq-e-naat", "Zauq-e-Naat", "Maulana Hasan Raza Khan"),
            new BookSeed("qabala-e-bakhshish", "Qabala-e-Bakhshish",
                    "Hazrat Maulana Muhammad Jameel-ur-Rahman Qadri Razvi"),
            new BookSeed("wasail-e-firdous", "Wasail-e-Firdous", "Muhammad Ilyas Attar Qadri"),
            new BookSeed("bayaz-e-pak", "Bayaz-e-Pak", "Maulana Hamid Raza Khan Barelvi"),
            new BookSeed("saman-e-bakhshish", "Saman-e-Bakhshish",
                    "Mufti Mustafa Raza Khan Noori (Mufti-e-Azam Hind)"),
            new BookSeed("manaqib-e-attar", "Manaqib-e-Attar", "Majlis Al-Madina-tul-Ilmiyya"),
            new BookSeed("guldasta-e-noorani", "Guldasta-e-Noorani",
                    "Taj-ul-Ulama Syed Noorani Miya Ashraf Ashrafi Al-Jilani"),
            new BookSeed("aarzoo-e-deedar-e-madina", "Aarzoo-e-Deedar-e-Madina", "Muhammad Ilyas Attar Qadri"),
            new BookSeed("deewan-e-salik", "Deewan-e-Salik", "Mufti Ahmad Yar Khan Naeemi"),
            new BookSeed("kulliyat-e-naseer-gillani", "Kulliyat-e-Naseer Gillani",
                    "Pir Naseeruddin Naseer Gilani"),
            new BookSeed("riaz-e-naeem", "Riaz-e-Naeem",
                    "Sadr-ul-Afazil Allama Maulana Syed Naeemuddin Muradabadi"));

    private static final List<BookSeed> LEGACY_BOOKS = List.of(
            new BookSeed("noor-e-sadaqat", "Noor-e-Sadaqat", "Editorial Collection"),
            new BookSeed("madina-roses", "Madina Roses", "Editorial Collection"),
            new BookSeed("salam-o-durood", "Salam o Durood", "Compiled Edition"));

    @Override
    public void migrate(Context context) throws Exception {
        apply(context.getConnection());
    }

    static void apply(Connection connection) throws SQLException {
        createTableIfMissing(connection);
        for (BookSeed book : BOOKS) {
            insertOrValidate(connection, book);
        }
        for (BookSeed book : LEGACY_BOOKS) {
            insertOrValidate(connection, book);
        }
        backfillExistingLyricReferences(connection);
    }

    private static void createTableIfMissing(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("""
                    CREATE TABLE IF NOT EXISTS books (
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
    }

    private static void insertOrValidate(Connection connection, BookSeed book) throws SQLException {
        try (PreparedStatement select = connection.prepareStatement(
                "SELECT name, author FROM books WHERE slug = ?")) {
            select.setString(1, book.slug());
            try (ResultSet result = select.executeQuery()) {
                if (result.next()) {
                    String existingAuthor = result.getString("author");
                    if (!book.name().equals(result.getString("name"))
                            || !book.author().equals(existingAuthor)) {
                        throw new SQLException("V16 cannot apply: book slug '" + book.slug()
                                + "' already has conflicting title or author values.");
                    }
                    return;
                }
            }
        }

        try (PreparedStatement insert = connection.prepareStatement(
                "INSERT INTO books (name, author, slug) VALUES (?, ?, ?)")) {
            insert.setString(1, book.name());
            insert.setString(2, book.author());
            insert.setString(3, book.slug());
            insert.executeUpdate();
        }
    }

    private static void backfillExistingLyricReferences(Connection connection) throws SQLException {
        List<String> existingReferences = new ArrayList<>();
        try (Statement lyrics = connection.createStatement();
                ResultSet references = lyrics.executeQuery(
                        "SELECT DISTINCT book_id FROM lyrics WHERE book_id IS NOT NULL")) {
            while (references.next()) {
                existingReferences.add(references.getString("book_id"));
            }
        }
        for (String slug : existingReferences) {
            if (!bookExists(connection, slug)) {
                insertOrValidate(connection, new BookSeed(slug, slug, null));
            }
        }
    }

    private static boolean bookExists(Connection connection, String slug) throws SQLException {
        try (PreparedStatement select = connection.prepareStatement(
                "SELECT 1 FROM books WHERE slug = ?")) {
            select.setString(1, slug);
            try (ResultSet result = select.executeQuery()) {
                return result.next();
            }
        }
    }

    static List<BookSeed> requiredBooks() {
        return BOOKS;
    }

    record BookSeed(String slug, String name, String author) {
    }
}
