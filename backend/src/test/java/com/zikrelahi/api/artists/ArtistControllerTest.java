package com.zikrelahi.api.artists;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zikrelahi.api.admin.*;
import com.zikrelahi.api.auth.LoginRequest;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ArtistControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private AdminUserRepository adminUserRepository;
    @Autowired private ArtistRepository artistRepository;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private PasswordEncoder passwordEncoder;

    private static final String EMAIL = "artisttest@example.com";
    private static final String PASSWORD = "ArtistTest123!";
    private String token;

    @BeforeEach
    void setUp() throws Exception {
        clearTestArtists();
        adminUserRepository.deleteAll();
        adminUserRepository.save(AdminUser.builder()
                .email(EMAIL).passwordHash(passwordEncoder.encode(PASSWORD))
                .displayName("Test").role(AdminRole.ADMIN).enabled(true).build());
        token = login();
    }

    @AfterEach
    void tearDown() {
        clearTestArtists();
        adminUserRepository.deleteAll();
    }

    private void clearTestArtists() {
        for (String legacyId : List.of("artist-reference-test", "role-change-reference-test")) {
            jdbcTemplate.update("DELETE FROM lyric_artist_ids WHERE lyric_id IN "
                    + "(SELECT id FROM lyrics WHERE legacy_id = ?)", legacyId);
            jdbcTemplate.update("DELETE FROM lyric_artist_ids_legacy WHERE lyric_id IN "
                    + "(SELECT id FROM lyrics WHERE legacy_id = ?)", legacyId);
            jdbcTemplate.update("DELETE FROM lyric_reciters WHERE lyric_id IN "
                    + "(SELECT id FROM lyrics WHERE legacy_id = ?)", legacyId);
            jdbcTemplate.update("DELETE FROM lyrics WHERE legacy_id = ?", legacyId);
        }
        Set<String> migratedIds = Set.of("owais-raza-qadri", "zohaib-ashrafi", "traditional");
        artistRepository.findAll().stream()
                .filter(artist -> !migratedIds.contains(artist.getArtistKey()))
                .toList()
                .forEach(artistRepository::delete);
        List<Artist> migratedArtists = artistRepository.findAll().stream()
                .filter(artist -> migratedIds.contains(artist.getArtistKey()))
                .toList();
        migratedArtists.forEach(artist -> artist.setStatus(ArtistStatus.ACTIVE));
        artistRepository.saveAll(migratedArtists);
        artistRepository.flush();
    }

    @Test
    void seededArtistsExist() throws Exception {
        mockMvc.perform(get("/api/v1/admin/artists").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements", is(3)))
                .andExpect(jsonPath("$.data.items[0].id", isA(Number.class)));
    }

    @Test
    void getSeededArtist() throws Exception {
        mockMvc.perform(get("/api/v1/admin/artists/owais-raza-qadri").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id", isA(Number.class)))
                .andExpect(jsonPath("$.data.artistKey", is("owais-raza-qadri")))
                .andExpect(jsonPath("$.data.roles", hasItems("SINGER", "RECITER", "NAAT_KHWAN")));
    }

    @Test
    void createArtistWithOneRole() throws Exception {
        mockMvc.perform(post("/api/v1/admin/artists").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Test Artist", null, List.of("SINGER"), null)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id", isA(Number.class)))
                .andExpect(jsonPath("$.data.artistKey", is("test-artist")))
                .andExpect(jsonPath("$.data.numericId", isA(Number.class)));
    }

    @Test
    void createArtistWithMultipleRoles() throws Exception {
        mockMvc.perform(post("/api/v1/admin/artists").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Multi Artist", "Multi", List.of("SINGER","POET","COMPOSER"), "Bio")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.roles", hasItems("SINGER","POET","COMPOSER")));
    }

    @Test
    void createsUnicodeNameWithNumericIdAndStringArtistKey() throws Exception {
        mockMvc.perform(post("/api/v1/admin/artists").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("नात कलाकार", null,
                                List.of("SINGER", "WRITER", "LYRICIST", "POET", "RECITER", "NAAT_KHWAN", "COMPOSER", "OTHER"), null)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id", isA(Number.class)))
                .andExpect(jsonPath("$.data.artistKey", is("नात-कलाकार")))
                .andExpect(jsonPath("$.data.roles", hasSize(8)));
    }

    @Test
    void rejectsNameThatCannotProduceAnId() throws Exception {
        mockMvc.perform(post("/api/v1/admin/artists").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("!!!", null, List.of("SINGER"), null)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createDuplicateReturns409() throws Exception {
        mockMvc.perform(post("/api/v1/admin/artists").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Owais Raza Qadri", null, List.of("SINGER"), null)))
                .andExpect(status().isConflict());
    }

    @Test
    void createInvalidRoleReturns400() throws Exception {
        mockMvc.perform(post("/api/v1/admin/artists").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Bad", null, List.of("SUPERSTAR"), null)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateArtist() throws Exception {
        String createdResponse = mockMvc.perform(post("/api/v1/admin/artists").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Update Me", null, List.of("SINGER"), null)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long artistId = objectMapper.readTree(createdResponse).at("/data/id").asLong();
        mockMvc.perform(put("/api/v1/admin/artists/{id}", artistId).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Updated", "Disp", List.of("WRITER","POET"), "Bio")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.fullName", is("Updated")))
                .andExpect(jsonPath("$.data.id", isA(Number.class)))
                .andExpect(jsonPath("$.data.artistKey", is("update-me")))
                .andExpect(jsonPath("$.data.roles", hasItems("WRITER","POET")));
    }

    @Test
    void getUnknownReturns404() throws Exception {
        mockMvc.perform(get("/api/v1/admin/artists/nope").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteUnreferencedArtist() throws Exception {
        String createdResponse = mockMvc.perform(post("/api/v1/admin/artists").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Disposable Artist", null, List.of("OTHER"), null)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long artistId = objectMapper.readTree(createdResponse).at("/data/id").asLong();

        mockMvc.perform(delete("/api/v1/admin/artists/{id}", artistId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/admin/artists/{id}", artistId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void lyricReferenceCountIsNumericForUnreferencedAndReferencedArtists() throws Exception {
        mockMvc.perform(post("/api/v1/admin/artists").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Counted Artist", null, List.of("SINGER"), null)))
                .andExpect(status().isCreated());

        Artist countedArtist = artistRepository.findByArtistKey("counted-artist").orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(0L, artistRepository.countLyricReferences(
                countedArtist.getId(), countedArtist.getArtistKey()));
        jdbcTemplate.update("""
                INSERT INTO lyrics (legacy_id, title, slug, artist_id, status)
                VALUES (?, ?, ?, ?, ?)
                """, "artist-reference-test", "Linked", "linked-counted-artist", countedArtist.getId(), "DRAFT");
        org.junit.jupiter.api.Assertions.assertEquals(1L, artistRepository.countLyricReferences(
                countedArtist.getId(), countedArtist.getArtistKey()));
    }

    @Test
    void deleteReferencedArtistIsRejectedWithoutChangingLyricLinks() throws Exception {
        mockMvc.perform(post("/api/v1/admin/artists").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Linked Artist", null, List.of("SINGER"), null)))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/v1/admin/artists").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Many Linked Artist", null, List.of("SINGER"), null)))
                .andExpect(status().isCreated());
        jdbcTemplate.update("""
                INSERT INTO lyrics (legacy_id, title, slug, artist_id, status)
                VALUES (?, ?, ?, ?, ?)
                """, "artist-reference-test", "Linked", "linked-artist-test",
                jdbcTemplate.queryForObject("SELECT id FROM artists WHERE artist_key = 'linked-artist'", Long.class),
                "DRAFT");
        Long lyricId = jdbcTemplate.queryForObject("SELECT id FROM lyrics WHERE legacy_id = ?",
                Long.class, "artist-reference-test");
        Long manyLinkedArtistId = jdbcTemplate.queryForObject(
                "SELECT id FROM artists WHERE artist_key = ?", Long.class, "many-linked-artist");
        jdbcTemplate.update("""
                INSERT INTO lyric_artist_ids (lyric_id, artist_id, role, position)
                VALUES (?, ?, 'RECITER', 0)
                """, lyricId, manyLinkedArtistId);

        mockMvc.perform(delete("/api/v1/admin/artists/linked-artist")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/v1/admin/artists/linked-artist")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id", isA(Number.class)))
                .andExpect(jsonPath("$.data.artistKey", is("linked-artist")));
        mockMvc.perform(delete("/api/v1/admin/artists/many-linked-artist")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals(jdbcTemplate.queryForObject(
                        "SELECT id FROM artists WHERE artist_key = 'linked-artist'", Long.class),
                jdbcTemplate.queryForObject("SELECT artist_id FROM lyrics WHERE legacy_id = ?",
                        Long.class, "artist-reference-test"));
        org.junit.jupiter.api.Assertions.assertEquals(manyLinkedArtistId,
                jdbcTemplate.queryForObject("SELECT artist_id FROM lyric_artist_ids WHERE lyric_id = ?",
                        Long.class, lyricId));
    }

    @Test
    void assignedWriterRoleCannotBeRemoved() throws Exception {
        mockMvc.perform(post("/api/v1/admin/artists").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Role Change Artist", null, List.of("WRITER"), null)))
                .andExpect(status().isCreated());
        Long artistId = jdbcTemplate.queryForObject(
                "SELECT id FROM artists WHERE artist_key = 'role-change-artist'", Long.class);
        jdbcTemplate.update("""
                INSERT INTO lyrics (legacy_id, title, slug, status)
                VALUES ('role-change-reference-test', 'Role Change', 'role-change-reference-test', 'DRAFT')
                """);
        Long lyricId = jdbcTemplate.queryForObject(
                "SELECT id FROM lyrics WHERE legacy_id = 'role-change-reference-test'", Long.class);
        jdbcTemplate.update("""
                INSERT INTO lyric_artist_ids (lyric_id, artist_id, role, position)
                VALUES (?, ?, 'WRITER', NULL)
                """, lyricId, artistId);

        mockMvc.perform(put("/api/v1/admin/artists/role-change-artist")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Role Change Artist", null, List.of("OTHER"), null)))
                .andExpect(status().isConflict());
        org.junit.jupiter.api.Assertions.assertEquals("WRITER",
                jdbcTemplate.queryForObject("SELECT role FROM artist_roles WHERE artist_id = ?",
                        String.class, artistId));
    }

    @Test
    void filterByRole() throws Exception {
        mockMvc.perform(get("/api/v1/admin/artists").param("role","RECITER").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements", is(3)));
    }

    @Test
    void filterByStatus() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/artists/traditional/status").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"INACTIVE\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/admin/artists").param("status","ACTIVE").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements", is(2)));
    }

    @Test
    void searchByName() throws Exception {
        mockMvc.perform(get("/api/v1/admin/artists").param("query","owais").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements", is(1)));
    }

    @Test
    void optionsForRole() throws Exception {
        mockMvc.perform(get("/api/v1/admin/artists/options").param("role","SINGER").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data", hasSize(2)));
    }

    @Test
    void optionsSearchDisplayNameAndAdminOptionsRequireAuthentication() throws Exception {
        mockMvc.perform(post("/api/v1/admin/artists").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Option Artist", "Stage Alias", List.of("SINGER"), null)))
                .andExpect(status().isCreated());
        mockMvc.perform(get("/api/v1/admin/artists/options").param("query", "stage alias")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id", isA(Number.class)))
                .andExpect(jsonPath("$.data[0].artistKey", is("option-artist")))
                .andExpect(jsonPath("$.data[0].numericId").doesNotExist());
        mockMvc.perform(get("/api/v1/admin/artists/options"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void optionsExcludeInactive() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/artists/zohaib-ashrafi/status").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"INACTIVE\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/admin/artists/options").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", not(hasItem("zohaib-ashrafi"))));
    }

    @Test
    void getRoles() throws Exception {
        mockMvc.perform(get("/api/v1/admin/artists/roles").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data", hasSize(8)));
    }

    @Test
    void deactivate() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/artists/owais-raza-qadri/status").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"INACTIVE\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status", is("INACTIVE")));
    }

    @Test
    void noTokenReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/admin/artists")).andExpect(status().isUnauthorized());
    }

    @Test
    void adminApiPreflightAllowsConfiguredLocalFrontendOrigin() throws Exception {
        mockMvc.perform(options("/api/v1/admin/artists")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Methods", containsString("GET")))
                .andExpect(header().string("Access-Control-Allow-Headers", containsString("authorization")));
    }

    @Test
    void artistRolesPreflightAllowsConfiguredLocalFrontendOrigin() throws Exception {
        mockMvc.perform(options("/api/v1/admin/artists/roles")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Methods", containsString("GET")))
                .andExpect(header().string("Access-Control-Allow-Headers", containsString("authorization")));
    }

    @Test
    void disallowedOriginDoesNotReceiveCorsPermission() throws Exception {
        mockMvc.perform(options("/api/v1/admin/artists")
                        .header("Origin", "http://localhost:9999")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "authorization"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void publicOptionsNoAuth() throws Exception {
        mockMvc.perform(get("/api/v1/artists/options"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id", isA(Number.class)))
                .andExpect(jsonPath("$.data[0].artistKey", isA(String.class)));
    }

    @Test
    void publicRolesNoAuth() throws Exception {
        mockMvc.perform(get("/api/v1/artists/roles")).andExpect(status().isOk());
    }

    @Test
    void missingStatusIsRejected() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/artists/traditional/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    private String body(String name, String disp, List<String> roles, String bio) throws Exception {
        var m = new LinkedHashMap<String,Object>(); m.put("fullName",name); m.put("roles",roles);
        if (disp!=null) m.put("displayName",disp); if (bio!=null) m.put("biography",bio);
        return objectMapper.writeValueAsString(m);
    }

    private String login() throws Exception {
        String b = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(EMAIL, PASSWORD))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(b).path("data").path("accessToken").asText();
    }
}