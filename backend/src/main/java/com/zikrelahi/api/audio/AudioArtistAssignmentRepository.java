package com.zikrelahi.api.audio;

import com.zikrelahi.api.artists.Artist;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Repository
@RequiredArgsConstructor
class AudioArtistAssignmentRepository {

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedParameterJdbcTemplate;

    void replace(Long audioId, String role, List<Artist> artists) {
        jdbcTemplate.update("DELETE FROM audio_artist_ids WHERE audio_id = ? AND role = ?", audioId, role);
        for (int position = 0; position < artists.size(); position++) {
            jdbcTemplate.update(
                    "INSERT INTO audio_artist_ids (audio_id, artist_id, role, position) VALUES (?, ?, ?, ?)",
                    audioId, artists.get(position).getId(), role, position);
        }
    }

    void deleteForAudio(Long audioId) {
        jdbcTemplate.update("DELETE FROM audio_artist_ids WHERE audio_id = ?", audioId);
    }

    Map<Long, AudioDtos.AudioArtistCredits> findCreditsForAudios(List<Long> audioIds) {
        if (audioIds.isEmpty()) {
            return Map.of();
        }
        MapSqlParameterSource parameters = new MapSqlParameterSource("audioIds", audioIds);
        List<CreditRow> rows = namedParameterJdbcTemplate.query("""
                SELECT assignment.audio_id, assignment.role, assignment.position,
                       artist.id AS artist_id, artist.artist_key, artist.full_name, artist.display_name
                FROM audio_artist_ids assignment
                JOIN artists artist ON artist.id = assignment.artist_id
                WHERE assignment.audio_id IN (:audioIds)
                ORDER BY assignment.audio_id, assignment.role, assignment.position, artist.id
                """, parameters, (result, rowNumber) -> new CreditRow(
                result.getLong("audio_id"),
                result.getString("role"),
                result.getInt("position"),
                result.getLong("artist_id"),
                result.getString("artist_key"),
                result.getString("full_name"),
                result.getString("display_name")));

        Map<Long, List<AudioDtos.ArtistCreditDto>> singers = new LinkedHashMap<>();
        Map<Long, List<AudioDtos.ArtistCreditDto>> writers = new LinkedHashMap<>();
        for (CreditRow row : rows) {
            AudioDtos.ArtistCreditDto credit = new AudioDtos.ArtistCreditDto(
                    row.artistId(), row.artistKey(), row.fullName(), row.displayName(), row.position());
            (row.role().equals("SINGER") ? singers : writers)
                    .computeIfAbsent(row.audioId(), ignored -> new ArrayList<>())
                    .add(credit);
        }

        Map<Long, AudioDtos.AudioArtistCredits> result = new LinkedHashMap<>();
        for (Long audioId : audioIds) {
            result.put(audioId, new AudioDtos.AudioArtistCredits(
                    List.copyOf(singers.getOrDefault(audioId, List.of())),
                    List.copyOf(writers.getOrDefault(audioId, List.of()))));
        }
        return result;
    }

    private record CreditRow(
            Long audioId,
            String role,
            int position,
            Long artistId,
            String artistKey,
            String fullName,
            String displayName) {
    }
}
