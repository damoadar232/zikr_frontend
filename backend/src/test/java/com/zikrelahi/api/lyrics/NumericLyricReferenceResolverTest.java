package com.zikrelahi.api.lyrics;

import com.zikrelahi.api.artists.AdminArtistService;
import com.zikrelahi.api.artists.ArtistDtos;
import com.zikrelahi.api.common.ResourceNotFoundException;
import com.zikrelahi.api.lyrics.LyricDtos.CombinedLyricRequest;
import com.zikrelahi.api.lyrics.LyricDtos.HtmlTranslationRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class NumericLyricReferenceResolverTest {

    @Autowired
    private NumericLyricReferenceResolver resolver;
    @Autowired
    private AdminArtistService adminArtistService;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void resolvesSharedArtistIdForCompatibleWriterAndReciterRoles() {
        String artistKey = createArtist("Phase Three Multi Role", List.of("WRITER", "RECITER"), "ACTIVE");
        long artistId = artistMappingId(artistKey);
        long categoryId = mappingId("category_numeric_mappings", "category_key", "naat-sharif");
        long subjectId = mappingId("subject_numeric_mappings", "subject_key", "madina");

        var resolved = resolver.resolve(request(artistId, List.of(artistId), List.of(categoryId), List.of(subjectId)));

        assertEquals(artistId, resolved.writerId());
        assertEquals(List.of(artistId), resolved.reciterIds());
        assertEquals(List.of("naat-sharif"), resolved.categoryKeys());
        assertEquals(List.of("madina"), resolved.subjectKeys());
    }

    @Test
    void migrationBackfillsEveryExistingCatalogRecord() {
        assertEquals(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM artists", Integer.class),
                jdbcTemplate.queryForObject("SELECT COUNT(*) FROM artist_numeric_mappings", Integer.class));
        assertEquals(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM lyric_categories", Integer.class),
                jdbcTemplate.queryForObject("SELECT COUNT(*) FROM category_numeric_mappings", Integer.class));
        assertEquals(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM lyric_subjects", Integer.class),
                jdbcTemplate.queryForObject("SELECT COUNT(*) FROM subject_numeric_mappings", Integer.class));
        assertEquals(0, jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM artists a
                LEFT JOIN artist_numeric_mappings m ON m.artist_key = a.artist_key
                WHERE m.id IS NULL
                """, Integer.class));
        assertEquals(0, jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM lyric_categories c
                LEFT JOIN category_numeric_mappings m ON m.category_key = c.id
                WHERE m.id IS NULL
                """, Integer.class));
        assertEquals(0, jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM lyric_subjects s
                LEFT JOIN subject_numeric_mappings m ON m.subject_key = s.id
                WHERE m.id IS NULL
                """, Integer.class));
    }

    @Test
    void resolvesAllNineCategoryMappingsToTheirCanonicalKeys() {
        Map.of(
                "durood-o-salam", 1L,
                "hamd", 2L,
                "manqabat", 3L,
                "naat-sharif", 4L,
                "qawwali", 5L,
                "sufi-kalam", 6L,
                "dua", 7L,
                "other-kalam", 8L,
                "tazmeen", 9L)
                .forEach((key, expectedId) -> {
                    assertEquals(expectedId.longValue(),
                            mappingId("category_numeric_mappings", "category_key", key));
                    assertEquals(List.of(key), resolver.resolve(request(null, null,
                            List.of(expectedId), null)).categoryKeys());
                });
    }

    @Test
    void rejectsUnknownNumericIdsAndDuplicateReferenceIds() {
        assertThrows(ResourceNotFoundException.class,
                () -> resolver.resolve(request(9_999_999L, null, null, null)));
        assertThrows(ResourceNotFoundException.class,
                () -> resolver.resolve(request(null, null, List.of(9_999_999L), null)));
        assertThrows(ResourceNotFoundException.class,
                () -> resolver.resolve(request(null, null, null, List.of(9_999_999L))));

        String artistKey = createArtist("Phase Three Reciter", List.of("RECITER"), "ACTIVE");
        long artistId = artistMappingId(artistKey);
        assertThrows(IllegalArgumentException.class,
                () -> resolver.resolve(request(null, List.of(artistId, artistId), null, null)));

        long categoryId = mappingId("category_numeric_mappings", "category_key", "naat-sharif");
        assertThrows(IllegalArgumentException.class,
                () -> resolver.resolve(request(null, null, List.of(categoryId, categoryId), null)));
    }

    @Test
    void acceptsEveryApprovedWriterAndReciterRole() {
        for (String role : List.of("WRITER", "LYRICIST", "POET")) {
            String artistKey = createArtist("Phase Three Writer " + role, List.of(role), "ACTIVE");
            assertEquals(artistMappingId(artistKey), resolver.resolve(
                    request(artistMappingId(artistKey), null, null, null)).writerId());
        }
        for (String role : List.of("RECITER", "NAAT_KHWAN")) {
            String artistKey = createArtist("Phase Three Reciter " + role, List.of(role), "ACTIVE");
            assertEquals(List.of(artistMappingId(artistKey)), resolver.resolve(
                    request(null, List.of(artistMappingId(artistKey)), null, null)).reciterIds());
        }
    }

    @Test
    void rejectsIncompatibleAndInactiveArtistRoles() {
        String reciterKey = createArtist("Phase Three Only Reciter", List.of("RECITER"), "ACTIVE");
        long reciterId = artistMappingId(reciterKey);
        assertThrows(IllegalArgumentException.class,
                () -> resolver.resolve(request(reciterId, null, null, null)));

        String inactiveKey = createArtist("Phase Three Inactive Poet", List.of("POET"), "INACTIVE");
        long inactiveId = artistMappingId(inactiveKey);
        assertThrows(IllegalArgumentException.class,
                () -> resolver.resolve(request(inactiveId, null, null, null)));
    }

    @Test
    void authorizedArtistCreationCreatesItsMappingInTheSameTransaction() {
        String artistKey = createArtist("Phase Three New Writer", List.of("WRITER"), "ACTIVE");

        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM artist_numeric_mappings WHERE artist_key = ?", Integer.class, artistKey));
        assertEquals(artistMappingId(artistKey),
                resolver.resolve(request(artistMappingId(artistKey), null, null, null)).writerId());
    }

    private String createArtist(String name, List<String> roles, String status) {
        return adminArtistService.create(new ArtistDtos.CreateArtistRequest(
                name, null, roles, null, status)).artistKey();
    }

    private long artistMappingId(String artistKey) {
        return mappingId("artist_numeric_mappings", "artist_key", artistKey);
    }

    private long mappingId(String table, String keyColumn, String key) {
        return jdbcTemplate.queryForObject(
                "SELECT id FROM " + table + " WHERE " + keyColumn + " = ?", Long.class, key);
    }

    private CombinedLyricRequest request(
            Long writerId,
            List<Long> reciterIds,
            List<Long> categoryIds,
            List<Long> subjectIds) {
        return new CombinedLyricRequest(
                "Phase Three lyric", null, writerId, reciterIds, categoryIds, subjectIds,
                null, null, null, List.of(), List.<HtmlTranslationRequest>of(), null);
    }
}
