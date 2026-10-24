package com.zikrelahi.api.quran.importer;

import com.zikrelahi.api.quran.ayah.Ayah;
import com.zikrelahi.api.quran.ayah.AyahRepository;
import com.zikrelahi.api.quran.surah.Surah;
import com.zikrelahi.api.quran.surah.SurahRepository;
import com.zikrelahi.api.quran.translation.LanguageCode;
import com.zikrelahi.api.quran.translation.Translation;
import com.zikrelahi.api.quran.translation.TranslationRepository;
import com.zikrelahi.api.quran.translator.Translator;
import com.zikrelahi.api.quran.translator.TranslatorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Validates an import batch without writing to the database.
 * All checks run against in-memory snapshots of Surah metadata and
 * Translator records loaded once at the start.
 */
@Component
@RequiredArgsConstructor
public class ImportValidator {

    private final SurahRepository surahRepository;
    private final TranslatorRepository translatorRepository;
    private final AyahRepository ayahRepository;
    private final TranslationRepository translationRepository;

    /**
     * Validate every row in the batch and return a full report.
     * This method performs no database writes.
     */
    public ImportResult validate(List<AyahImportRow> rows) {
        List<ImportRowError> errors = new ArrayList<>();
        if (rows == null) {
            return new ImportResult(0, 0, 1, List.of(
                    new ImportRowError(0, null, null, "rows", "MISSING_ROWS",
                            "Rows are required.")));
        }

        // Load reference data once
        Map<Short, Surah> surahMap = loadSurahMap();
        Map<Long, Translator> translatorMap = loadTranslatorMap();
        Map<String, Ayah> existingAyahs = new HashMap<>();
        for (Ayah ayah : ayahRepository.findAll()) {
            existingAyahs.put(key(ayah.getSurahNumber(), ayah.getAyahNumber()), ayah);
        }
        Map<String, Set<LanguageCode>> existingTranslations = new HashMap<>();
        for (Translation translation : translationRepository.findAll()) {
            existingTranslations.computeIfAbsent(
                    key(translation.getSurahNumber(), translation.getAyahNumber()),
                    ignored -> new HashSet<>()).add(translation.getLanguageCode());
        }

        // Track seen (surah, ayah) pairs for duplicate detection within the batch
        Set<String> seen = new HashSet<>();
        Set<Integer> invalidRows = new HashSet<>();

        for (int i = 0; i < rows.size(); i++) {
            int rowNum = i + 1; // 1-based for human-readable reports
            AyahImportRow row = rows.get(i);
            List<ImportRowError> rowErrors = validateRow(
                    row, rowNum, surahMap, translatorMap, seen,
                    existingAyahs, existingTranslations);
            if (!rowErrors.isEmpty()) {
                invalidRows.add(rowNum);
            }
            errors.addAll(rowErrors);
        }

        int validRows = rows.size() - invalidRows.size();
        return new ImportResult(rows.size(), validRows, errors.size(), errors);
    }

