package com.zikrelahi.api.quran;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zikrelahi.api.admin.AdminRole;
import com.zikrelahi.api.admin.AdminUser;
import com.zikrelahi.api.admin.AdminUserRepository;
import com.zikrelahi.api.auth.LoginRequest;
import com.zikrelahi.api.quran.ayah.AyahRepository;
import com.zikrelahi.api.quran.surah.Surah;
import com.zikrelahi.api.quran.surah.SurahRepository;
import com.zikrelahi.api.common.ContentStatus;
import com.zikrelahi.api.quran.translation.TranslationRepository;
import com.zikrelahi.api.quran.translator.TranslatorRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AyahControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private AdminUserRepository adminUserRepository;
    @Autowired private AyahRepository ayahRepository;
    @Autowired private SurahRepository surahRepository;
    @Autowired private TranslationRepository translationRepository;
    @Autowired private TranslatorRepository translatorRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private static final String EMAIL    = "ayahtest@example.com";
    private static final String PASSWORD = "AyahTest123!";
    private String token;

    // Translator ID stored between tests in this class (created in @BeforeEach)
    private Long translatorId;

    @BeforeEach
    void setUp() throws Exception {
        // Clean slate — translations before ayahs because of FK
        translationRepository.deleteAll();
        ayahRepository.deleteAll();
        translatorRepository.deleteAll();
        adminUserRepository.deleteAll();

        adminUserRepository.save(AdminUser.builder()
                .email(EMAIL)
                .passwordHash(passwordEncoder.encode(PASSWORD))
                .displayName("Ayah Test Admin")
                .role(AdminRole.ADMIN)
                .enabled(true)
                .build());

        token = login();

        // Create a translator for EN to satisfy FK in translation tests
        String translatorBody = objectMapper.writeValueAsString(Map.of(
                "name",         "Test Translator",
                "languageCode", "en",
                "sourceRef",    "Test source",
                "license",      "Test license"));

        String resp = mockMvc.perform(post("/api/v1/admin/quran/translators")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(translatorBody))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        translatorId = objectMapper.readTree(resp).path("data").path("id").asLong();
    }

    @AfterEach
    void tearDown() {
        translationRepository.deleteAll();
        ayahRepository.deleteAll();
        translatorRepository.deleteAll();
        adminUserRepository.deleteAll();
    }

    // ── Acceptance criterion 1: POST /admin/quran/ayahs → 201 ────────────────

    @Test
    void createAyahReturns201() throws Exception {
        mockMvc.perform(post("/api/v1/admin/quran/ayahs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ayahBody(1, 1, "بِسْمِ اللَّهِ")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.surahNumber", is(1)))
                .andExpect(jsonPath("$.data.ayahNumber",  is(1)))
                .andExpect(jsonPath("$.data.arabicText",  is("بِسْمِ اللَّهِ")))
                .andExpect(jsonPath("$.data.status",      is("DRAFT")));
    }

    @Test
    void createDuplicateAyahReturns409() throws Exception {
        mockMvc.perform(post("/api/v1/admin/quran/ayahs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ayahBody(1, 1, "بِسْمِ اللَّهِ")))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/admin/quran/ayahs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ayahBody(1, 1, "duplicate")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error", is("CONFLICT")));
    }

    @Test
    void createAyahWithOutOfBoundsNumberReturns400() throws Exception {
        // Al-Fatihah has 7 Ayahs — Ayah 8 is out of bounds
        mockMvc.perform(post("/api/v1/admin/quran/ayahs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ayahBody(1, 8, "out of bounds")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createAyahWithInvalidSurahReturns404() throws Exception {
        mockMvc.perform(post("/api/v1/admin/quran/ayahs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ayahBody(115, 1, "invalid surah")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createAyahWithMissingArabicReturns400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "surahNumber", 1,
                "ayahNumber",  1));
        mockMvc.perform(post("/api/v1/admin/quran/ayahs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("VALIDATION_ERROR")));
    }

    @Test
    void createAyahWithoutTokenReturns401() throws Exception {
        mockMvc.perform(post("/api/v1/admin/quran/ayahs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ayahBody(1, 1, "text")))
                .andExpect(status().isUnauthorized());
    }

    // ── Acceptance criterion 2: PUT translation — language independence ───────

    @Test
    void putTranslationEnChangesOnlyEn() throws Exception {
        // Create Ayah
        mockMvc.perform(post("/api/v1/admin/quran/ayahs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ayahBody(1, 1, "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")))
                .andExpect(status().isCreated());

        // Add EN translation
        String enBody = objectMapper.writeValueAsString(Map.of(
                "text",         "In the name of Allah",
                "translatorId", translatorId));

        mockMvc.perform(put("/api/v1/admin/quran/ayahs/1/1/translations/en")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(enBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.languageCode",   is("en")))
                .andExpect(jsonPath("$.data.text",           is("In the name of Allah")))
                .andExpect(jsonPath("$.data.translatorName", is("Test Translator")));

        // Verify only 1 translation row exists (not HI or UR)
        long count = translationRepository.count();
        Assertions.assertEquals(1, count,
                "Only EN translation should exist — HI and UR must not be created.");
    }

    @Test
    void putTranslationUpdatesExistingRowInPlace() throws Exception {
        mockMvc.perform(post("/api/v1/admin/quran/ayahs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ayahBody(1, 1, "text")))
                .andExpect(status().isCreated());

        String first = objectMapper.writeValueAsString(Map.of(
                "text", "First text", "translatorId", translatorId));
        mockMvc.perform(put("/api/v1/admin/quran/ayahs/1/1/translations/en")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(first))
                .andExpect(status().isOk());

        String second = objectMapper.writeValueAsString(Map.of(
                "text", "Updated text", "translatorId", translatorId));
        mockMvc.perform(put("/api/v1/admin/quran/ayahs/1/1/translations/en")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(second))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.text", is("Updated text")));

        // Still only 1 row — no duplicate created
        Assertions.assertEquals(1, translationRepository.count());
    }

    @Test
    void putTranslationWithWrongLanguageTranslatorReturns400() throws Exception {
        // Create a HI translator
        String hiTranslator = objectMapper.writeValueAsString(Map.of(
                "name", "Hindi Translator", "languageCode", "hi",
                "sourceRef", "ref", "license", "lic"));
        String resp = mockMvc.perform(post("/api/v1/admin/quran/translators")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(hiTranslator))
                .andReturn().getResponse().getContentAsString();
        Long hiId = objectMapper.readTree(resp).path("data").path("id").asLong();

        mockMvc.perform(post("/api/v1/admin/quran/ayahs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ayahBody(1, 1, "text")))
                .andExpect(status().isCreated());

        // Try to use HI translator for EN language slot — must reject
        String body = objectMapper.writeValueAsString(Map.of(
                "text", "text", "translatorId", hiId));
        mockMvc.perform(put("/api/v1/admin/quran/ayahs/1/1/translations/en")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void putTranslationForNonExistentAyahReturns404() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "text", "text", "translatorId", translatorId));
        mockMvc.perform(put("/api/v1/admin/quran/ayahs/1/999/translations/en")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound());
    }

    // ── Acceptance criterion 3: PATCH status ─────────────────────────────────

    @Test
    void patchStatusToPublishedReturns200WithPublishedStatus() throws Exception {
        mockMvc.perform(post("/api/v1/admin/quran/ayahs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ayahBody(1, 1, "text")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status", is("DRAFT")));

        mockMvc.perform(patch("/api/v1/admin/quran/ayahs/1/1/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("PUBLISHED")));
    }

    @Test
    void patchStatusToDraftReturns200() throws Exception {
        mockMvc.perform(post("/api/v1/admin/quran/ayahs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ayahBody(1, 1, "text")))
                .andExpect(status().isCreated());

        mockMvc.perform(patch("/api/v1/admin/quran/ayahs/1/1/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/v1/admin/quran/ayahs/1/1/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DRAFT\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("DRAFT")));
    }

    // ── Acceptance criterion 4: public GET /surahs/1/ayahs?translation=en ────

    @Test
    void publicGetAyahsReturnsPublishedAyahWithEnTranslation() throws Exception {
        // Create Ayah → Publish Ayah → Add EN translation → Publish translation
        mockMvc.perform(post("/api/v1/admin/quran/ayahs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ayahBody(1, 1, "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")))
                .andExpect(status().isCreated());

        mockMvc.perform(patch("/api/v1/admin/quran/ayahs/1/1/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isOk());

        String enBody = objectMapper.writeValueAsString(Map.of(
                "text", "In the name of Allah, the Most Gracious",
                "translatorId", translatorId,
                "status", "PUBLISHED"));
        mockMvc.perform(put("/api/v1/admin/quran/ayahs/1/1/translations/en")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(enBody))
                .andExpect(status().isOk());

        // Public endpoint — no token
        mockMvc.perform(get("/api/v1/quran/surahs/1/ayahs").param("translation", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].surahNumber",           is(1)))
                .andExpect(jsonPath("$.data[0].ayahNumber",            is(1)))
                .andExpect(jsonPath("$.data[0].arabicText",            is("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")))
                .andExpect(jsonPath("$.data[0].translation.languageCode", is("en")))
                .andExpect(jsonPath("$.data[0].translation.text",
                        is("In the name of Allah, the Most Gracious")))
                .andExpect(jsonPath("$.data[0].translation.translatorName", is("Test Translator")));
    }

    @Test
    void publicGetAyahsReturnsEmptyWhenAllAreDraft() throws Exception {
        // Ayah created but never published
        mockMvc.perform(post("/api/v1/admin/quran/ayahs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ayahBody(1, 1, "text")))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/quran/surahs/1/ayahs").param("translation", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    void publicGetAyahsReturnsAyahWhenTranslationIsMissing() throws Exception {
        mockMvc.perform(post("/api/v1/admin/quran/ayahs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ayahBody(1, 1, "arabic")))
                .andExpect(status().isCreated());
        mockMvc.perform(patch("/api/v1/admin/quran/ayahs/1/1/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/quran/surahs/1/ayahs").param("translation", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].arabicText", is("arabic")))
                .andExpect(jsonPath("$.data[0].translation", nullValue()));
    }

    @Test
    void publicGetAyahsRejectsUnpublishedSurah() throws Exception {
        Surah surah = surahRepository.findById((short) 1).orElseThrow();
        surah.setStatus(ContentStatus.DRAFT);
        surahRepository.save(surah);
        try {
            mockMvc.perform(get("/api/v1/quran/surahs/1/ayahs").param("translation", "en"))
                    .andExpect(status().isNotFound());
        } finally {
            surah.setStatus(ContentStatus.PUBLISHED);
            surahRepository.save(surah);
        }
    }

    @Test
    void publicGetAyahsWithInvalidLanguageReturns400() throws Exception {
        mockMvc.perform(get("/api/v1/quran/surahs/1/ayahs").param("translation", "fr"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void publicGetAyahsRequiresNoToken() throws Exception {
        // Must be accessible without Authorization header
        mockMvc.perform(get("/api/v1/quran/surahs/1/ayahs").param("translation", "en"))
                .andExpect(status().isOk());
    }

    @Test
    void translationIsLanguageIndependent_HiDoesNotAffectEn() throws Exception {
        // Create a HI translator
        String hiTranslator = objectMapper.writeValueAsString(Map.of(
                "name", "Hindi Translator", "languageCode", "hi",
                "sourceRef", "ref", "license", "lic"));
        String resp = mockMvc.perform(post("/api/v1/admin/quran/translators")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(hiTranslator))
                .andReturn().getResponse().getContentAsString();
        Long hiTranslatorId = objectMapper.readTree(resp).path("data").path("id").asLong();

        // Create and publish Ayah
        mockMvc.perform(post("/api/v1/admin/quran/ayahs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ayahBody(1, 1, "arabic")))
                .andExpect(status().isCreated());
        mockMvc.perform(patch("/api/v1/admin/quran/ayahs/1/1/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isOk());

        // Add published EN translation
        String enBody = objectMapper.writeValueAsString(Map.of(
                "text", "English text", "translatorId", translatorId, "status", "PUBLISHED"));
        mockMvc.perform(put("/api/v1/admin/quran/ayahs/1/1/translations/en")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(enBody))
                .andExpect(status().isOk());

        // Add HI translation (DRAFT — should NOT appear in public EN result)
        String hiBody = objectMapper.writeValueAsString(Map.of(
                "text", "Hindi text", "translatorId", hiTranslatorId, "status", "DRAFT"));
        mockMvc.perform(put("/api/v1/admin/quran/ayahs/1/1/translations/hi")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(hiBody))
                .andExpect(status().isOk());

        // Public EN query still returns 1 result, with EN text unchanged
        mockMvc.perform(get("/api/v1/quran/surahs/1/ayahs").param("translation", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].translation.languageCode", is("en")))
                .andExpect(jsonPath("$.data[0].translation.text", is("English text")));

        // 2 translation rows in DB but EN is untouched
        Assertions.assertEquals(2, translationRepository.count());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String ayahBody(int surah, int ayah, String arabic) throws Exception {
        return objectMapper.writeValueAsString(Map.of(
                "surahNumber", surah,
                "ayahNumber",  ayah,
                "arabicText",  arabic));
    }

    private String login() throws Exception {
        String body = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest(EMAIL, PASSWORD))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).path("data").path("accessToken").asText();
    }
}
