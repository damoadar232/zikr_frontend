package com.zikrelahi.api.quran.juz;

import com.zikrelahi.api.common.ContentStatus;
import com.zikrelahi.api.common.ResourceNotFoundException;
import com.zikrelahi.api.quran.ayah.PublicAyahDto;
import com.zikrelahi.api.quran.translation.LanguageCode;
import com.zikrelahi.api.quran.translation.Translation;
import com.zikrelahi.api.quran.translation.TranslationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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
        return translationRepository.findPublishedAyahsBetween(
                        juz.getStartSurah(), juz.getStartAyah(),
                        juz.getEndSurah(), juz.getEndAyah(),
                        language, ContentStatus.PUBLISHED)
                .stream()
                .map(row -> PublicAyahDto.from(
                        (com.zikrelahi.api.quran.ayah.Ayah) row[0],
                        (Translation) row[1],
                        (String) row[2]))
                .toList();
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
