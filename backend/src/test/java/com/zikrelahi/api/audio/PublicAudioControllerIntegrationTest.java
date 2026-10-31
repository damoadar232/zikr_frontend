package com.zikrelahi.api.audio;

import com.zikrelahi.api.artists.ArtistRepository;
import com.zikrelahi.api.media.CloudinaryMediaService;
import com.zikrelahi.api.media.MediaUploadResult;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PublicAudioControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private AdminAudioService adminAudioService;
    @Autowired
    private AudioRepository audioRepository;
    @Autowired
    private ArtistRepository artistRepository;
    @MockBean
    private CloudinaryMediaService cloudinaryMediaService;

    private final List<Long> createdAudioIds = new ArrayList<>();
    private String titlePrefix;

    @BeforeEach
    void setUp() {
        titlePrefix = "Public Audio " + UUID.randomUUID();
        when(cloudinaryMediaService.uploadAudio(any())).thenAnswer(invocation -> new MediaUploadResult(
                "https://res.cloudinary.com/test/video/upload/audio.mp3",
                "test/audio/" + UUID.randomUUID(),
                "mp3",
                1024,
                "test-track.mp3",
                60));
        when(cloudinaryMediaService.uploadCoverImage(any())).thenAnswer(invocation -> new MediaUploadResult(
                "https://res.cloudinary.com/test/image/upload/cover.jpg",
                "test/covers/" + UUID.randomUUID(),
                "jpg",
                256,
                "test-cover.jpg",
                null));

        Long artistId = artistRepository.findByArtistKey("owais-raza-qadri").orElseThrow().getId();
        createAudio(AudioStatus.PUBLISHED, "ur", "hamd", artistId);
        createAudio(AudioStatus.DRAFT, "ur", "hamd", artistId);
        createAudio(AudioStatus.INACTIVE, "ur", "hamd", artistId);
        createAudio(AudioStatus.PUBLISHED, "hi", "qawwali", artistId);
    }

    @AfterEach
    void cleanUp() {
        createdAudioIds.forEach(adminAudioService::delete);
        createdAudioIds.clear();
    }

    @Test
    void publicListingIsAnonymousAndOnlyReturnsPublishedRecordsWithFilters() throws Exception {
        mockMvc.perform(get("/api/public/audios")
                        .queryParam("query", titlePrefix)
                        .queryParam("categoryKey", "hamd")
                        .queryParam("languageCode", "ur"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements", is(1)))
                .andExpect(jsonPath("$.data.items[0].title", is(titlePrefix + " hamd PUBLISHED")))
                .andExpect(jsonPath("$.data.items[0].audioUrl").exists())
                .andExpect(jsonPath("$.data.items[0].coverImageUrl").exists())
                .andExpect(jsonPath("$.data.items[0].singers[0].fullName").exists())
                .andExpect(jsonPath("$.data.items[0].writers[0].fullName").exists())
                .andExpect(jsonPath("$.data.items[0].status").doesNotExist())
                .andExpect(jsonPath("$.data.items[0].audioPublicId").doesNotExist())
                .andExpect(jsonPath("$.data.items[0].audioSize").doesNotExist());

        mockMvc.perform(get("/api/public/audios")
                        .queryParam("query", titlePrefix)
                        .queryParam("page", "0")
                        .queryParam("size", "1")
                        .queryParam("sort", "title")
                        .queryParam("direction", "ASC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements", is(2)))
                .andExpect(jsonPath("$.data.totalPages", is(2)))
                .andExpect(jsonPath("$.data.size", is(1)));
    }

    @Test
    void publicDetailsHideDraftAndInactiveRecordsAndCategoriesNeedPublishedAudio() throws Exception {
        List<Audio> testAudios = audioRepository.findAll().stream()
                .filter(audio -> audio.getTitle().startsWith(titlePrefix))
                .toList();
        Audio published = testAudios.stream()
                .filter(audio -> audio.getStatus() == AudioStatus.PUBLISHED && audio.getTitle().contains("hamd"))
                .findFirst()
                .orElseThrow();
        Audio draft = testAudios.stream()
                .filter(audio -> audio.getStatus() == AudioStatus.DRAFT)
                .findFirst()
                .orElseThrow();
        Audio inactive = testAudios.stream()
                .filter(audio -> audio.getStatus() == AudioStatus.INACTIVE)
                .findFirst()
                .orElseThrow();

        mockMvc.perform(get("/api/public/audios/{id}", published.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id", is(published.getId().intValue())))
                .andExpect(jsonPath("$.data.language.code", is("ur")))
                .andExpect(jsonPath("$.data.categories[0].categoryKey", is("hamd")))
                .andExpect(jsonPath("$.data.publishedDate", is(LocalDate.now().toString())))
                .andExpect(jsonPath("$.data.status").doesNotExist())
                .andExpect(jsonPath("$.data.audioPublicId").doesNotExist());

        mockMvc.perform(get("/api/public/audios/{id}", draft.getId()))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/public/audios/{id}", inactive.getId()))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/public/audios/{id}", Long.MAX_VALUE))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/public/audio-categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.categoryKey == 'hamd')]").exists())
                .andExpect(jsonPath("$.data[?(@.categoryKey == 'qawwali')]").exists());
    }

    private void createAudio(AudioStatus status, String language, String category, Long artistId) {
        AudioDtos.AudioRequest request = new AudioDtos.AudioRequest(
                titlePrefix + " " + category + " " + status,
                "Public API integration test",
                language,
                List.of(category),
                List.of(artistId),
                List.of(artistId),
                LocalDate.now(),
                status.name());
        AudioDtos.AudioDetailsDto created = adminAudioService.create(
                request,
                new MockMultipartFile("audioFile", "track.mp3", "audio/mpeg", new byte[] { 1 }),
                new MockMultipartFile("coverImage", "cover.jpg", "image/jpeg", new byte[] { 1 }));
        createdAudioIds.add(created.id());
    }
}
