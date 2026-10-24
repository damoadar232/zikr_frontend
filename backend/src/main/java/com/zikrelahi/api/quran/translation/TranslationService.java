package com.zikrelahi.api.quran.translation;

import com.zikrelahi.api.common.ContentStatus;
import com.zikrelahi.api.common.ResourceNotFoundException;
import com.zikrelahi.api.quran.ayah.AyahRepository;
import com.zikrelahi.api.quran.translator.Translator;
import com.zikrelahi.api.quran.translator.TranslatorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Manages per-language translation independently.
 * Updating English never touches Arabic, Hindi, or Urdu rows.
 */
@Service
@RequiredArgsConstructor
public class TranslationService {

    private final TranslationRepository translationRepository;
    private final AyahRepository ayahRepository;
    private final TranslatorRepository translatorRepository;

    @Transactional(readOnly = true)
    public List<TranslationDto> listByAyah(int surahNumber, int ayahNumber) {
        validateAyahAddress(surahNumber, ayahNumber);
        return translationRepository
                .findBySurahNumberAndAyahNumberOrderByLanguageCodeAsc(
                        (short) surahNumber, (short) ayahNumber)
                .stream()
                .map(TranslationDto::from)
                .toList();
    }

    /**
     * Creates or replaces the translation for exactly one language.
     * If a row already exists for (surah, ayah, lang) it is updated in-place.
     * Other language rows are untouched.
     */
    @Transactional
    public TranslationDto upsert(int surahNumber, int ayahNumber,
                                  String langCode, TranslationRequest req) {
        validateAyahAddress(surahNumber, ayahNumber);

        // Resolve language
        LanguageCode language;
        try {
            language = LanguageCode.valueOf(langCode);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Language '" + langCode + "' is not supported. Use en, hi, or ur.");
        }

        // Resolve translator — must exist and match the language
        Translator translator = translatorRepository.findById(req.translatorId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Translator " + req.translatorId() + " not found."));
        if (translator.getLanguageCode() != language) {
            throw new IllegalArgumentException(
                    "Translator " + req.translatorId() + " is registered for '"
                    + translator.getLanguageCode() + "', not '" + language + "'.");
        }

        // Upsert — update existing row or create a new one
        Translation translation = translationRepository
                .findBySurahNumberAndAyahNumberAndLanguageCode(
                        (short) surahNumber, (short) ayahNumber, language)
                .orElseGet(() -> Translation.builder()
                        .surahNumber((short) surahNumber)
                        .ayahNumber((short) ayahNumber)
                        .languageCode(language)
                        .build());

        translation.setText(req.text().trim());
        translation.setTranslator(translator);
        translation.setStatus(req.effectiveStatus());

        return TranslationDto.from(translationRepository.save(translation));
    }

    /** Publish or draft a single language's translation independently. */
    @Transactional
    public TranslationDto patchStatus(int surahNumber, int ayahNumber,
                                       String langCode, ContentStatus status) {
        validateAyahAddress(surahNumber, ayahNumber);
        LanguageCode language;
        try {
            language = LanguageCode.valueOf(langCode);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Language '" + langCode + "' is not supported. Use en, hi, or ur.");
        }
        Translation translation = translationRepository
                .findBySurahNumberAndAyahNumberAndLanguageCode(
                        (short) surahNumber, (short) ayahNumber, language)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No " + langCode + " translation for Ayah "
                        + surahNumber + ":" + ayahNumber + "."));
        translation.setStatus(status);
        return TranslationDto.from(translationRepository.save(translation));
    }

    private void validateAyahAddress(int surahNumber, int ayahNumber) {
        if (surahNumber < 1 || surahNumber > 114) {
            throw new ResourceNotFoundException(
                    "Surah " + surahNumber + " does not exist.");
        }
        if (ayahNumber < 1 || ayahNumber > Short.MAX_VALUE
                || !ayahRepository.existsByIdSurahNumberAndIdAyahNumber(
                        (short) surahNumber, (short) ayahNumber)) {
            throw new ResourceNotFoundException(
                    "Ayah " + surahNumber + ":" + ayahNumber + " not found.");
        }
    }
}
