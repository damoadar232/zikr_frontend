package com.zikrelahi.api.quran.ayah;

import com.zikrelahi.api.common.ConflictException;
import com.zikrelahi.api.common.ContentStatus;
import com.zikrelahi.api.common.ResourceNotFoundException;
import com.zikrelahi.api.quran.surah.Surah;
import com.zikrelahi.api.quran.surah.SurahRepository;
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
public class AyahService {

    private final AyahRepository ayahRepository;
    private final SurahRepository surahRepository;
    private final TranslationRepository translationRepository;

    // ─── Admin operations ─────────────────────────────────────────────────────

    @Transactional
    public AyahDto create(AyahRequest req) {
        // 1. Validate Surah bounds
        Surah surah = surahRepository.findById((short) (int) req.surahNumber())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Surah " + req.surahNumber() + " does not exist."));

        // 2. Validate Ayah bounds against authoritative Surah ayah_count
        if (req.ayahNumber() < 1 || req.ayahNumber() > surah.getAyahCount()) {
            throw new IllegalArgumentException(
                    "Ayah " + req.ayahNumber() + " is out of range for Surah "
                    + req.surahNumber() + " (max " + surah.getAyahCount() + ").");
        }

        // 3. Reject duplicates
        if (ayahRepository.existsByIdSurahNumberAndIdAyahNumber(
                (short) (int) req.surahNumber(), (short) (int) req.ayahNumber())) {
            throw new ConflictException(
                    "Ayah " + req.surahNumber() + ":" + req.ayahNumber()
                    + " already exists. Use PUT to update it.");
        }

        // 4. Persist
        Ayah ayah = Ayah.builder()
                .id(AyahId.of(req.surahNumber(), req.ayahNumber()))
                .surah(surah)
                .arabicText(req.arabicText().trim())
                .status(req.effectiveStatus())
                .build();
        return AyahDto.from(ayahRepository.save(ayah));
    }

    @Transactional(readOnly = true)
    public AyahDto getOne(int surahNumber, int ayahNumber) {
        return AyahDto.from(resolveAyah(surahNumber, ayahNumber));
    }

    @Transactional(readOnly = true)
    public List<AyahDto> listBySurah(int surahNumber) {
        if (surahNumber < 1 || surahNumber > 114) {
            throw new ResourceNotFoundException(
                    "Surah " + surahNumber + " does not exist.");
        }
        Surah surah = surahRepository.findById((short) surahNumber)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Surah " + surahNumber + " does not exist."));
        return ayahRepository
                .findByIdSurahNumberOrderByIdAyahNumberAsc(surah.getNumber())
                .stream()
                .map(AyahDto::from)
                .toList();
    }

    @Transactional
    public AyahDto updateStatus(int surahNumber, int ayahNumber, ContentStatus status) {
        Ayah ayah = resolveAyah(surahNumber, ayahNumber);
        ayah.setStatus(status);
        return AyahDto.from(ayahRepository.save(ayah));
    }

    @Transactional
    public AyahDto update(int surahNumber, int ayahNumber, AyahRequest request) {
        if (request.surahNumber() != surahNumber || request.ayahNumber() != ayahNumber) {
            throw new IllegalArgumentException(
                    "Ayah address in the request must match the URL.");
        }
        Ayah ayah = resolveAyah(surahNumber, ayahNumber);
        ayah.setArabicText(request.arabicText().trim());
        if (request.status() != null) {
            ayah.setStatus(request.status());
        }
        return AyahDto.from(ayahRepository.save(ayah));
    }

    @Transactional
    public void delete(int surahNumber, int ayahNumber) {
        Ayah ayah = resolveAyah(surahNumber, ayahNumber);
        ayahRepository.delete(ayah);
    }

    // ─── Public reader operation ──────────────────────────────────────────────

    /**
     * Returns every published Ayah in a published Surah. The requested
     * translation is optional and is null when no published translation exists.
     */
    @Transactional(readOnly = true)
    public List<PublicAyahDto> listPublishedWithTranslation(int surahNumber, String langCode) {
        if (surahNumber < 1 || surahNumber > 114) {
            throw new ResourceNotFoundException(
                    "Surah " + surahNumber + " does not exist.");
        }
        surahRepository.findByNumberAndStatus((short) surahNumber, ContentStatus.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Surah " + surahNumber + " is not yet published."));
        LanguageCode language;
        try {
            language = LanguageCode.valueOf(langCode);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Translation language '" + langCode + "' is not supported. Use en, hi, or ur.");
        }
        Map<Integer, PublicAyahDto> ayahs = new LinkedHashMap<>();
        translationRepository
                .findPublishedAyahsBySurahAndLanguage(
                        (short) surahNumber, language, ContentStatus.PUBLISHED)
                .stream()
                .forEach(row -> {
                    Ayah ayah = (Ayah) row[0];
                    ayahs.putIfAbsent((int) ayah.getAyahNumber(), PublicAyahDto.from(
                            ayah, (Translation) row[1], (String) row[2]));
                });
        return List.copyOf(ayahs.values());
    }

    /**
     * Returns only published translation rows for the requested languages.
     * Translator IDs are included so reader preferences never rely on names.
     */
    @Transactional(readOnly = true)
    public List<PublicAyahTranslationDto> listPublishedTranslations(
            int surahNumber, List<String> languageCodes) {
        if (surahNumber < 1 || surahNumber > 114) {
            throw new ResourceNotFoundException(
                    "Surah " + surahNumber + " does not exist.");
        }
        surahRepository.findByNumberAndStatus((short) surahNumber, ContentStatus.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Surah " + surahNumber + " is not yet published."));

        List<LanguageCode> languages = parseLanguages(languageCodes);
        if (languages.isEmpty()) return List.of();

        return translationRepository.findPublishedTranslationsBySurahAndLanguages(
                        (short) surahNumber, languages, ContentStatus.PUBLISHED)
                .stream()
                .map(AyahService::toPublicTranslation)
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

    // ─── Internal helpers ─────────────────────────────────────────────────────

    private Ayah resolveAyah(int surahNumber, int ayahNumber) {
        if (surahNumber < 1 || surahNumber > 114) {
            throw new ResourceNotFoundException(
                    "Surah " + surahNumber + " does not exist.");
        }
        Surah surah = surahRepository.findById((short) surahNumber)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Surah " + surahNumber + " does not exist."));
        if (ayahNumber < 1 || ayahNumber > surah.getAyahCount()) {
            throw new IllegalArgumentException(
                    "Ayah " + ayahNumber + " is out of range for Surah "
                    + surahNumber + " (max " + surah.getAyahCount() + ").");
        }
        return ayahRepository
                .findByIdSurahNumberAndIdAyahNumber(
                        (short) surahNumber, (short) ayahNumber)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ayah " + surahNumber + ":" + ayahNumber + " not found."));
    }
}