    private List<ImportRowError> validateRow(
            AyahImportRow row, int rowNum,
            Map<Short, Surah> surahMap,
            Map<Long, Translator> translatorMap,
            Set<String> seen,
            Map<String, Ayah> existingAyahs,
            Map<String, Set<LanguageCode>> existingTranslations) {

        List<ImportRowError> errors = new ArrayList<>();
        if (row == null) {
            errors.add(new ImportRowError(rowNum, null, null, "row",
                    "MISSING_ROW", "Import row cannot be null."));
            return errors;
        }

        // 1. Surah number must be present and in range
        if (row.surahNumber() == null) {
            errors.add(new ImportRowError(rowNum, null, row.ayahNumber(),
                    "surahNumber", "MISSING_SURAH", "Surah number is required."));
            return errors; // Can't check anything else without a Surah
        }
        if (row.surahNumber() < 1 || row.surahNumber() > 114) {
            errors.add(new ImportRowError(rowNum, row.surahNumber(), row.ayahNumber(),
                    "surahNumber", "INVALID_SURAH",
                    "Surah " + row.surahNumber() + " is out of range (1–114)."));
            return errors;
        }

        Surah surah = surahMap.get((short) (int) row.surahNumber());
        if (surah == null) {
            errors.add(new ImportRowError(rowNum, row.surahNumber(), row.ayahNumber(),
                    "surahNumber", "SURAH_NOT_FOUND",
                    "Surah " + row.surahNumber() + " was not found in the database."));
            return errors;
        }

        // 2. Ayah number must be present and within Surah bounds
        if (row.ayahNumber() == null) {
            errors.add(new ImportRowError(rowNum, row.surahNumber(), null,
                    "ayahNumber", "MISSING_AYAH", "Ayah number is required."));
            return errors;
        }
        if (row.ayahNumber() < 1 || row.ayahNumber() > surah.getAyahCount()) {
            errors.add(new ImportRowError(rowNum, row.surahNumber(), row.ayahNumber(),
                    "ayahNumber", "AYAH_OUT_OF_BOUNDS",
                    "Ayah " + row.ayahNumber() + " is out of range for Surah "
                    + row.surahNumber() + " (max " + surah.getAyahCount() + ")."));
            return errors;
        }

        // 3. Duplicate detection within the batch
        String key = row.surahNumber() + ":" + row.ayahNumber();
        if (!seen.add(key)) {
            errors.add(new ImportRowError(rowNum, row.surahNumber(), row.ayahNumber(),
                    "surahNumber", "DUPLICATE_AYAH",
                    "Ayah " + key + " appears more than once in the import batch."));
            return errors;
        }

        // Arabic is required on every imported row to prevent orphaned translations.
        boolean hasArabic = row.arabicText() != null && !row.arabicText().isBlank();
        boolean hasEn = row.translationEn() != null && !row.translationEn().isBlank();
        boolean hasHi = row.translationHi() != null && !row.translationHi().isBlank();
        boolean hasUr = row.translationUr() != null && !row.translationUr().isBlank();

        if (!hasArabic) {
            errors.add(new ImportRowError(rowNum, row.surahNumber(), row.ayahNumber(),
                    "arabicText", "MISSING_ARABIC",
                    "Arabic text is required for every imported Ayah."));
        }

        String addressKey = key(row.surahNumber(), row.ayahNumber());
        Ayah existingAyah = existingAyahs.get(addressKey);
        if (existingAyah != null && hasArabic
                && !existingAyah.getArabicText().trim().equals(row.arabicText().trim())) {
            errors.add(new ImportRowError(rowNum, row.surahNumber(), row.ayahNumber(),
                    "arabicText", "EXISTING_AYAH_CONFLICT",
                    "Import will not replace existing Arabic text; use the editor for an explicit update."));
        }

        // 6. Validate EN translation + translator
        validateTranslation(rowNum, row, hasEn, row.translationEn(), row.translatorIdEn(),
                "en", "translationEn", "translatorIdEn",
                surahMap, translatorMap, errors);

        // 7. Validate HI translation + translator
        validateTranslation(rowNum, row, hasHi, row.translationHi(), row.translatorIdHi(),
                "hi", "translationHi", "translatorIdHi",
                surahMap, translatorMap, errors);

        // 8. Validate UR translation + translator
        validateTranslation(rowNum, row, hasUr, row.translationUr(), row.translatorIdUr(),
                "ur", "translationUr", "translatorIdUr",
                surahMap, translatorMap, errors);

        validateExistingTranslation(rowNum, row, hasEn, LanguageCode.en, existingTranslations, errors);
        validateExistingTranslation(rowNum, row, hasHi, LanguageCode.hi, existingTranslations, errors);
        validateExistingTranslation(rowNum, row, hasUr, LanguageCode.ur, existingTranslations, errors);

        return errors;
    }

    private void validateExistingTranslation(
            int rowNum, AyahImportRow row, boolean hasText, LanguageCode language,
            Map<String, Set<LanguageCode>> existingTranslations, List<ImportRowError> errors) {
        if (hasText && existingTranslations
                .getOrDefault(key(row.surahNumber(), row.ayahNumber()), Set.of())
                .contains(language)) {
            errors.add(new ImportRowError(rowNum, row.surahNumber(), row.ayahNumber(),
                    "translation" + language.name().toUpperCase(),
                    "EXISTING_TRANSLATION_CONFLICT",
                    "A translation already exists for this Ayah and language; import will not replace it."));
        }
    }

    private void validateTranslation(
            int rowNum, AyahImportRow row,
            boolean hasText, String text, Long translatorId,
            String lang, String textField, String translatorField,
            Map<Short, Surah> surahMap, Map<Long, Translator> translatorMap,
            List<ImportRowError> errors) {

        if (!hasText) {
            if (translatorId != null) {
                errors.add(new ImportRowError(rowNum, row.surahNumber(), row.ayahNumber(),
                        translatorField, "TRANSLATOR_WITHOUT_TRANSLATION",
                        "A translator cannot be supplied without translation text."));
            }
            return;
        }

        if (translatorId == null) {
            errors.add(new ImportRowError(rowNum, row.surahNumber(), row.ayahNumber(),
                    translatorField, "MISSING_TRANSLATOR",
                    "Translator ID is required for " + lang + " translation."));
            return;
        }

        Translator translator = translatorMap.get(translatorId);
        if (translator == null) {
            errors.add(new ImportRowError(rowNum, row.surahNumber(), row.ayahNumber(),
                    translatorField, "UNKNOWN_TRANSLATOR",
                    "Translator ID " + translatorId + " does not exist."));
            return;
        }

        if (translator.getLanguageCode() != LanguageCode.valueOf(lang)) {
            errors.add(new ImportRowError(rowNum, row.surahNumber(), row.ayahNumber(),
                    translatorField, "TRANSLATOR_LANGUAGE_MISMATCH",
                    "Translator " + translatorId + " is for '"
                    + translator.getLanguageCode() + "', not '" + lang + "'."));
        }
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

    private String key(int surahNumber, int ayahNumber) {
        return surahNumber + ":" + ayahNumber;
    }
}
