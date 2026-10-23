package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class V14__normalize_lyric_primary_artist_ids extends BaseJavaMigration {

    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        verifySchema(connection);
        execute(connection, "ALTER TABLE lyrics RENAME COLUMN artist_id TO artist_id_legacy");
        execute(connection, "ALTER TABLE lyrics RENAME COLUMN writer_id TO writer_id_legacy");
        execute(connection, "ALTER TABLE lyrics ADD COLUMN artist_id BIGINT NULL");
        execute(connection, "ALTER TABLE lyrics ADD COLUMN writer_id BIGINT NULL");
        execute(connection, """
                ALTER TABLE lyrics
                ADD CONSTRAINT fk_lyrics_artist_numeric
                FOREIGN KEY (artist_id) REFERENCES artists (id) ON DELETE SET NULL
                """);
        execute(connection, """
                ALTER TABLE lyrics
                ADD CONSTRAINT fk_lyrics_writer_numeric
                FOREIGN KEY (writer_id) REFERENCES artists (id) ON DELETE SET NULL
                """);
        execute(connection, "CREATE INDEX idx_lyrics_artist_numeric ON lyrics (artist_id)");
        execute(connection, "CREATE INDEX idx_lyrics_writer_numeric ON lyrics (writer_id)");
    }

    private void verifySchema(Connection connection) throws SQLException {
        if (!hasColumn(connection, "artist_id") || !hasColumn(connection, "writer_id")
                || hasColumn(connection, "artist_id_legacy") || hasColumn(connection, "writer_id_legacy")) {
            throw new IllegalStateException("V14 requires the V13 lyrics artist-reference schema.");
        }
    }

    private boolean hasColumn(Connection connection, String column) throws SQLException {
        try (Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery(
                        "SELECT COUNT(*) FROM information_schema.columns "
                                + "WHERE LOWER(table_name) = 'lyrics' AND LOWER(column_name) = '"
                                + column.toLowerCase(java.util.Locale.ROOT) + "'")) {
            result.next();
            return result.getLong(1) > 0;
        }
    }

    private void execute(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }
}
