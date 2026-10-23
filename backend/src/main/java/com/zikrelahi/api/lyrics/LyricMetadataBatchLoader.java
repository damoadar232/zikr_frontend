package com.zikrelahi.api.lyrics;

import com.zikrelahi.api.lyrics.LyricDtos.MediaReferenceDto;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
class LyricMetadataBatchLoader {

        private final NamedParameterJdbcTemplate jdbc;

        LyricMetadataBatchLoader(NamedParameterJdbcTemplate jdbc) {
                this.jdbc = jdbc;
        }

        Map<Long, LyricRelations> load(List<Long> lyricIds) {
                Map<Long, LyricRelations> relations = new HashMap<>();
                lyricIds.forEach(id -> relations.put(id, new LyricRelations()));
                if (lyricIds.isEmpty())
                        return relations;

                MapSqlParameterSource parameters = new MapSqlParameterSource("lyricIds", lyricIds);
                loadStrings(
                                "SELECT lyric_id, category_id AS relation_value FROM lyric_category_assignments WHERE lyric_id IN (:lyricIds) ORDER BY lyric_id, category_id",
                                parameters, relations, (value, relation) -> relation.categoryIds.add(value));
                loadStrings(
                                "SELECT lyric_id, subject_id AS relation_value FROM lyric_subject_assignments WHERE lyric_id IN (:lyricIds) ORDER BY lyric_id, subject_id",
                                parameters, relations, (value, relation) -> relation.subjectIds.add(value));
                jdbc.query("""
                                SELECT lyric_id, artist_id
                                FROM lyric_artist_ids
                                WHERE lyric_id IN (:lyricIds)
                                ORDER BY lyric_id, artist_id
                                """,
                                parameters,
                                (RowCallbackHandler) result -> relations
                                                .computeIfAbsent(result.getLong("lyric_id"),
                                                                ignored -> new LyricRelations()).artistIds
                                                .add(result.getLong("artist_id")));
                jdbc.query("""
                                SELECT id AS lyric_id, artist_id
                                FROM lyrics
                                WHERE id IN (:lyricIds) AND artist_id IS NOT NULL
                                """,
                                parameters,
                                (RowCallbackHandler) result -> relations
                                                                .computeIfAbsent(result.getLong("lyric_id"),
                                                                                ignored -> new LyricRelations()).artistIds
                                                                .add(result.getLong("artist_id")));
                loadStrings("""
                                SELECT lyric_id, relation_value
                                FROM (
                                    SELECT la.lyric_id, COALESCE(a.display_name, a.full_name) AS relation_value,
                                           la.position AS position
                                    FROM lyric_artist_ids la
                                    JOIN artists a ON a.id = la.artist_id
                                    WHERE la.lyric_id IN (:lyricIds) AND la.role = 'RECITER'
                                    UNION ALL
                                    SELECT legacy.lyric_id, legacy.display_name AS relation_value,
                                           legacy.position AS position
                                    FROM lyric_reciters legacy
                                    WHERE legacy.lyric_id IN (:lyricIds)
                                      AND NOT EXISTS (
                                          SELECT 1 FROM lyric_artist_ids la
                                          JOIN artists a ON a.id = la.artist_id
                                          WHERE la.lyric_id = legacy.lyric_id
                                            AND la.role = 'RECITER'
                                            AND (LOWER(TRIM(a.full_name)) = LOWER(TRIM(legacy.display_name))
                                                 OR LOWER(TRIM(a.display_name)) = LOWER(TRIM(legacy.display_name)))
                                      )
                                ) reciters
                                ORDER BY lyric_id, position
                                """,
                                parameters, relations, (value, relation) -> relation.reciters.add(value));
                loadStrings(
                                "SELECT lyric_id, tag AS relation_value FROM lyric_tags WHERE lyric_id IN (:lyricIds) ORDER BY lyric_id, tag",
                                parameters, relations, (value, relation) -> relation.tags.add(value));
                jdbc.query("""
                                SELECT lyric_id, media_type, title, url
                                FROM lyric_media_references
                                WHERE lyric_id IN (:lyricIds)
                                ORDER BY lyric_id, position
                                """,
                                parameters,
                                (RowCallbackHandler) result -> relations
                                                .computeIfAbsent(result.getLong("lyric_id"),
                                                                ignored -> new LyricRelations()).mediaReferences
                                                .add(new MediaReferenceDto(
                                                                result.getString("media_type"),
                                                                result.getString("title"), result.getString("url"))));
                return relations;
        }

        private void loadStrings(String sql, MapSqlParameterSource parameters,
                        Map<Long, LyricRelations> relations, StringConsumer consumer) {
                jdbc.query(sql, parameters, result -> {
                        LyricRelations target = relations.computeIfAbsent(result.getLong("lyric_id"),
                                        ignored -> new LyricRelations());
                        consumer.accept(result.getString("relation_value"), target);
                });
        }

        @FunctionalInterface
        private interface StringConsumer {
                void accept(String value, LyricRelations relations);
        }
}