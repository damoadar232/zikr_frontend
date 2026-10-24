package com.zikrelahi.api.quran.importer;

import com.zikrelahi.api.common.ContentStatus;
import com.zikrelahi.api.common.ConflictException;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Orchestrates bulk import: validate first, then commit in a single transaction.
 * Invalid imports never leave partially committed content — the entire
 * batch either succeeds or the transaction rolls back.
 *
 * Imports are append-only by default: existing Arabic text and translations
 * are never replaced. New records are always created as DRAFT.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImportService {

    private final ImportValidator validator;
    private final AyahRepository ayahRepository;
    private final TranslationRepository translationRepository;
    private final SurahRepository surahRepository;
    private final TranslatorRepository translatorRepository;

    /**
     * Validate the batch without writing anything.
     * Returns the full error report.
     */
    public ImportResult validate(List<AyahImportRow> rows) {
        return validator.validate(rows);
    }

    /**
     * Validate then commit the entire batch in one transaction.
     * If validation fails, returns the error report and writes nothing.
     * If validation passes, all Ayahs and translations are written
     * atomically — any runtime exception rolls back the whole batch.
     */
    @Transactional
    public ImportSummary commit(List<AyahImportRow> rows) {
        ImportResult result = validator.validate(rows);
        if (result.hasErrors()) {
            throw new ImportValidationException(result);
        }

        int imported = 0;
        int updated = 0;
        int translationsCreated = 0;
        int translationsUpdated = 0;

        // Load reference data once for the commit loop
        Map<Short, Surah> surahMap = loadSurahMap();
        Map<Long, Translator> translatorMap = loadTranslatorMap();

        for (AyahImportRow row : rows) {
            Short surahNo = (short) (int) row.surahNumber();
            Short ayahNo = (short) (int) row.ayahNumber();
            Surah surah = surahMap.get(surahNo);

            // ─── Upsert Ayah ───────────────────────────────────────────────
            Ayah ayah = ayahRepository
                    .findByIdSurahNumberAndIdAyahNumber(surahNo, ayahNo)
                    .orElse(null);

            if (ayah == null) {
                ayah = Ayah.builder()
                        .id(AyahId.of(row.surahNumber(), row.ayahNumber()))
                        .surah(surah)
                        .arabicText(row.arabicText().trim())
                        .status(ContentStatus.DRAFT)
                        .build();
                ayahRepository.save(ayah);
                imported++;
            }

            translationsCreated += upsertTranslation(
                    surahNo, ayahNo, row.translationEn(), row.translatorIdEn(),
                    LanguageCode.en, translatorMap);
            translationsCreated += upsertTranslation(
                    surahNo, ayahNo, row.translationHi(), row.translatorIdHi(),
                    LanguageCode.hi, translatorMap);
            translationsCreated += upsertTranslation(
                    surahNo, ayahNo, row.translationUr(), row.translatorIdUr(),
                    LanguageCode.ur, translatorMap);
        }

        log.info("Import committed: {} new Ayahs, {} updated, {} translations created",
                imported, updated, translationsCreated);
        return new ImportSummary(imported, updated, translationsCreated, translationsUpdated);
    }

    /**
     * Creates a translation row; existing rows are guarded against validation/commit races.
     * Returns 1 if a new row was created, 0 otherwise.
     * Existing translations are not overwritten during import — the admin
     * reviews imported translations before publishing them.
     */
    private int upsertTranslation(
            Short surahNo, Short ayahNo,
            String text, Long translatorId,
            LanguageCode lang,
            Map<Long, Translator> translatorMap) {

        if (text == null || text.isBlank() || translatorId == null) {
            return 0;
        }

        if (translationRepository
                .findBySurahNumberAndAyahNumberAndLanguageCode(surahNo, ayahNo, lang)
                .isPresent()) {
            throw new ConflictException(
                    "A " + lang + " translation already exists for Ayah "
                    + surahNo + ":" + ayahNo + ".");
        }

        Translator translator = translatorMap.get(translatorId);
        if (translator == null || translator.getLanguageCode() != lang) {
            throw new IllegalArgumentException(
                    "Translator " + translatorId + " does not match language " + lang + ".");
        }

        Translation translation = Translation.builder()
                .surahNumber(surahNo)
                .ayahNumber(ayahNo)
                .languageCode(lang)
                .text(text.trim())
                .translator(translator)
                .status(ContentStatus.DRAFT)
                .build();
        translationRepository.save(translation);
        return 1;
    }

    private Map<Short, Surah> loadSurahMap() {
        Map<Short, Surah> map = new HashMap<>();
        for (Surah s : surahRepository.findAll()) {
            map.put(s.getNumber(), s);
        }
        return map;
    }

    private Map<Long, Translator> loadTranslatorMap() {
        Map<Long, Translator> map = new HashMap<>();
        for (Translator t : translatorRepository.findAll()) {
            map.put(t.getId(), t);
        }
        return map;
    }
}
