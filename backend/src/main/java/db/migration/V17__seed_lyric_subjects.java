package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class V17__seed_lyric_subjects extends BaseJavaMigration {

    private static final List<SubjectSeed> SUBJECTS = List.of(
            new SubjectSeed("safar-e-madina", "Safar-e-Madina"),
            new SubjectSeed("gham-e-madina", "Gham-e-Madina"),
            new SubjectSeed("hajj", "Hajj"),
            new SubjectSeed("umrah", "Umrah"),
            new SubjectSeed("ramzan", "Ramzan"),
            new SubjectSeed("muharram", "Muharram"),
            new SubjectSeed("karbala", "Karbala"),
            new SubjectSeed("sehra", "Sehra"),
            new SubjectSeed("nikah", "Nikah"),
            new SubjectSeed("maa-baap", "Maa-Baap"),
            new SubjectSeed("maut", "Maut"),
            new SubjectSeed("aakhirat", "Aakhirat"),
            new SubjectSeed("tauba", "Tauba"),
            new SubjectSeed("dua", "Dua"),
            new SubjectSeed("isteghasa", "Isteghasa"),
            new SubjectSeed("ishq-e-rasool", "Ishq-e-Rasool"),
            new SubjectSeed("shan-e-mustafa", "Shan-e-Mustafa"),
            new SubjectSeed("meraj-un-nabi", "Meraj-un-Nabi"),
            new SubjectSeed("ahl-e-bait", "Ahl-e-Bait"),
            new SubjectSeed("sahaba-e-kiram", "Sahaba-e-Kiram"),
            new SubjectSeed("manqabat-e-ala-hazrat", "Manqabat-e-Ala Hazrat"),
            new SubjectSeed("manqabat-e-ghaus-e-azam", "Manqabat-e-Ghaus-e-Azam"),
            new SubjectSeed("manqabat-e-khwaja-garib-nawaz", "Manqabat-e-Khwaja Garib Nawaz"),
            new SubjectSeed("eid-milad-un-nabi", "Eid Milad-un-Nabi"),
            new SubjectSeed("urs-e-razavi", "Urs-e-Razavi"),
            new SubjectSeed("shab-e-baraat", "Shab-e-Baraat"),
            new SubjectSeed("eid-ul-fitr", "Eid-ul-Fitr"),
            new SubjectSeed("eid-ul-adha", "Eid-ul-Adha"),
            new SubjectSeed("youm-e-ashura", "Youm-e-Ashura"));

    @Override
    public void migrate(Context context) throws Exception {
        apply(context.getConnection());
    }

    static void apply(Connection connection) throws SQLException {
        Map<String, SubjectSeed> subjectsById = new HashMap<>();
        Map<String, SubjectSeed> subjectsByName = new HashMap<>();
        try (Statement statement = connection.createStatement();
                ResultSet rows = statement.executeQuery("SELECT id, name FROM lyric_subjects")) {
            while (rows.next()) {
                SubjectSeed subject = new SubjectSeed(rows.getString("id"), rows.getString("name"));
                subjectsById.put(normalizeName(subject.id()), subject);
                subjectsByName.put(normalizeName(subject.name()), subject);
            }
        }

        for (SubjectSeed requested : SUBJECTS) {
            SubjectSeed byId = subjectsById.get(normalizeName(requested.id()));
            SubjectSeed byName = subjectsByName.get(normalizeName(requested.name()));
            if (byId != null && !normalizeName(byId.name()).equals(normalizeName(requested.name()))) {
                throw new SQLException("V17 cannot apply: subject ID '" + requested.id()
                        + "' already has a different name.");
            }
            if (byId != null && byName != null
                    && !normalizeName(byId.id()).equals(normalizeName(byName.id()))) {
                throw new SQLException("V17 cannot apply: subject ID and name resolve to different records for '"
                        + requested.name() + "'.");
            }

            SubjectSeed existing = byId != null ? byId : byName;
            if (existing == null) {
                insertSubject(connection, requested);
                existing = requested;
                subjectsById.put(normalizeName(existing.id()), existing);
                subjectsByName.put(normalizeName(existing.name()), existing);
            }
            insertNumericMappingIfMissing(connection, existing.id());
        }
    }

    private static void insertSubject(Connection connection, SubjectSeed subject) throws SQLException {
        try (PreparedStatement insert = connection.prepareStatement(
                "INSERT INTO lyric_subjects (id, name) VALUES (?, ?)")) {
            insert.setString(1, subject.id());
            insert.setString(2, subject.name());
            insert.executeUpdate();
        }
    }

    private static void insertNumericMappingIfMissing(Connection connection, String subjectId) throws SQLException {
        try (PreparedStatement select = connection.prepareStatement(
                "SELECT 1 FROM subject_numeric_mappings WHERE subject_key = ?")) {
            select.setString(1, subjectId);
            try (ResultSet result = select.executeQuery()) {
                if (result.next()) {
                    return;
                }
            }
        }
        try (PreparedStatement insert = connection.prepareStatement(
                "INSERT INTO subject_numeric_mappings (subject_key) VALUES (?)")) {
            insert.setString(1, subjectId);
            insert.executeUpdate();
        }
    }

    private static String normalizeName(String name) {
        return name.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    record SubjectSeed(String id, String name) {
    }
}
