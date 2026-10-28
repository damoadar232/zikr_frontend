package com.zikrelahi.api.quran.translation;

import com.zikrelahi.api.common.ContentStatus;
import com.zikrelahi.api.common.ConflictException;
import com.zikrelahi.api.common.ResourceNotFoundException;
import com.zikrelahi.api.quran.ayah.AyahRepository;
import com.zikrelahi.api.quran.translator.Translator;
import com.zikrelahi.api.quran.translator.TranslatorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Manages each translator's translation independently.
 * Updating one translator never touches another translation row.
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
                .findBySurahNumberAndAyahNumberOrderByLanguageCodeAscTranslatorIdAsc(
                        (short) surahNumber, (short) ayahNumber)
                .stream()
                .map(TranslationDto::from)
                .toList();
    }

    /** Creates or replaces exactly the selected translator's translation. */
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
                .findBySurahNumberAndAyahNumberAndLanguageCodeAndTranslatorId(
                        (short) surahNumber, (short) ayahNumber, language, translator.getId())
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

    /**
     * Legacy status route is only unambiguous when there is one translator for
     * the language. Multi-translator callers must use the translator-ID route.
     */
    @Transactional
    public TranslationDto patchStatus(int surahNumber, int ayahNumber,
                                       String langCode, ContentStatus status) {
        validateAyahAddress(surahNumber, ayahNumber);
        LanguageCode language = parseLanguage(langCode);
        List<Translation> matches = translationRepository
                .findBySurahNumberAndAyahNumberAndLanguageCodeOrderByTranslatorIdAsc(
                        (short) surahNumber, (short) ayahNumber, language);
        if (matches.isEmpty()) {
            throw new ResourceNotFoundException(
                    "No " + langCode + " translation for Ayah "
                    + surahNumber + ":" + ayahNumber + ".");
        }
        if (matches.size() > 1) {
            throw new ConflictException(
                    "A translator ID is required when multiple " + langCode
                    + " translations exist for Ayah " + surahNumber + ":" + ayahNumber + ".");
        }
        return updateStatus(matches.get(0), status);
    }

    @Transactional
    public TranslationDto patchStatus(int surahNumber, int ayahNumber,
                                     String langCode, Long translatorId, ContentStatus status) {
        validateAyahAddress(surahNumber, ayahNumber);
        LanguageCode language = parseLanguage(langCode);
        Translation translation = translationRepository
                .findBySurahNumberAndAyahNumberAndLanguageCodeAndTranslatorId(
                        (short) surahNumber, (short) ayahNumber, language, translatorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No " + langCode + " translation from translator " + translatorId
                        + " for Ayah " + surahNumber + ":" + ayahNumber + "."));
        return updateStatus(translation, status);
    }

    private TranslationDto updateStatus(Translation translation, ContentStatus status) {
        translation.setStatus(status);
        return TranslationDto.from(translationRepository.save(translation));
    }

    private static LanguageCode parseLanguage(String langCode) {
        try {
            return LanguageCode.valueOf(langCode);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Language '" + langCode + "' is not supported. Use en, hi, or ur.");
        }
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
