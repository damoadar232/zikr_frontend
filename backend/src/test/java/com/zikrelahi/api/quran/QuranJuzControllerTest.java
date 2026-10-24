package com.zikrelahi.api.quran;

import com.zikrelahi.api.common.ContentStatus;
import com.zikrelahi.api.quran.ayah.Ayah;
import com.zikrelahi.api.quran.ayah.AyahId;
import com.zikrelahi.api.quran.ayah.AyahRepository;
import com.zikrelahi.api.quran.surah.Surah;
import com.zikrelahi.api.quran.surah.SurahRepository;
import com.zikrelahi.api.quran.translation.LanguageCode;
import com.zikrelahi.api.quran.translation.Translation;
import com.zikrelahi.api.quran.translation.TranslationRepository;
import com.zikrelahi.api.quran.translator.Translator;
import com.zikrelahi.api.quran.translator.TranslatorRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class QuranJuzControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private AyahRepository ayahRepository;
    @Autowired
    private SurahRepository surahRepository;
    @Autowired
    private TranslationRepository translationRepository;
    @Autowired
    private TranslatorRepository translatorRepository;

    private Long testTranslatorId;

    @BeforeEach
    void cleanVerseFixtures() {
        removeVerse(1, 1);
        removeVerse(2, 1);
        removeVerse(2, 2);
        removeVerse(2, 141);
        removeVerse(2, 142);
    }

    @AfterEach
    void removeVerseFixtures() {
        removeVerse(1, 1);
        removeVerse(2, 1);
        removeVerse(2, 2);
        removeVerse(2, 141);
        removeVerse(2, 142);
        if (testTranslatorId != null) {
            translatorRepository.deleteById(testTranslatorId);
            testTranslatorId = null;
        }
    }

    // ── Acceptance criteria ──────────────────────────────────────────────────

    @Test
    void listJuzReturns30Records() throws Exception {
        mockMvc.perform(get("/api/v1/quran/juz"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(30)));
    }

    // ── Start boundaries from juzStarts in quranData.ts ─────────────────────

    @Test
    void juz1StartsAtSurah1Ayah1() throws Exception {
        mockMvc.perform(get("/api/v1/quran/juz/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.number",     is(1)))
                .andExpect(jsonPath("$.data.startSurah", is(1)))
                .andExpect(jsonPath("$.data.startAyah",  is(1)))
                .andExpect(jsonPath("$.data.startRef",   is("1:1")));
    }

    @Test
    void juz2StartsAtSurah2Ayah142() throws Exception {
        mockMvc.perform(get("/api/v1/quran/juz/2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.startSurah", is(2)))
                .andExpect(jsonPath("$.data.startAyah",  is(142)))
                .andExpect(jsonPath("$.data.startRef",   is("2:142")));
    }

    @Test
    void juz30StartsAtSurah78Ayah1() throws Exception {
        mockMvc.perform(get("/api/v1/quran/juz/30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.startSurah", is(78)))
                .andExpect(jsonPath("$.data.startAyah",  is(1)))
                .andExpect(jsonPath("$.data.startRef",   is("78:1")));
    }

    @Test
    void juz30EndsAtSurah114Ayah6() throws Exception {
        mockMvc.perform(get("/api/v1/quran/juz/30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.endSurah", is(114)))
                .andExpect(jsonPath("$.data.endAyah",  is(6)))
                .andExpect(jsonPath("$.data.endRef",   is("114:6")));
    }

    @Test
    void juzListIsOrderedByNumber() throws Exception {
        mockMvc.perform(get("/api/v1/quran/juz"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].number",  is(1)))
                .andExpect(jsonPath("$.data[29].number", is(30)));
    }

    @Test
    void juzHasArabicName() throws Exception {
        mockMvc.perform(get("/api/v1/quran/juz/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.arabicName", not(emptyOrNullString())));
    }

    // ── Spot-check several Juz start positions from juzStarts ───────────────

    @Test
    void juz10StartsAtSurah8Ayah41() throws Exception {
        mockMvc.perform(get("/api/v1/quran/juz/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.startSurah", is(8)))
                .andExpect(jsonPath("$.data.startAyah",  is(41)));
    }

    @Test
    void juz15StartsAtSurah17Ayah1() throws Exception {
        mockMvc.perform(get("/api/v1/quran/juz/15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.startSurah", is(17)))
                .andExpect(jsonPath("$.data.startAyah",  is(1)));
    }

    @Test
    void juz29StartsAtSurah67Ayah1() throws Exception {
        mockMvc.perform(get("/api/v1/quran/juz/29"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.startSurah", is(67)))
                .andExpect(jsonPath("$.data.startAyah",  is(1)));
    }

    // ── Error cases ──────────────────────────────────────────────────────────

    @Test
    void juz31Returns404() throws Exception {
        mockMvc.perform(get("/api/v1/quran/juz/31"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", is("NOT_FOUND")));
    }

    @Test
    void juz0Returns404() throws Exception {
        mockMvc.perform(get("/api/v1/quran/juz/0"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", is("NOT_FOUND")));
    }

    @Test
    void juzEndpointIsPublicNoTokenRequired() throws Exception {
        mockMvc.perform(get("/api/v1/quran/juz"))
                .andExpect(status().isOk());
    }

    @Test
    void juzAyahsIncludesCrossSurahInclusiveBoundariesInCanonicalOrder() throws Exception {
        saveAyah(1, 1, ContentStatus.PUBLISHED);
        saveAyah(2, 1, ContentStatus.PUBLISHED);
        saveAyah(2, 2, ContentStatus.DRAFT);
        saveAyah(2, 141, ContentStatus.PUBLISHED);
        saveAyah(2, 142, ContentStatus.PUBLISHED);
        addEnglishTranslation(2, 1);

        mockMvc.perform(get("/api/v1/quran/juz/1/ayahs").param("translation", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(3)))
                .andExpect(jsonPath("$.data[0].surahNumber", is(1)))
                .andExpect(jsonPath("$.data[0].ayahNumber", is(1)))
                .andExpect(jsonPath("$.data[0].translation", nullValue()))
                .andExpect(jsonPath("$.data[1].surahNumber", is(2)))
                .andExpect(jsonPath("$.data[1].ayahNumber", is(1)))
                .andExpect(jsonPath("$.data[1].translation.languageCode", is("en")))
                .andExpect(jsonPath("$.data[2].surahNumber", is(2)))
                .andExpect(jsonPath("$.data[2].ayahNumber", is(141)))
                .andExpect(jsonPath("$.data[2].translation", nullValue()));
    }

    @Test
    void juzAyahsRejectsInvalidNumberAndLanguage() throws Exception {
        mockMvc.perform(get("/api/v1/quran/juz/31/ayahs"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", is("NOT_FOUND")));

        mockMvc.perform(get("/api/v1/quran/juz/1/ayahs").param("translation", "fr"))
                .andExpect(status().isBadRequest());
    }

    private void saveAyah(int surahNumber, int ayahNumber, ContentStatus status) {
        Surah surah = surahRepository.findById((short) surahNumber).orElseThrow();
        ayahRepository.save(Ayah.builder()
                .id(AyahId.of(surahNumber, ayahNumber))
                .surah(surah)
                .arabicText("fixture")
                .status(status)
                .build());
    }

    private void addEnglishTranslation(int surahNumber, int ayahNumber) {
        Translator translator = translatorRepository.save(Translator.builder()
                .name("Juz Test Translator")
                .languageCode(LanguageCode.en)
                .sourceRef("test fixture")
                .license("test fixture")
                .build());
        testTranslatorId = translator.getId();
        translationRepository.save(Translation.builder()
                .surahNumber((short) surahNumber)
                .ayahNumber((short) ayahNumber)
                .languageCode(LanguageCode.en)
                .text("test translation")
                .translator(translator)
                .status(ContentStatus.PUBLISHED)
                .build());
    }

    private void removeVerse(int surahNumber, int ayahNumber) {
        translationRepository
                .findBySurahNumberAndAyahNumberAndLanguageCode(
                        (short) surahNumber, (short) ayahNumber, LanguageCode.en)
                .ifPresent(translationRepository::delete);
        if (ayahRepository.existsByIdSurahNumberAndIdAyahNumber(
                (short) surahNumber, (short) ayahNumber)) {
            ayahRepository.deleteById(AyahId.of(surahNumber, ayahNumber));
        }
    }
}
