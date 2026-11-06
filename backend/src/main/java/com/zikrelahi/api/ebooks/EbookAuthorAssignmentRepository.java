package com.zikrelahi.api.ebooks;

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
class EbookAuthorAssignmentRepository {

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedParameterJdbcTemplate;

    void replace(Long ebookId, List<Artist> authors) {
        jdbcTemplate.update("DELETE FROM ebook_author_ids WHERE ebook_id = ?", ebookId);
        for (int position = 0; position < authors.size(); position++) {
            jdbcTemplate.update(
                    "INSERT INTO ebook_author_ids (ebook_id, artist_id, position) VALUES (?, ?, ?)",
                    ebookId, authors.get(position).getId(), position);
        }
    }

    void deleteForEbook(Long ebookId) {
        jdbcTemplate.update("DELETE FROM ebook_author_ids WHERE ebook_id = ?", ebookId);
    }

    Map<Long, List<Artist>> findAuthorsForEbooks(List<Long> ebookIds) {
        if (ebookIds.isEmpty()) {
            return Map.of();
        }

        MapSqlParameterSource parameters = new MapSqlParameterSource("ebookIds", ebookIds);
        List<AuthorRow> rows = namedParameterJdbcTemplate.query("""
                SELECT assignment.ebook_id, assignment.position,
                       artist.id AS artist_id, artist.artist_key, artist.full_name, artist.display_name,
                       artist.profile_image_url
                FROM ebook_author_ids assignment
                JOIN artists artist ON artist.id = assignment.artist_id
                WHERE assignment.ebook_id IN (:ebookIds)
                ORDER BY assignment.ebook_id, assignment.position, artist.id
                """, parameters, (result, rowNumber) -> new AuthorRow(
                result.getLong("ebook_id"),
                result.getInt("position"),
                result.getLong("artist_id"),
                result.getString("artist_key"),
                result.getString("full_name"),
                result.getString("display_name"),
                result.getString("profile_image_url")));

        Map<Long, List<Artist>> authorsByEbook = new LinkedHashMap<>();
        for (AuthorRow row : rows) {
            Artist artist = Artist.builder()
                    .id(row.artistId())
                    .artistKey(row.artistKey())
                    .fullName(row.fullName())
                    .displayName(row.displayName())
                    .profileImageUrl(row.profileImageUrl())
                    .build();
            authorsByEbook.computeIfAbsent(row.ebookId(), ignored -> new ArrayList<>()).add(artist);
        }

        Map<Long, List<Artist>> result = new LinkedHashMap<>();
        for (Long ebookId : ebookIds) {
            result.put(ebookId, List.copyOf(authorsByEbook.getOrDefault(ebookId, List.of())));
        }
        return result;
    }

    private record AuthorRow(
            Long ebookId,
            int position,
            Long artistId,
            String artistKey,
            String fullName,
            String displayName,
            String profileImageUrl) {
    }
}
