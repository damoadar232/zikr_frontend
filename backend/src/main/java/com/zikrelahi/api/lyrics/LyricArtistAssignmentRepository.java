package com.zikrelahi.api.lyrics;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.util.List;

@Repository
class LyricArtistAssignmentRepository {

    private final JdbcTemplate jdbcTemplate;

    LyricArtistAssignmentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    void replaceWriters(Long lyricId, List<Long> artistIds) {
        replace(lyricId, "WRITER", artistIds);
    }

    void replaceReciters(Long lyricId, List<Long> artistIds) {
        replace(lyricId, "RECITER", artistIds);
    }

    void replaceRecitersWithPositions(Long lyricId, List<PositionedArtist> artists) {
        jdbcTemplate.update("DELETE FROM lyric_artist_ids WHERE lyric_id = ? AND role = 'RECITER'", lyricId);
        for (PositionedArtist artist : artists) {
            jdbcTemplate.update(
                    "INSERT INTO lyric_artist_ids (lyric_id, artist_id, role, position) VALUES (?, ?, 'RECITER', ?)",
                    lyricId, artist.artistId(), artist.position());
        }
    }

    void replaceLegacyArtistIds(Long lyricId, List<String> artistKeys) {
        jdbcTemplate.update("DELETE FROM lyric_artist_ids_legacy WHERE lyric_id = ?", lyricId);
        for (String artistKey : artistKeys) {
            jdbcTemplate.update(
                    "INSERT INTO lyric_artist_ids_legacy (lyric_id, artist_id) VALUES (?, ?)",
                    lyricId, artistKey);
        }
    }

    void replaceLegacyReciters(Long lyricId, List<PositionedName> reciters) {
        jdbcTemplate.update("DELETE FROM lyric_reciters WHERE lyric_id = ?", lyricId);
        for (PositionedName reciter : reciters) {
            jdbcTemplate.update(
                    "INSERT INTO lyric_reciters (lyric_id, position, display_name) VALUES (?, ?, ?)",
                    lyricId, reciter.position(), reciter.displayName());
        }
    }

    void deleteForLyric(Long lyricId) {
        jdbcTemplate.update("DELETE FROM lyric_artist_ids WHERE lyric_id = ?", lyricId);
        jdbcTemplate.update("DELETE FROM lyric_artist_ids_legacy WHERE lyric_id = ?", lyricId);
        jdbcTemplate.update("DELETE FROM lyric_reciters WHERE lyric_id = ?", lyricId);
    }

    private void replace(Long lyricId, String role, List<Long> artistIds) {
        jdbcTemplate.update("DELETE FROM lyric_artist_ids WHERE lyric_id = ? AND role = ?", lyricId, role);
        if (artistIds == null || artistIds.isEmpty()) {
            return;
        }
        for (int index = 0; index < artistIds.size(); index++) {
            Integer position = role.equals("RECITER") ? index : null;
            jdbcTemplate.update(
                    "INSERT INTO lyric_artist_ids (lyric_id, artist_id, role, position) VALUES (?, ?, ?, ?)",
                    new Object[] { lyricId, artistIds.get(index), role, position },
                    new int[] { Types.BIGINT, Types.BIGINT, Types.VARCHAR, Types.INTEGER });
        }

    }

    record PositionedArtist(Long artistId, int position) {
    }

    record PositionedName(String displayName, int position) {
    }
}
