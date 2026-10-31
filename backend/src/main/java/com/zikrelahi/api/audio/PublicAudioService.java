package com.zikrelahi.api.audio;

import com.zikrelahi.api.common.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PublicAudioService {

    private final AudioRepository audioRepository;
    private final AudioCategoryRepository categoryRepository;
    private final AudioArtistAssignmentRepository artistAssignmentRepository;

    @Transactional(readOnly = true)
    public PublicAudioDtos.PageSlice<PublicAudioDtos.AudioDto> list(
            String query,
            String languageCode,
            String categoryKey,
            Pageable pageable) {
        Page<Long> idsPage = audioRepository.findPublishedAudioIds(
                normalize(query), normalize(languageCode), normalize(categoryKey), pageable);
        List<Audio> audios = loadInPageOrder(idsPage.getContent());
        Map<Long, AudioDtos.AudioArtistCredits> credits =
                artistAssignmentRepository.findCreditsForAudios(idsPage.getContent());
        return new PublicAudioDtos.PageSlice<>(
                audios.stream().map(audio -> toPublicDto(audio, credits.get(audio.getId()))).toList(),
                idsPage.getNumber(),
                idsPage.getSize(),
                idsPage.getTotalElements(),
                idsPage.getTotalPages());
    }

    @Transactional(readOnly = true)
    public PublicAudioDtos.AudioDto get(Long id) {
        Audio audio = audioRepository.findWithLanguageAndCategoriesById(id)
                .filter(record -> record.getStatus() == AudioStatus.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException("Audio record was not found."));
        AudioDtos.AudioArtistCredits credits =
                artistAssignmentRepository.findCreditsForAudios(List.of(id)).get(id);
        return toPublicDto(audio, credits);
    }

    @Transactional(readOnly = true)
    public List<PublicAudioDtos.CategoryDto> categories() {
        return categoryRepository.findPublicCategoriesWithPublishedAudios().stream()
                .map(category -> new PublicAudioDtos.CategoryDto(
                        category.getCategoryKey(),
                        category.getName(),
                        category.getDescription()))
                .toList();
    }

    private List<Audio> loadInPageOrder(List<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<Long, Audio> audioById = new LinkedHashMap<>();
        audioRepository.findAllWithLanguageAndCategoriesByIdIn(ids)
                .forEach(audio -> audioById.put(audio.getId(), audio));
        return ids.stream().map(audioById::get).filter(audio -> audio != null).toList();
    }

    private PublicAudioDtos.AudioDto toPublicDto(Audio audio, AudioDtos.AudioArtistCredits credits) {
        List<PublicAudioDtos.CategoryDto> categories = audio.getCategories().stream()
                .filter(AudioCategory::isActive)
                .sorted((first, second) -> first.getName().compareToIgnoreCase(second.getName()))
                .map(category -> new PublicAudioDtos.CategoryDto(
                        category.getCategoryKey(),
                        category.getName(),
                        category.getDescription()))
                .toList();
        return new PublicAudioDtos.AudioDto(
                audio.getId(),
                audio.getTitle(),
                audio.getDescription(),
                new PublicAudioDtos.LanguageDto(
                        audio.getLanguage().getCode(),
                        audio.getLanguage().getName(),
                        audio.getLanguage().getNativeName()),
                audio.getAudioUrl(),
                audio.getAudioDurationSeconds(),
                audio.getCoverImageUrl(),
                categories,
                mapCredits(credits == null ? List.of() : credits.singers()),
                mapCredits(credits == null ? List.of() : credits.writers()),
                audio.getPublishedDate());
    }

    private List<PublicAudioDtos.ArtistDto> mapCredits(List<AudioDtos.ArtistCreditDto> credits) {
        return credits.stream()
                .map(credit -> new PublicAudioDtos.ArtistDto(
                        credit.id(),
                        credit.artistKey(),
                        credit.fullName(),
                        credit.displayName(),
                        credit.position()))
                .toList();
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim().toLowerCase();
    }
}
