package com.zikrelahi.api.quran.juz;

import com.zikrelahi.api.common.ContentStatus;
import com.zikrelahi.api.common.ResourceNotFoundException;
import com.zikrelahi.api.quran.ayah.Ayah;
import com.zikrelahi.api.quran.ayah.PublicAyahDto;
import com.zikrelahi.api.quran.ayah.PublicAyahTranslationDto;
import com.zikrelahi.api.quran.translation.LanguageCode;
import com.zikrelahi.api.quran.translation.Translation;
import com.zikrelahi.api.quran.translation.TranslationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class JuzService {

    private final JuzRepository juzRepository;
    private final TranslationRepository translationRepository;

    @Transactional(readOnly = true)
    public List<JuzDto> listAll() {
        return juzRepository.findAllByOrderByNumberAsc()
                .stream()
                .map(JuzDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public JuzDto getOne(int number) {
        return JuzDto.from(getJuz(number));
    }

    @Transactional(readOnly = true)
    public List<PublicAyahDto> listPublishedAyahs(int number, String languageCode) {
        Juz juz = getJuz(number);
        LanguageCode language;
        try {
            language = LanguageCode.valueOf(languageCode);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Translation language '" + languageCode + "' is not supported. Use en, hi, or ur.");
        }
        Map<String, PublicAyahDto> ayahs = new LinkedHashMap<>();
        translationRepository.findPublishedAyahsBetween(
                        juz.getStartSurah(), juz.getStartAyah(),
                        juz.getEndSurah(), juz.getEndAyah(),
                        language, ContentStatus.PUBLISHED)
                .forEach(row -> {
                    Ayah ayah = (Ayah) row[0];
                    ayahs.putIfAbsent(
                            ayah.getSurahNumber() + ":" + ayah.getAyahNumber(),
                            PublicAyahDto.from(ayah, (Translation) row[1], (String) row[2]));
                });
        return List.copyOf(ayahs.values());
    }

    @Transactional(readOnly = true)
    public List<PublicAyahTranslationDto> listPublishedTranslations(
            int number, List<String> languageCodes) {
        Juz juz = getJuz(number);
        List<LanguageCode> languages = parseLanguages(languageCodes);
        if (languages.isEmpty()) return List.of();

        return translationRepository.findPublishedTranslationsBetween(
                        juz.getStartSurah(), juz.getStartAyah(),
                        juz.getEndSurah(), juz.getEndAyah(),
                        languages, ContentStatus.PUBLISHED)
                .stream()
                .map(JuzService::toPublicTranslation)
                .toList();
    }

    private static List<LanguageCode> parseLanguages(List<String> languageCodes) {
        if (languageCodes == null) return List.of();
        LinkedHashSet<LanguageCode> languages = new LinkedHashSet<>();
        for (String code : languageCodes) {
            try {
                languages.add(LanguageCode.valueOf(code));
            } catch (IllegalArgumentException | NullPointerException ex) {
                throw new IllegalArgumentException(
                        "Translation languages must be en, hi, or ur.");
            }
        }
        return List.copyOf(languages);
    }

    private static PublicAyahTranslationDto toPublicTranslation(Object[] row) {
        return new PublicAyahTranslationDto(
                ((Number) row[0]).intValue(),
                ((Number) row[1]).intValue(),
                ((LanguageCode) row[2]).name(),
                (Long) row[3],
                (String) row[4],
                (String) row[5]);
    }

    private Juz getJuz(int number) {
        if (number < 1 || number > 30) {
            throw new ResourceNotFoundException(
                    "Juz " + number + " does not exist. Valid range is 1–30.");
        }
        return juzRepository.findById((byte) number)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Juz " + number + " was not found."));
    }
}
