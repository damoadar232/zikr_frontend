package com.zikrelahi.api.lyrics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zikrelahi.api.artists.AdminArtistService;
import com.zikrelahi.api.artists.ArtistDtos;
import com.zikrelahi.api.admin.AdminRole;
import com.zikrelahi.api.admin.AdminUser;
import com.zikrelahi.api.admin.AdminUserRepository;
import com.zikrelahi.api.common.ContentStatus;
import com.zikrelahi.api.security.JwtTokenProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import jakarta.persistence.EntityManager;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LyricsApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private AdminUserRepository adminUserRepository;
    @Autowired
    private LyricRepository lyricRepository;
    @Autowired
    private LyricLanguageVersionRepository languageVersionRepository;
    @Autowired
    private LyricRevisionRepository revisionRepository;
    @Autowired
    private LyricPersistenceService persistenceService;
    @Autowired
    private JwtTokenProvider tokenProvider;
    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private AdminArtistService adminArtistService;
    @Autowired
    private EntityManager entityManager;
    @SpyBean
    private LyricPersistenceService persistenceServiceSpy;

    private String prefix;
    private AdminUser admin;
    private String token;

    @BeforeEach
    void setUp() {
        prefix = "api-test-" + UUID.randomUUID().toString().substring(0, 8);
        admin = adminUserRepository.saveAndFlush(AdminUser.builder()
                .email(prefix + "@example.test")
                .passwordHash("not-used-by-bearer-tests")
                .displayName("Lyrics API Test Admin")
                .role(AdminRole.ADMIN)
                .enabled(true)
                .build());
        token = tokenProvider.generateAccessToken(admin.getEmail(), admin.getRole().name(), admin.getId());
    }

    @Test
    void adminSubjectCatalogReturnsStableIdsAndNumericMappings() throws Exception {
        String response = mockMvc.perform(get("/api/v1/admin/lyrics/subjects")
                .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode subjects = objectMapper.readTree(response).path("data");
        assertEquals(36, subjects.size());
        JsonNode safar = findSubject(subjects, "safar-e-madina");
        assertEquals("Safar-e-Madina", safar.path("name").asText());
        assertTrue(safar.path("numericId").asLong() > 0);
        assertEquals(1, countSubjects(subjects, "karbala"));
        assertEquals(1, countSubjects(subjects, "ramadan"));
        assertEquals(1, countSubjects(subjects, "ramzan"));
        assertEquals(1, countSubjects(subjects, "eid"));
        assertEquals(1, countSubjects(subjects, "eid-ul-fitr"));
    }

    @Test
    void newSubjectCanBeAssignedToALyricThroughTheExistingCreateApi() throws Exception {
        Map<String, Object> request = combinedRequest(null, null);
        request.put("slug", prefix + "-new-subject");
        request.put("subjectIds", List.of(numericMappingId(
                "subject_numeric_mappings", "subject_key", "safar-e-madina")));

        String response = mockMvc.perform(post("/api/v1/admin/lyrics")
                .header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.subjectIds[0]", is("safar-e-madina")))
                .andReturn().getResponse().getContentAsString();

        long lyricId = objectMapper.readTree(response).at("/data/id").asLong();
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM lyric_subject_assignments WHERE lyric_id = ? AND subject_id = ?",
                Integer.class, lyricId, "safar-e-madina"));
    }

    @Test
    void publicSubjectCatalogIncludesOnlySubjectsAssignedToPublishedLyrics() throws Exception {
        String publishedReference = createLyric("Published subject", "poet-public-subject", "Reciter Public Subject");
        mockMvc.perform(put("/api/v1/admin/lyrics/{reference}", publishedReference)
                .header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(Map.of(
                        "title", "Published subject " + prefix,
                        "subjectIds", List.of("safar-e-madina")))))
                .andExpect(status().isOk());
        saveAndPublishRoman(publishedReference);

        String draftReference = createLyric("Draft subject", "poet-draft-subject", "Reciter Draft Subject");
        mockMvc.perform(put("/api/v1/admin/lyrics/{reference}", draftReference)
                .header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(Map.of(
                        "title", "Draft subject " + prefix,
                        "subjectIds", List.of("ramzan")))))
                .andExpect(status().isOk());

        String response = mockMvc.perform(get("/api/v1/lyrics/subjects"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode subjects = objectMapper.readTree(response).path("data");
        assertEquals(1, countSubjects(subjects, "safar-e-madina"));
        assertEquals(0, countSubjects(subjects, "ramzan"));
    }

    @AfterEach
    void cleanUp() {
        List<Lyric> created = lyricRepository.findAll().stream()
                .filter(lyric -> lyric.getLegacyId().startsWith(prefix)).toList();
        for (Lyric lyric : created) {
            jdbcTemplate.update("DELETE FROM lyric_revisions WHERE lyric_id = ?", lyric.getId());
            jdbcTemplate.update("DELETE FROM lyric_language_versions WHERE lyric_id = ?", lyric.getId());
            jdbcTemplate.update("DELETE FROM lyric_artist_ids WHERE lyric_id = ?", lyric.getId());
            jdbcTemplate.update("DELETE FROM lyric_artist_ids_legacy WHERE lyric_id = ?", lyric.getId());
            jdbcTemplate.update("DELETE FROM lyric_reciters WHERE lyric_id = ?", lyric.getId());
            lyricRepository.delete(lyric);
        }
        List<String> createdArtists = jdbcTemplate.queryForList(
                "SELECT artist_key FROM artists WHERE artist_key LIKE ?", String.class, prefix + "%");
        createdArtists.forEach(adminArtistService::delete);
        if (admin != null)
            adminUserRepository.deleteById(admin.getId());
    }

    @Test
    void combinedCreatePersistsAllHtmlTranslationsAndResolvedMetadata() throws Exception {
        String writer = createMappedArtist("Writer", List.of("POET"));
        String reciter = createMappedArtist("Reciter", List.of("RECITER"));
        Map<String, Object> request = combinedRequest(writer, reciter);

        String response = mockMvc.perform(post("/api/v1/admin/lyrics")
                .header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status", is("DRAFT")))
                .andExpect(jsonPath("$.data.writerId", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.artistId", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.artistIds[0]", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.artistIds[1]", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.writer", is(prefix + " Writer")))
                .andExpect(jsonPath("$.data.reciters[0]", is(prefix + " Reciter")))
                .andExpect(jsonPath("$.data.categoryIds[0]", is("naat-sharif")))
                .andExpect(jsonPath("$.data.subjectIds[0]", is("madina")))
                .andExpect(jsonPath("$.data.bookId", is("hadaiq-e-bakhshish")))
                .andExpect(jsonPath("$.data.featured", is(true)))
                .andExpect(jsonPath("$.data.mediaReferences[0].mediaType", is("AUDIO")))
                .andReturn().getResponse().getContentAsString();

        JsonNode data = objectMapper.readTree(response).path("data");
        assertEquals(numericArtistId(writer), data.path("writerId").asLong());
        assertEquals(numericArtistId(reciter), data.path("artistId").asLong());
        assertEquals(numericArtistId(writer), data.path("artistIds").get(0).asLong());
        assertEquals(numericArtistId(reciter), data.path("artistIds").get(1).asLong());
        JsonNode languages = data.path("languageVersions");
        assertEquals(3, languages.size());
        for (JsonNode language : languages) {
            assertEquals("HTML", language.path("contentFormat").asText());
            assertTrue(language.path("document").isNull());
        }
        JsonNode urdu = findLanguage(languages, "ur");
        assertEquals("<p><strong>Salam</strong> <span style=\"font-style: italic\">world</span></p>",
                urdu.path("content").asText());
        assertEquals("Salam world", urdu.path("plainText").asText());

        mockMvc.perform(get("/api/v1/lyrics/{reference}", data.path("legacyId").asText()))
                .andExpect(status().isNotFound());
    }

    @Test
    void publicBooksApiListsRequiredBooksWithUniqueNumericIds() throws Exception {
        String response = mockMvc.perform(get("/api/v1/books"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode books = objectMapper.readTree(response).path("data");
        assertTrue(books.size() >= 17);
        Set<Long> ids = new java.util.HashSet<>();
        Set<String> slugs = new java.util.HashSet<>();
        for (JsonNode book : books) {
            assertTrue(book.path("id").isIntegralNumber());
            assertTrue(book.path("name").isTextual());
            assertTrue(book.path("slug").isTextual());
            assertTrue(ids.add(book.path("id").asLong()));
            slugs.add(book.path("slug").asText());
        }
        assertTrue(slugs.containsAll(List.of(
                "hadaiq-e-bakhshish", "wasail-e-bakhshish", "safina-e-bakhshish",
                "zauq-e-naat", "qabala-e-bakhshish", "wasail-e-firdous", "bayaz-e-pak",
                "saman-e-bakhshish", "manaqib-e-attar", "guldasta-e-noorani",
                "aarzoo-e-deedar-e-madina", "deewan-e-salik",
                "kulliyat-e-naseer-gillani", "riaz-e-naeem",
                "noor-e-sadaqat", "madina-roses", "salam-o-durood")));
        JsonNode hadaiq = null;
        for (JsonNode book : books) {
            if ("hadaiq-e-bakhshish".equals(book.path("slug").asText())) {
                hadaiq = book;
                break;
            }
        }
        assertTrue(hadaiq != null);
        assertEquals("Hadaiq-e-Bakhshish", hadaiq.path("name").asText());
        assertEquals("Imam Ahmed Raza Khan", hadaiq.path("author").asText());
    }

    @Test
    void lyricBookSelectionPersistsAcrossCreateAndEditAndRejectsUnknownReferences() throws Exception {
        Map<String, Object> create = combinedRequest(null, null);
        create.put("bookId", "noor-e-sadaqat");
        String created = mockMvc.perform(post("/api/v1/admin/lyrics")
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(create)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.bookId", is("noor-e-sadaqat")))
                .andReturn().getResponse().getContentAsString();
        String reference = objectMapper.readTree(created).at("/data/legacyId").asText();

        mockMvc.perform(put("/api/v1/admin/lyrics/{reference}", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(Map.of(
                        "title", "Updated book " + prefix,
                        "bookId", "wasail-e-bakhshish"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookId", is("wasail-e-bakhshish")));
        mockMvc.perform(get("/api/v1/admin/lyrics/{reference}", reference)
                .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookId", is("wasail-e-bakhshish")));

        Map<String, Object> invalid = combinedRequest(null, null);
        invalid.put("slug", prefix + "-unknown-book");
        invalid.put("bookId", "not-a-known-book");
        mockMvc.perform(post("/api/v1/admin/lyrics")
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("INVALID_PARAMETER")));
    }

    @Test
    void combinedCategoryCreateEditAndPublicReadPreserveCanonicalAssociations() throws Exception {
        Map<String, Object> create = combinedRequest(null, null);
        create.put("categoryIds", List.of(
                numericMappingId("category_numeric_mappings", "category_key", "dua"),
                numericMappingId("category_numeric_mappings", "category_key", "sufi-kalam")));
        String created = mockMvc.perform(post("/api/v1/admin/lyrics")
                .header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(create)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String reference = objectMapper.readTree(created).at("/data/legacyId").asText();
        assertEquals(List.of("dua", "sufi-kalam"), categoryIdsFromAdminRead(reference));

        Map<String, Object> update = new HashMap<>();
        update.put("title", "Updated categories " + prefix);
        update.put("categoryIds", List.of(
                numericMappingId("category_numeric_mappings", "category_key", "other-kalam"),
                numericMappingId("category_numeric_mappings", "category_key", "tazmeen")));
        mockMvc.perform(put("/api/v1/admin/lyrics/{reference}", reference)
                .header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(update)))
                .andExpect(status().isOk());
        assertEquals(List.of("other-kalam", "tazmeen"), categoryIdsFromAdminRead(reference));

        long lyricId = jdbcTemplate.queryForObject(
                "SELECT id FROM lyrics WHERE legacy_id = ?", Long.class, reference);
        assertEquals(List.of("other-kalam", "tazmeen"), jdbcTemplate.queryForList(
                "SELECT category_id FROM lyric_category_assignments WHERE lyric_id = ? ORDER BY category_id",
                String.class, lyricId));

        mockMvc.perform(patch("/api/v1/admin/lyrics/{reference}/status", reference)
                .header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("PUBLISHED")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/lyrics/{reference}", reference))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.categoryIds[0]", is("other-kalam")))
                .andExpect(jsonPath("$.data.categoryIds[1]", is("tazmeen")));
    }

    @Test
    void artistCreateResponseIdCanBeReadAndUsedForLyricAssignments() throws Exception {
        String artistResponse = mockMvc.perform(post("/api/v1/admin/artists")
                .header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(Map.of(
                        "fullName", prefix + " Numeric Artist",
                        "roles", List.of("WRITER", "RECITER"),
                        "status", "ACTIVE"))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode artistData = objectMapper.readTree(artistResponse).path("data");
        assertTrue(artistData.path("id").isIntegralNumber());
        long artistId = artistData.path("id").asLong();
        String artistKey = artistData.path("artistKey").asText();
        assertEquals(artistId, artistData.path("numericId").asLong());
        assertEquals(artistId, jdbcTemplate.queryForObject(
                "SELECT id FROM artists WHERE artist_key = ?", Long.class, artistKey));

        mockMvc.perform(get("/api/v1/admin/artists/{id}", artistId)
                .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.artistKey", is(artistKey)));

        Map<String, Object> request = combinedRequest(null, null);
        request.put("writerId", artistId);
        request.put("reciterIds", List.of(artistId));
        mockMvc.perform(post("/api/v1/admin/lyrics")
                .header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.writerId", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.artistId", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.artistIds[0]", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.writer", is(prefix + " Numeric Artist")))
                .andExpect(jsonPath("$.data.reciters", is(List.of(prefix + " Numeric Artist"))));
    }

    @Test
    void legacyLyricsMetadataResolvesNumericArtistOptionIdsToDatabaseRelationships() throws Exception {
        String artistKey = createMappedArtist("Numeric Option Artist", List.of("WRITER", "RECITER"));
        long artistId = numericArtistId(artistKey);
        Map<String, Object> request = new HashMap<>();
        request.put("legacyId", prefix + "-numeric-option");
        request.put("title", prefix + " Numeric Option Lyric");
        request.put("writerId", Long.toString(artistId));
        request.put("artistId", Long.toString(artistId));
        request.put("artistIds", List.of(Long.toString(artistId)));
        request.put("reciters", List.of(Long.toString(artistId)));

        String response = mockMvc.perform(post("/api/v1/admin/lyrics")
                .header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.writerId", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.artistId", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.writer", is(prefix + " Numeric Option Artist")))
                .andExpect(jsonPath("$.data.artistIds[0]", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.reciters[0]", is(prefix + " Numeric Option Artist")))
                .andReturn().getResponse().getContentAsString();

        Long lyricId = lyricRepository.findByLegacyId(
                objectMapper.readTree(response).at("/data/legacyId").asText()).orElseThrow().getId();
        JsonNode lyricData = objectMapper.readTree(response).path("data");
        assertEquals(artistId, lyricData.path("writerId").asLong());
        assertEquals(artistId, lyricData.path("artistId").asLong());
        assertEquals(artistId, lyricData.path("artistIds").get(0).asLong());
        assertEquals(2, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM lyric_artist_ids WHERE lyric_id = ? AND artist_id = ?",
                Integer.class, lyricId, artistId));
    }

    @Test
    void combinedAssignmentsAllowDualRoleArtistsMultipleRecitersAndExplicitClearing() throws Exception {
        String dualRole = createMappedArtist("Dual Role", List.of("WRITER", "RECITER"));
        String additionalReciter = createMappedArtist("Additional Reciter", List.of("RECITER"));
        Map<String, Object> request = combinedRequest(dualRole, dualRole);
        request.put("reciterIds", List.of(numericArtistId(dualRole), numericArtistId(additionalReciter)));
        String created = mockMvc.perform(post("/api/v1/admin/lyrics")
                .header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.reciters.length()", is(2)))
                .andExpect(jsonPath("$.data.artistId", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.artistIds", org.hamcrest.Matchers.hasSize(2)))
                .andReturn().getResponse().getContentAsString();

        String reference = objectMapper.readTree(created).at("/data/legacyId").asText();
        Long lyricId = lyricRepository.findByLegacyId(reference).orElseThrow().getId();
        assertEquals(3, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM lyric_artist_ids WHERE lyric_id = ?", Integer.class, lyricId));
        assertEquals(2, jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM lyric_artist_ids la
                JOIN artists a ON a.id = la.artist_id
                WHERE la.lyric_id = ? AND a.artist_key = ? AND la.role IN ('WRITER', 'RECITER')
                """, Integer.class, lyricId, dualRole));

        mockMvc.perform(put("/api/v1/admin/lyrics/{reference}", reference)
                .header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(Map.of(
                        "title", "Cleared reciters " + prefix,
                        "reciterIds", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reciters", org.hamcrest.Matchers.empty()))
                .andExpect(jsonPath("$.data.writerId", org.hamcrest.Matchers.isA(Number.class)));
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM lyric_artist_ids WHERE lyric_id = ? AND role = 'RECITER'",
                Integer.class, lyricId));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM lyric_artist_ids WHERE lyric_id = ? AND role = 'WRITER'",
                Integer.class, lyricId));

        Map<String, Object> clearWriter = new HashMap<>();
        clearWriter.put("title", "Cleared writer " + prefix);
        clearWriter.put("writerId", null);
        clearWriter.put("bookId", null);
        clearWriter.put("featured", null);
        mockMvc.perform(put("/api/v1/admin/lyrics/{reference}", reference)
                .header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(clearWriter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.writerId", nullValue()))
                .andExpect(jsonPath("$.data.writer", nullValue()))
                .andExpect(jsonPath("$.data.bookId", nullValue()))
                .andExpect(jsonPath("$.data.featured", is(false)));
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM lyric_artist_ids WHERE lyric_id = ? AND role = 'WRITER'",
                Integer.class, lyricId));
    }

    @Test
    void combinedUpdateChangesOnlySubmittedLanguageAndPreservesPublicationAndRevisionHistory() throws Exception {
        String writer = createMappedArtist("Partial Writer", List.of("WRITER"));
        String reciter = createMappedArtist("Partial Reciter", List.of("NAAT_KHWAN"));
        Map<String, Object> create = combinedRequest(writer, reciter);
        String created = mockMvc.perform(post("/api/v1/admin/lyrics")
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(create)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String reference = objectMapper.readTree(created).at("/data/legacyId").asText();
        mockMvc.perform(get("/api/v1/admin/lyrics/{reference}", reference)
                .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.writerId", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.artistId", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.artistIds", org.hamcrest.Matchers.hasSize(2)));

        mockMvc.perform(put("/api/v1/admin/lyrics/{reference}", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(Map.of("title", "Title only " + prefix))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.writerId", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.reciters[0]", is(prefix + " Partial Reciter")))
                .andExpect(jsonPath("$.data.categoryIds[0]", is("naat-sharif")))
                .andExpect(jsonPath("$.data.languageVersions", org.hamcrest.Matchers.hasSize(3)));

        mockMvc.perform(patch("/api/v1/admin/lyrics/{reference}/status", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("PUBLISHED")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/lyrics/{reference}", reference))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.artistId", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.artistIds", org.hamcrest.Matchers.hasSize(2)))
                .andExpect(jsonPath("$.data.writerId", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.writer", is(prefix + " Partial Writer")))
                .andExpect(jsonPath("$.data.reciters[0]", is(prefix + " Partial Reciter")));
        mockMvc.perform(get("/api/v1/lyrics")
                .param("poet", Long.toString(numericArtistId(writer))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].writerId", org.hamcrest.Matchers.isA(Number.class)));

        String beforeUpdate = mockMvc.perform(get("/api/v1/admin/lyrics/{reference}", reference)
                .header("Authorization", bearer()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long expectedUrduVersion = findLanguage(
                objectMapper.readTree(beforeUpdate).at("/data/languageVersions"), "ur")
                .path("rowVersion").asLong();
        Map<String, Object> update = new HashMap<>();
        update.put("title", "Updated " + prefix);
        Map<String, Object> urduUpdate = new HashMap<>();
        urduUpdate.put("languageCode", "ur");
        urduUpdate.put("content", "<p><u>New text</u></p>");
        urduUpdate.put("contentFormat", "HTML");
        urduUpdate.put("expectedRowVersion", expectedUrduVersion);
        update.put("translations", List.of(urduUpdate));
        mockMvc.perform(put("/api/v1/admin/lyrics/{reference}", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("PUBLISHED")))
                .andExpect(jsonPath("$.data.languageVersions", org.hamcrest.Matchers.hasSize(3)))
                .andExpect(jsonPath("$.data.writerId", org.hamcrest.Matchers.isA(Number.class)))
                .andExpect(jsonPath("$.data.reciters[0]", is(prefix + " Partial Reciter")))
                .andExpect(jsonPath("$.data.categoryIds[0]", is("naat-sharif")))
                .andExpect(jsonPath("$.data.bookId", is("hadaiq-e-bakhshish")))
                .andExpect(jsonPath("$.data.featured", is(true)));

        Map<String, Object> staleUpdate = new HashMap<>(update);
        Map<String, Object> staleUrdu = new HashMap<>(urduUpdate);
        staleUrdu.put("content", "<p>Stale text</p>");
        staleUrdu.put("expectedRowVersion", expectedUrduVersion);
        staleUpdate.put("translations", List.of(staleUrdu));
        mockMvc.perform(put("/api/v1/admin/lyrics/{reference}", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(staleUpdate)))
                .andExpect(status().isConflict());

        String readback = mockMvc.perform(get("/api/v1/admin/lyrics/{reference}", reference)
                .header("Authorization", bearer()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode response = objectMapper.readTree(readback).path("data");
        JsonNode languages = response.path("languageVersions");
        assertEquals("PUBLISHED", response.path("status").asText());
        assertTrue(findLanguage(languages, "ur").path("status").isMissingNode());
        assertEquals("<p><u>New text</u></p>", findLanguage(languages, "ur").path("content").asText());
        assertEquals("<p>Hello</p>", findLanguage(languages, "hi").path("content").asText());
        assertEquals("<p>Salaam</p>", findLanguage(languages, "roman").path("content").asText());

        mockMvc.perform(get("/api/v1/admin/lyrics/{reference}/languages/ur/revisions", reference)
                .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].contentFormat", is("HTML")))
                .andExpect(jsonPath("$.data[0].content", org.hamcrest.Matchers.containsString("<strong>Salam</strong>")));
    }

    @Test
    void combinedCreateRejectsInvalidReferencesAndTranslationWithoutPartialRecords() throws Exception {
        String reciter = createMappedArtist("Invalid Reference Reciter", List.of("RECITER"));
        Map<String, Object> invalidReference = combinedRequest(null, reciter);
        invalidReference.put("reciterIds", List.of(9_999_999L));
        mockMvc.perform(post("/api/v1/admin/lyrics")
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(invalidReference)))
                .andExpect(status().isNotFound());

        Map<String, Object> invalidTranslation = combinedRequest(null, reciter);
        invalidTranslation.put("translations", List.of(
                Map.of("languageCode", "ur", "content", "<p>Valid</p>", "contentFormat", "HTML"),
                Map.of("languageCode", "hi", "content", "<script>alert(1)</script>", "contentFormat", "HTML")));
        mockMvc.perform(post("/api/v1/admin/lyrics")
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(invalidTranslation)))
                .andExpect(status().isBadRequest());

        assertFalse(lyricRepository.findBySlug(prefix + "-combined").isPresent());
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM lyric_language_versions v JOIN lyrics l ON l.id = v.lyric_id " +
                        "WHERE l.legacy_id = ?", Integer.class, prefix + "-combined"));
    }

    @Test
    void combinedCreateRejectsDuplicateLanguagesBeforePersistingAnyData() throws Exception {
        Map<String, Object> request = combinedRequest(null, null);
        request.put("translations", List.of(
                        Map.of("languageCode", "ur", "content", "<p>First</p>", "contentFormat", "HTML"),
                        Map.of("languageCode", "ur", "content", "<p>Second</p>", "contentFormat", "HTML")));

        mockMvc.perform(post("/api/v1/admin/lyrics")
                        .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(request)))
                        .andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.error", is("VALIDATION_ERROR")));

        assertFalse(lyricRepository.findBySlug(prefix + "-combined").isPresent());
        assertEquals(0, jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM lyric_language_versions v JOIN lyrics l ON l.id = v.lyric_id " +
                                "WHERE l.legacy_id = ?", Integer.class, prefix + "-combined"));
        assertEquals(0, jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM lyric_revisions r JOIN lyrics l ON l.id = r.lyric_id " +
                                "WHERE l.legacy_id = ?", Integer.class, prefix + "-combined"));
    }

    @Test
    void failureAfterTranslationWriteRollsBackLyricRelationshipsAndTranslations() throws Exception {
        String writer = createMappedArtist("Rollback Writer", List.of("LYRICIST"));
        String reciter = createMappedArtist("Rollback Reciter", List.of("RECITER"));
        AtomicInteger saves = new AtomicInteger();
        doAnswer(invocation -> {
            if (saves.incrementAndGet() == 2) {
                throw new IllegalArgumentException("Simulated translation persistence failure.");
            }
            Object result = invocation.callRealMethod();
            entityManager.flush();
            return result;
        }).when(persistenceServiceSpy).saveHtmlLanguageVersion(
                anyLong(), any(), anyString(), any(), any(), nullable(String.class), nullable(Long.class));

        mockMvc.perform(post("/api/v1/admin/lyrics")
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(combinedRequest(writer, reciter))))
                .andExpect(status().isBadRequest());

        assertFalse(lyricRepository.findBySlug(prefix + "-combined").isPresent());
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM lyric_language_versions v JOIN lyrics l ON l.id = v.lyric_id " +
                        "WHERE l.legacy_id = ?", Integer.class, prefix + "-combined"));
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM lyric_category_assignments ca JOIN lyrics l ON l.id = ca.lyric_id " +
                        "WHERE l.legacy_id = ?", Integer.class, prefix + "-combined"));
    }

    @Test
    void adminCrudPublishesDraftLanguageAndFiltersPublicList() throws Exception {
        String reference = createLyric("Naat API Test", "poet-test", "Reciter Test");
        mockMvc.perform(get("/api/v1/admin/lyrics/{id}", reference)
                .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.writerId", nullValue()));
        mockMvc.perform(get("/api/v1/lyrics/{id}", reference))
                .andExpect(status().isNotFound());

        mockMvc.perform(put("/api/v1/admin/lyrics/{id}/languages/roman", reference)
                .header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(languageBody("Mercy first")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.languageVersions[0].languageCode", is("roman")))
                .andExpect(jsonPath("$.data.languageVersions[0].status").doesNotExist());

        mockMvc.perform(patch("/api/v1/admin/lyrics/{id}/status", reference)
                .header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("PUBLISHED")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.languageVersions[0].status").doesNotExist());

        mockMvc.perform(get("/api/v1/lyrics/{id}", reference))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title", is("Naat API Test")))
                .andExpect(jsonPath("$.data.languageVersions", org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$.data.languageVersions[0].code", is("roman")))
                .andExpect(jsonPath("$.data.languageVersions[0].status").doesNotExist())
                .andExpect(jsonPath("$.data.createdBy").doesNotExist());

        mockMvc.perform(get("/api/v1/lyrics")
                .param("page", "0").param("size", "10")
                .param("category", "naat-sharif")
                .param("reciter", "reciter")
                .param("poet", "poet-test")
                .param("language", "roman"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].id", is(reference)))
                .andExpect(jsonPath("$.data.totalElements", is(1)));

        mockMvc.perform(patch("/api/v1/admin/lyrics/{id}/status", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("DRAFT")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/lyrics/{id}", reference)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/lyrics")
                .param("page", "0").param("size", "10").param("language", "roman"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements", is(0)));
    }

    @Test
    void savesAndReloadsFormattedHindiTranslation() throws Exception {
        String reference = createLyric("Formatted Hindi", "poet-formatted-hi", "Reciter Formatted Hi");
        JsonNode document = objectMapper.readTree("""
                {"type":"doc","content":[
                  {"type":"paragraph","attrs":{"textAlign":"right","paragraphSpacing":"8px"},"content":[
                    {"type":"text","text":"\u0928\u092e\u0938\u094d\u0924\u0947","marks":[
                      {"type":"textStyle","attrs":{"color":"#FF0000","fontSize":"18px","fontFamily":"Noto Sans Devanagari"}},
                      {"type":"bold"}
                    ]},
                    {"type":"hardBreak"},
                    {"type":"text","text":"\u0926\u0941\u0928\u093f\u092f\u093e","marks":[{"type":"italic"},{"type":"underline"}]}
                  ]}
                ]}
                """);
        Map<String, Object> request = new HashMap<>();
        request.put("document", document);

        mockMvc.perform(put("/api/v1/admin/lyrics/{id}/languages/hi", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.languageVersions[0].document.content[0].attrs.paragraphSpacing", is("8px")))
                .andExpect(jsonPath("$.data.languageVersions[0].document.content[0].content[0].marks[0].attrs.fontSize", is("18px")))
                .andExpect(jsonPath("$.data.languageVersions[0].document.content[0].content[0].marks[0].attrs.color", is("#FF0000")));

        String reloaded = mockMvc.perform(get("/api/v1/admin/lyrics/{id}", reference)
                .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertEquals(document, objectMapper.readTree(reloaded)
                .at("/data/languageVersions/0/document"));
    }

    @Test
    void languageUpdatesAreIndependentAndCreatePriorContentRevisions() throws Exception {
        String reference = createLyric("Independent versions", "poet-isolated", "Reciter Isolated");
        String firstSave = mockMvc.perform(put("/api/v1/admin/lyrics/{id}/languages/roman", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(languageBody("Roman prior")))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long romanVersion = objectMapper.readTree(firstSave).at("/data/languageVersions/0/rowVersion").asLong();
        mockMvc.perform(put("/api/v1/admin/lyrics/{id}/languages/hi", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(languageBody("हिंदी पाठ")))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/v1/admin/lyrics/{id}/languages/roman", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(languageBody("Roman revised", romanVersion)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.languageVersions", org.hamcrest.Matchers.hasSize(2)))
                .andExpect(jsonPath("$.data.languageVersions[0].languageCode", is("hi")))
                .andExpect(jsonPath("$.data.languageVersions[0].plainText", is("हिंदी पाठ")))
                .andExpect(jsonPath("$.data.languageVersions[1].languageCode", is("roman")))
                .andExpect(jsonPath("$.data.languageVersions[1].plainText", is("Roman revised")));

        mockMvc.perform(get("/api/v1/admin/lyrics/{id}/languages/roman/revisions", reference)
                .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].plainText", is("Roman prior")))
                .andExpect(jsonPath("$.data[0].revisionNumber", is(1)));
    }

    @Test
    void editingPublishedLyricKeepsParentPublishedAndTranslationPublic() throws Exception {
        String reference = createLyric("Draft on edit", "poet-edit", "Reciter Edit");
        long publishedVersion = saveAndPublishRoman(reference);

        mockMvc.perform(put("/api/v1/admin/lyrics/{id}/languages/roman", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(languageBody("Needs review", publishedVersion)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("PUBLISHED")))
                .andExpect(jsonPath("$.data.languageVersions[0].status").doesNotExist());

        mockMvc.perform(get("/api/v1/lyrics/{id}", reference))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.languageVersions[0].text", is("Needs review")));
    }

    @Test
    void publicationRequiresValidSavedTranslationAndUnsupportedApiLanguageIsRejected() throws Exception {
        String reference = createLyric("Publish rule", "poet-publish", "Reciter Publish");
        mockMvc.perform(patch("/api/v1/admin/lyrics/{id}/status", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("PUBLISHED")))
                .andExpect(status().isConflict());

        mockMvc.perform(put("/api/v1/admin/lyrics/{id}/languages/roman", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(languageBody("Saved while draft")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.languageVersions[0].status").doesNotExist());
        mockMvc.perform(patch("/api/v1/admin/lyrics/{id}/status", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("PUBLISHED")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/lyrics/{id}", reference))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.languageVersions[0].text", is("Saved while draft")));

        mockMvc.perform(put("/api/v1/admin/lyrics/{id}/languages/en", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(languageBody("Not an API language")))
                .andExpect(status().isBadRequest());
        assertEquals(1, languageVersionRepository.count());
    }

    @Test
    void rejectsUnsafeDocumentsAndDoesNotPersistThem() throws Exception {
        String reference = createLyric("Validator route", "poet-validator", "Reciter Validator");
        String invalid = "{\"document\":{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{" +
                "\"type\":\"text\",\"text\":\"bad\",\"marks\":[{\"type\":\"textStyle\",\"attrs\":{\"fontFamily\":\"Comic Sans\"}}]}]}]}}";
        mockMvc.perform(put("/api/v1/admin/lyrics/{id}/languages/roman", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(invalid))
                .andExpect(status().isBadRequest());
        org.junit.jupiter.api.Assertions.assertEquals(0,
                languageVersionRepository.findAllByLyric_IdOrderByLanguageCode(
                        lyricRepository.findByLegacyId(reference).orElseThrow().getId()).size());
    }

    @Test
    void exposesPersistedHtmlFormatInPublicLanguageVersionResponses() throws Exception {
        String reference = createLyric("HTML public response", "poet-html", "Reciter HTML");
        Lyric lyric = lyricRepository.findByLegacyId(reference).orElseThrow();
        persistenceService.saveHtmlLanguageVersion(
                lyric.getId(), LyricLanguageCode.ur, "<p dir=\"rtl\">اردو</p>",
                ContentStatus.DRAFT, admin, null, null);
        mockMvc.perform(patch("/api/v1/admin/lyrics/{id}/status", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("PUBLISHED")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.languageVersions[0].status").doesNotExist());

        mockMvc.perform(get("/api/v1/lyrics/{id}", reference))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.languageVersions[0].contentFormat", is("HTML")))
                .andExpect(jsonPath("$.data.languageVersions[0].content", is("<p dir=\"rtl\">اردو</p>")))
                .andExpect(jsonPath("$.data.languageVersions[0].document").value(nullValue()));
    }

    @Test
    void staleLanguageVersionReturnsConflictWithoutOverwritingServerDocument() throws Exception {
        String reference = createLyric("Concurrent edit", "poet-concurrent", "Reciter Concurrent");
        String initialSave = mockMvc.perform(put("/api/v1/admin/lyrics/{id}/languages/roman", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(languageBody("Server original")))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long expectedVersion = objectMapper.readTree(initialSave).at("/data/languageVersions/0/rowVersion").asLong();
        mockMvc.perform(put("/api/v1/admin/lyrics/{id}/languages/roman", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(languageBody("Concurrent server update", expectedVersion)))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/v1/admin/lyrics/{id}/languages/roman", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(languageBody("Stale browser update", expectedVersion)))
                .andExpect(status().isConflict());
        mockMvc.perform(get("/api/v1/admin/lyrics/{id}", reference).header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.languageVersions[0].plainText", is("Concurrent server update")));
    }

    @Test
    void unauthorizedAndInsufficientRoleRequestsAreRejected() throws Exception {
        mockMvc.perform(get("/api/v1/admin/lyrics"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.data").value(nullValue()));
        mockMvc.perform(get("/api/v1/admin/lyrics")
                .with(SecurityMockMvcRequestPostProcessors.user("viewer").roles("VIEWER")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error", is("FORBIDDEN")));
    }

    @Test
    void missingLyricsReturnNotFoundAndDeleteRefusesVersionHistory() throws Exception {
        mockMvc.perform(get("/api/v1/admin/lyrics/{id}", prefix + "-missing")
                .header("Authorization", bearer()))
                .andExpect(status().isNotFound());

        String empty = createLyric("Delete empty draft", "poet-delete", "Reciter Delete");
        mockMvc.perform(delete("/api/v1/admin/lyrics/{id}", empty).header("Authorization", bearer()))
                .andExpect(status().isNoContent());

        String withContent = createLyric("Keep history", "poet-history", "Reciter History");
        mockMvc.perform(put("/api/v1/admin/lyrics/{id}/languages/roman", withContent)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(languageBody("Keep this snapshot")))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/api/v1/admin/lyrics/{id}", withContent).header("Authorization", bearer()))
                .andExpect(status().isConflict());
    }

    @Test
    void oversizedLyricsJsonBodyReturns413() throws Exception {
        String reference = createLyric("Payload limit", "poet-size", "Reciter Size");
        String body = "{\"document\":{\"type\":\"doc\",\"content\":[]},\"changeNote\":\""
                + "x".repeat(520 * 1024) + "\"}";
        mockMvc.perform(put("/api/v1/admin/lyrics/{id}/languages/roman", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.error", is("PAYLOAD_TOO_LARGE")));
    }

    private String createLyric(String title, String poet, String reciter) throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("legacyId", prefix + "-" + poet);
        request.put("title", title);
        request.put("slug", prefix + "-" + poet);
        request.put("writerId", poet);
        request.put("writerName", "API Test Poet");
        request.put("categoryIds", List.of("naat-sharif"));
        request.put("subjectIds", List.of("madina"));
        request.put("reciters", List.of(reciter));
        request.put("artistIds", List.of("test-artist"));
        request.put("tags", List.of("api-test"));
        String response = mockMvc.perform(post("/api/v1/admin/lyrics")
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode data = objectMapper.readTree(response).path("data");
        return data.path("legacyId").asText();
    }

    private List<String> categoryIdsFromAdminRead(String reference) throws Exception {
        String response = mockMvc.perform(get("/api/v1/admin/lyrics/{reference}", reference)
                .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode categoryIds = objectMapper.readTree(response).at("/data/categoryIds");
        return objectMapper.convertValue(categoryIds, objectMapper.getTypeFactory()
                .constructCollectionType(List.class, String.class));
    }

    private Map<String, Object> combinedRequest(String writerKey, String reciterKey) {
        Map<String, Object> request = new HashMap<>();
        request.put("title", "Combined " + prefix);
        request.put("slug", prefix + "-combined");
        request.put("writerId", writerKey == null ? null : numericArtistId(writerKey));
        request.put("reciterIds", reciterKey == null ? List.of() : List.of(numericArtistId(reciterKey)));
        request.put("categoryIds", List.of(numericMappingId(
                "category_numeric_mappings", "category_key", "naat-sharif")));
        request.put("subjectIds", List.of(numericMappingId(
                "subject_numeric_mappings", "subject_key", "madina")));
        request.put("tags", List.of("combined-test"));
        request.put("bookId", "hadaiq-e-bakhshish");
        request.put("featured", true);
        request.put("mediaReferences", List.of(Map.of(
                "mediaType", "AUDIO", "title", "Recitation", "url", "https://example.test/audio")));
        request.put("translations", List.of(
                Map.of("languageCode", "ur",
                        "content", "<p><strong>Salam</strong> <span style=\"font-style: italic\">world</span></p>",
                        "contentFormat", "HTML"),
                Map.of("languageCode", "hi", "content", "<p>Hello</p>", "contentFormat", "HTML"),
                Map.of("languageCode", "roman", "content", "<p>Salaam</p>", "contentFormat", "HTML")));
        return request;
    }

    private String createMappedArtist(String label, List<String> roles) {
        return adminArtistService.create(new ArtistDtos.CreateArtistRequest(
                prefix + " " + label, null, roles, null, "ACTIVE")).artistKey();
    }

    private long numericArtistId(String artistKey) {
        return numericMappingId("artist_numeric_mappings", "artist_key", artistKey);
    }

    private long numericMappingId(String table, String keyColumn, String key) {
        return jdbcTemplate.queryForObject(
                "SELECT id FROM " + table + " WHERE " + keyColumn + " = ?", Long.class, key);
    }

    private static int countSubjects(JsonNode subjects, String id) {
        int matches = 0;
        for (JsonNode subject : subjects) {
            if (id.equals(subject.path("id").asText())) {
                matches++;
            }
        }
        return matches;
    }

    private static JsonNode findSubject(JsonNode subjects, String id) {
        for (JsonNode subject : subjects) {
            if (id.equals(subject.path("id").asText())) {
                return subject;
            }
        }
        throw new AssertionError("Subject not found: " + id);
    }

    private JsonNode findLanguage(JsonNode languageVersions, String languageCode) {
        for (JsonNode language : languageVersions) {
            if (languageCode.equals(language.path("languageCode").asText())) {
                return language;
            }
        }
        throw new AssertionError("Language version not found: " + languageCode);
    }

    private long saveAndPublishRoman(String reference) throws Exception {
        String savedResponse = mockMvc.perform(put("/api/v1/admin/lyrics/{id}/languages/roman", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(languageBody("Published line")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        mockMvc.perform(patch("/api/v1/admin/lyrics/{id}/status", reference)
                .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(statusBody("PUBLISHED")))
                .andExpect(status().isOk());
        return objectMapper.readTree(savedResponse).at("/data/languageVersions/0/rowVersion").asLong();
    }

    private String languageBody(String text) throws Exception {
        return languageBody(text, null);
    }

    private String languageBody(String text, Long expectedRowVersion) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("document", Map.of("type", "doc", "content", List.of(
                Map.of("type", "paragraph", "content", List.of(Map.of("type", "text", "text", text))))));
        if (expectedRowVersion != null)
            body.put("expectedRowVersion", expectedRowVersion);
        return objectMapper.writeValueAsString(body);
    }

    private String statusBody(String status) throws Exception {
        return objectMapper.writeValueAsString(Map.of("status", status));
    }

    private String bearer() {
        return "Bearer " + token;
    }
}