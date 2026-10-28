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

import java.util.ArrayList;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class QuranTranslatorSelectionControllerTest {

    private static final int SURAH = 114;
    private static final int AYAH = 6;

    @Autowired private MockMvc mockMvc;
    @Autowired private AyahRepository ayahRepository;
    @Autowired private SurahRepository surahRepository;
    @Autowired private TranslationRepository translationRepository;
    @Autowired private TranslatorRepository translatorRepository;

    private final List<Long> fixtureTranslatorIds = new ArrayList<>();
    private Long englishOneId;
    private Long englishTwoId;
    private Long draftEnglishId;
    private Long urduId;

    @BeforeEach
    void setUpPublishedTranslatorFixtures() {
        removeVerse();
        Surah surah = surahRepository.findById((short) SURAH).orElseThrow();
        ayahRepository.saveAndFlush(Ayah.builder()
                .id(AyahId.of(SURAH, AYAH))
                .surah(surah)
                .arabicText("verified Arabic fixture")
                .status(ContentStatus.PUBLISHED)
                .build());

        englishOneId = saveTranslator("English One", LanguageCode.en);
        englishTwoId = saveTranslator("English Two", LanguageCode.en);
        draftEnglishId = saveTranslator("English Draft", LanguageCode.en);
        urduId = saveTranslator("Urdu One", LanguageCode.ur);

        saveTranslation(englishOneId, LanguageCode.en, "English one saved text", ContentStatus.PUBLISHED);
        saveTranslation(englishTwoId, LanguageCode.en, "English two saved text", ContentStatus.PUBLISHED);
        saveTranslation(draftEnglishId, LanguageCode.en, "Must not be public", ContentStatus.DRAFT);
        saveTranslation(urduId, LanguageCode.ur, "Urdu saved text", ContentStatus.PUBLISHED);
    }

    @AfterEach
    void cleanUpFixtures() {
        removeVerse();
        fixtureTranslatorIds.forEach((id) -> {
            if (translatorRepository.existsById(id)) translatorRepository.deleteById(id);
        });
        fixtureTranslatorIds.clear();
    }

    @Test
    void publicTranslatorListExposesOnlySafeMetadataWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/quran/translators").param("language", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(3)))
                .andExpect(jsonPath("$.data[*].id", hasItems(
                        englishOneId.intValue(), englishTwoId.intValue(), draftEnglishId.intValue())))
                .andExpect(jsonPath("$.data[*].sourceRef").doesNotExist())
                .andExpect(jsonPath("$.data[*].license").doesNotExist());
    }

    @Test
    void publishedTranslationsKeepTranslatorAttributionAndExcludeDrafts() throws Exception {
        mockMvc.perform(get("/api/v1/quran/surahs/{number}/translations", SURAH)
                        .param("languages", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[*].translatorId", hasItems(
                        englishOneId.intValue(), englishTwoId.intValue())))
                .andExpect(jsonPath("$.data[*].text", hasItems(
                        "English one saved text", "English two saved text")))
                .andExpect(jsonPath("$.data[*].translatorName", not(hasItem("English Draft"))))
                .andExpect(jsonPath("$.data[*].languageCode", everyItem(is("en"))));
    }

    @Test
    void juzTranslationsReturnMultipleTranslatorsForSameAyah() throws Exception {
        mockMvc.perform(get("/api/v1/quran/juz/30/translations").param("languages", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[*].translatorId", hasItems(
                        englishOneId.intValue(), englishTwoId.intValue())));
    }

    @Test
    void legacySingleLanguageReaderStillReturnsOneAyahRatherThanDuplicates() throws Exception {
        mockMvc.perform(get("/api/v1/quran/surahs/{number}/ayahs", SURAH)
                        .param("translation", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].translation.translatorName", is("English One")));
    }

    private Long saveTranslator(String name, LanguageCode language) {
        Translator translator = translatorRepository.saveAndFlush(Translator.builder()
                .name(name)
                .languageCode(language)
                .sourceRef("verified source")
                .license("verified license")
                .build());
        fixtureTranslatorIds.add(translator.getId());
        return translator.getId();
    }

    private void saveTranslation(
            Long translatorId, LanguageCode language, String text, ContentStatus status) {
        Translator translator = translatorRepository.findById(translatorId).orElseThrow();
        translationRepository.saveAndFlush(Translation.builder()
                .surahNumber((short) SURAH)
                .ayahNumber((short) AYAH)
                .languageCode(language)
                .translator(translator)
                .text(text)
                .status(status)
                .build());
    }

    private void removeVerse() {
        translationRepository.findBySurahNumberAndAyahNumberOrderByLanguageCodeAscTranslatorIdAsc(
                        (short) SURAH, (short) AYAH)
                .forEach(translationRepository::delete);
        if (ayahRepository.existsByIdSurahNumberAndIdAyahNumber((short) SURAH, (short) AYAH)) {
            ayahRepository.deleteById(AyahId.of(SURAH, AYAH));
        }
    }
}
