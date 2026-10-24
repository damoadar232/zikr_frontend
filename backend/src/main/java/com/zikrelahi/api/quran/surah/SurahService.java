package com.zikrelahi.api.quran.surah;

import com.zikrelahi.api.common.ContentStatus;
import com.zikrelahi.api.common.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SurahService {

    private final SurahRepository surahRepository;

    @Transactional(readOnly = true)
    public List<SurahDto> listPublished(RevelationType revelation) {
        List<Surah> surahs = (revelation == null)
                ? surahRepository.findByStatusOrderByNumberAsc(ContentStatus.PUBLISHED)
                : surahRepository.findByRevelationAndStatusOrderByNumberAsc(
                        revelation, ContentStatus.PUBLISHED);
        return surahs.stream().map(SurahDto::from).toList();
    }

    @Transactional(readOnly = true)
    public SurahDto getPublished(int number) {
        if (number < 1 || number > 114) {
            throw new ResourceNotFoundException(
                    "Surah " + number + " does not exist. Valid range is 1–114.");
        }
        return surahRepository
                .findByNumberAndStatus((short) number, ContentStatus.PUBLISHED)
                .map(SurahDto::from)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Surah " + number + " is not yet published."));
    }

    @Transactional(readOnly = true)
    public List<AdminSurahDto> listAllForAdmin() {
        return surahRepository.findAllByOrderByNumberAsc().stream()
                .map(AdminSurahDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminSurahDto getForAdmin(int number) {
        return findSurah(number).map(AdminSurahDto::from)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Surah " + number + " does not exist."));
    }

    @Transactional
    public AdminSurahDto updateForAdmin(int number, SurahUpdateRequest request) {
        Surah surah = findSurah(number)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Surah " + number + " does not exist."));
        surah.setArabicName(request.arabicName().trim());
        surah.setTransliterated(request.transliterated().trim());
        surah.setEnglishMeaning(request.englishMeaning().trim());
        if (request.revelation() != null) {
            surah.setRevelation(request.revelation());
        }
        if (request.status() != null) {
            surah.setStatus(request.status());
        }
        return AdminSurahDto.from(surahRepository.save(surah));
    }

    @Transactional
    public AdminSurahDto updateStatus(int number, ContentStatus status) {
        Surah surah = findSurah(number)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Surah " + number + " does not exist."));
        surah.setStatus(status);
        return AdminSurahDto.from(surahRepository.save(surah));
    }

    private java.util.Optional<Surah> findSurah(int number) {
        if (number < 1 || number > 114) {
            return java.util.Optional.empty();
        }
        return surahRepository.findById((short) number);
    }
}
