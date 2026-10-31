package com.zikrelahi.api.audio;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zikrelahi.api.admin.AdminRole;
import com.zikrelahi.api.admin.AdminUser;
import com.zikrelahi.api.admin.AdminUserRepository;
import com.zikrelahi.api.artists.ArtistRepository;
import com.zikrelahi.api.media.CloudinaryMediaService;
import com.zikrelahi.api.media.MediaUploadResult;
import com.zikrelahi.api.security.JwtTokenProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.mock.web.MockPart;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminAudioControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private AdminUserRepository adminUserRepository;
    @Autowired
    private ArtistRepository artistRepository;
    @Autowired
    private AudioRepository audioRepository;
    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private AdminAudioService audioService;
    @Autowired
    private JwtTokenProvider tokenProvider;
    @MockBean
    private CloudinaryMediaService cloudinaryMediaService;

    private AdminUser admin;
    private String token;
    private String titlePrefix;

    @BeforeEach
    void setUp() {
        titlePrefix = "Audio API " + UUID.randomUUID();
        admin = adminUserRepository.saveAndFlush(AdminUser.builder()
                .email(UUID.randomUUID() + "@audio-test.example")
                .passwordHash("not-used-by-bearer-tests")
                .displayName("Audio API Test Admin")
                .role(AdminRole.ADMIN)
                .enabled(true)
                .build());
        token = tokenProvider.generateAccessToken(admin.getEmail(), admin.getRole().name(), admin.getId());

        when(cloudinaryMediaService.uploadAudio(any())).thenAnswer(invocation ->
                new MediaUploadResult(
                        "https://res.cloudinary.com/test/video/upload/audio.mp3",
                        "zikr-e-ilahi/audio/audio-" + UUID.randomUUID(),
                        "mp3",
                        128,
                        "track.mp3",
                        42));
        when(cloudinaryMediaService.uploadCoverImage(any())).thenAnswer(invocation ->
                new MediaUploadResult(
                        "https://res.cloudinary.com/test/image/upload/cover.jpg",
                        "zikr-e-ilahi/audio-covers/cover-" + UUID.randomUUID(),
                        "jpg",
                        64,
                        "cover.jpg",
                        null));
    }

    @AfterEach
    void cleanUp() {
        audioRepository.findAll().stream()
                .filter(audio -> audio.getTitle().startsWith(titlePrefix))
                .map(Audio::getId)
                .toList()
                .forEach(audioService::delete);
        adminUserRepository.delete(admin);
    }

    @Test
    void adminCatalogRoutesRequireAdminAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/audios"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/audio-categories"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/languages"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void categoryAndLanguageOptionsReturnActiveMasterRecords() throws Exception {
        mockMvc.perform(get("/api/admin/audio-categories").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].categoryKey").exists());
        mockMvc.perform(get("/api/admin/languages").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].code").exists());
    }

    @Test
    void createsListsAndUpdatesAudioWithOrderedArtistCredits() throws Exception {
        long artistId = artistRepository.findByArtistKey("owais-raza-qadri").orElseThrow().getId();
        MvcResult createdResult = mockMvc.perform(audioMultipart(
                "/api/admin/audios",
                requestJson("PUBLISHED", "hamd", artistId),
                true,
                true))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title", is(titlePrefix + " track")))
                .andExpect(jsonPath("$.data.status", is("PUBLISHED")))
                .andExpect(jsonPath("$.data.singers[0].id", is((int) artistId)))
                .andExpect(jsonPath("$.data.writers[0].id", is((int) artistId)))
                .andReturn();

        long audioId = objectMapper.readTree(createdResult.getResponse().getContentAsString())
                .at("/data/id").asLong();

        mockMvc.perform(get("/api/admin/audios")
                        .queryParam("query", titlePrefix)
                        .queryParam("status", "PUBLISHED")
                        .queryParam("languageCode", "ur")
                        .queryParam("categoryKey", "hamd")
                        .queryParam("sort", "title")
                        .queryParam("direction", "ASC")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements", is(1)))
                .andExpect(jsonPath("$.data.items[0].id", is((int) audioId)));

        mockMvc.perform(get("/api/admin/audios/{id}", audioId)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.language.code", is("ur")))
                .andExpect(jsonPath("$.data.categories[0].categoryKey", is("hamd")));

        mockMvc.perform(audioMultipart(
                "/api/admin/audios/" + audioId,
                requestJson("", "naat-sharif", artistId),
                false,
                false).with(request -> {
                    request.setMethod("PUT");
                    return request;
                }))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("PUBLISHED")))
                .andExpect(jsonPath("$.data.audioPublicId").value(
                        objectMapper.readTree(createdResult.getResponse().getContentAsString())
                                .at("/data/audioPublicId").asText()))
                .andExpect(jsonPath("$.data.categories[0].categoryKey", is("naat-sharif")));
    }

    @Test
    void persistsArtistAssignmentsFromArtistsMultipartArray() throws Exception {
        long artistId = artistRepository.findByArtistKey("owais-raza-qadri").orElseThrow().getId();
        byte[] data = objectMapper.writeValueAsBytes(Map.of(
                "title", titlePrefix + " artist array",
                "description", "Audio API integration test",
                "languageCode", "ur",
                "categoryKeys", List.of("naat-sharif"),
                "artists", List.of(
                        Map.of("artistId", artistId, "role", "SINGER", "position", 0),
                        Map.of("artistId", artistId, "role", "WRITER", "position", 0)),
                "status", "DRAFT"));

        MvcResult created = mockMvc.perform(audioMultipart("/api/admin/audios", data, true, true))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.singers[0].id", is((int) artistId)))
                .andExpect(jsonPath("$.data.writers[0].id", is((int) artistId)))
                .andReturn();
        long audioId = objectMapper.readTree(created.getResponse().getContentAsString())
                .at("/data/id").asLong();

        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audio_artist_ids WHERE audio_id = ? AND artist_id = ? AND role = 'SINGER'",
                Integer.class, audioId, artistId));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audio_artist_ids WHERE audio_id = ? AND artist_id = ? AND role = 'WRITER'",
                Integer.class, audioId, artistId));
    }

    @Test
    void replacesMediaUpdatesCreditsChangesStatusAndDeletesAudio() throws Exception {
        long artistId = artistRepository.findByArtistKey("owais-raza-qadri").orElseThrow().getId();
        MvcResult created = mockMvc.perform(audioMultipart(
                "/api/admin/audios",
                requestJson("PUBLISHED", "hamd", artistId),
                true,
                true))
                .andExpect(status().isCreated())
                .andReturn();
        var original = objectMapper.readTree(created.getResponse().getContentAsString()).at("/data");
        long audioId = original.at("/id").asLong();
        String oldAudioPublicId = original.at("/audioPublicId").asText();
        String oldCoverPublicId = original.at("/coverImagePublicId").asText();

        byte[] replacement = objectMapper.writeValueAsBytes(Map.of(
                "title", titlePrefix + " track",
                "description", "Updated integration test",
                "languageCode", "ur",
                "categoryKeys", List.of("naat-sharif"),
                "singerIds", List.of(),
                "writerIds", List.of(artistId),
                "status", ""));
        mockMvc.perform(audioMultipart(
                "/api/admin/audios/" + audioId, replacement, true, true).with(request -> {
                    request.setMethod("PUT");
                    return request;
                }))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("PUBLISHED")))
                .andExpect(jsonPath("$.data.singers").isEmpty())
                .andExpect(jsonPath("$.data.writers[0].id", is((int) artistId)))
                .andExpect(jsonPath("$.data.categories[0].categoryKey", is("naat-sharif")))
                .andExpect(jsonPath("$.data.audioPublicId").value(
                        org.hamcrest.Matchers.not(is(oldAudioPublicId))))
                .andExpect(jsonPath("$.data.coverImagePublicId").value(
                        org.hamcrest.Matchers.not(is(oldCoverPublicId))));
        verify(cloudinaryMediaService).deleteAudio(oldAudioPublicId);
        verify(cloudinaryMediaService).deleteCoverImage(oldCoverPublicId);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/admin/audios/{id}/status", audioId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INACTIVE\"}")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("INACTIVE")));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(
                        "/api/admin/audios/{id}", audioId)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isNoContent());
        org.junit.jupiter.api.Assertions.assertFalse(audioRepository.existsById(audioId));
    }

    @Test
    void failedCreateCleansUploadedAssetsAndDoesNotPersistAudio() throws Exception {
        byte[] invalidLanguageRequest = objectMapper.writeValueAsBytes(Map.of(
                "title", titlePrefix + " invalid language",
                "languageCode", "missing-language",
                "categoryKeys", List.of("hamd"),
                "singerIds", List.of(),
                "writerIds", List.of(),
                "status", "DRAFT"));

        mockMvc.perform(audioMultipart(
                "/api/admin/audios", invalidLanguageRequest, true, true))
                .andExpect(status().isBadRequest());

        org.junit.jupiter.api.Assertions.assertTrue(audioRepository.findAll().stream()
                .noneMatch(audio -> audio.getTitle().startsWith(titlePrefix)));
        verify(cloudinaryMediaService).deleteAudio(startsWith("zikr-e-ilahi/audio/audio-"));
        verify(cloudinaryMediaService).deleteCoverImage(startsWith("zikr-e-ilahi/audio-covers/cover-"));
    }

    @Test
    void failedMediaReplacementCleansNewAssetsAndPreservesOldAssets() throws Exception {
        long artistId = artistRepository.findByArtistKey("owais-raza-qadri").orElseThrow().getId();
        MvcResult created = mockMvc.perform(audioMultipart(
                "/api/admin/audios",
                requestJson("PUBLISHED", "hamd", artistId),
                true,
                true))
                .andExpect(status().isCreated())
                .andReturn();
        var original = objectMapper.readTree(created.getResponse().getContentAsString()).at("/data");
        long audioId = original.at("/id").asLong();
        String oldAudioPublicId = original.at("/audioPublicId").asText();
        String oldCoverPublicId = original.at("/coverImagePublicId").asText();

        byte[] invalidUpdate = objectMapper.writeValueAsBytes(Map.of(
                "title", titlePrefix + " track",
                "languageCode", "ur",
                "categoryKeys", List.of("category-that-does-not-exist"),
                "singerIds", List.of(artistId),
                "writerIds", List.of(),
                "status", ""));
        mockMvc.perform(audioMultipart(
                "/api/admin/audios/" + audioId, invalidUpdate, true, true).with(request -> {
                    request.setMethod("PUT");
                    return request;
                }))
                .andExpect(status().isBadRequest());

        verify(cloudinaryMediaService, never()).deleteAudio(eq(oldAudioPublicId));
        verify(cloudinaryMediaService, never()).deleteCoverImage(eq(oldCoverPublicId));
        verify(cloudinaryMediaService).deleteAudio(startsWith("zikr-e-ilahi/audio/audio-"));
        verify(cloudinaryMediaService).deleteCoverImage(startsWith("zikr-e-ilahi/audio-covers/cover-"));
        mockMvc.perform(get("/api/admin/audios/{id}", audioId)
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.audioPublicId", is(oldAudioPublicId)))
                .andExpect(jsonPath("$.data.coverImagePublicId", is(oldCoverPublicId)));
    }

    private MockHttpServletRequestBuilder audioMultipart(
            String path,
            byte[] data,
            boolean includeAudio,
            boolean includeCover) {
        MockPart dataPart = new MockPart("data", data);
        dataPart.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        MockMultipartHttpServletRequestBuilder request = multipart(path).part(dataPart);
        if (includeAudio) {
            request.file(new MockMultipartFile(
                    "audioFile", "track.mp3", "audio/mpeg", "mock audio".getBytes(StandardCharsets.UTF_8)));
        }
        if (includeCover) {
            request.file(new MockMultipartFile(
                    "coverImage", "cover.jpg", "image/jpeg", "mock cover".getBytes(StandardCharsets.UTF_8)));
        }
        return request.header(HttpHeaders.AUTHORIZATION, bearer());
    }

    private byte[] requestJson(String status, String categoryKey, long artistId) throws Exception {
        return objectMapper.writeValueAsBytes(Map.of(
                "title", titlePrefix + " track",
                "description", "Audio API integration test",
                "languageCode", "ur",
                "categoryKeys", List.of(categoryKey),
                "singerIds", List.of(artistId),
                "writerIds", List.of(artistId),
                "status", status));
    }

    private String bearer() {
        return "Bearer " + token;
    }
}
