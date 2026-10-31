package com.zikrelahi.api.audio;

import com.zikrelahi.api.artists.Artist;
import com.zikrelahi.api.artists.ArtistRepository;
import com.zikrelahi.api.common.ConflictException;
import com.zikrelahi.api.common.ResourceNotFoundException;
import com.zikrelahi.api.languages.Language;
import com.zikrelahi.api.languages.LanguageRepository;
import com.zikrelahi.api.media.CloudinaryMediaService;
import com.zikrelahi.api.media.MediaUploadResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class AudioPersistenceService {

    private final AudioRepository audioRepository;
    private final AudioCategoryRepository categoryRepository;
    private final AudioArtistAssignmentRepository artistAssignmentRepository;
    private final ArtistRepository artistRepository;
    private final LanguageRepository languageRepository;
    private final CloudinaryMediaService cloudinaryMediaService;

    @Transactional(readOnly = true)
    public AudioDtos.PageSlice<AudioDtos.AudioDetailsDto> list(
            String query,
            AudioStatus status,
            String languageCode,
            String categoryKey,
            Pageable pageable) {
        Page<Long> idsPage = audioRepository.findAudioIds(
                normalize(query), status, normalize(languageCode), normalize(categoryKey), pageable);
        List<Audio> audios = loadInPageOrder(idsPage.getContent());
        Map<Long, AudioDtos.AudioArtistCredits> credits =
                artistAssignmentRepository.findCreditsForAudios(idsPage.getContent());
        return new AudioDtos.PageSlice<>(
                audios.stream().map(audio -> toDetails(audio, credits.get(audio.getId()))).toList(),
                idsPage.getNumber(),
                idsPage.getSize(),
                idsPage.getTotalElements(),
                idsPage.getTotalPages());
    }

    @Transactional(readOnly = true)
    public AudioDtos.AudioDetailsDto get(Long id) {
        Audio audio = findAudio(id);
        AudioDtos.AudioArtistCredits credits =
                artistAssignmentRepository.findCreditsForAudios(List.of(id)).get(id);
        return toDetails(audio, credits);
    }

    @Transactional
    public AudioDtos.AudioDetailsDto create(
            AudioDtos.AudioRequest request,
            MediaUploadResult audioMedia,
            MediaUploadResult coverMedia) {
        Audio audio = new Audio();
        applyMetadata(audio, request, true);
        applyMedia(audio, audioMedia, coverMedia);
        updateCategories(audio, request.categoryKeys());
        Audio saved = audioRepository.saveAndFlush(audio);
        replaceArtistAssignments(saved.getId(), request);
        return toDetails(saved, artistAssignmentRepository.findCreditsForAudios(List.of(saved.getId()))
                .get(saved.getId()));
    }

    @Transactional
    public AudioDtos.AudioDetailsDto update(
            Long id,
            AudioDtos.AudioRequest request,
            MediaUploadResult audioMedia,
            MediaUploadResult coverMedia) {
        Audio audio = findAudio(id);
        String oldAudioPublicId = audio.getAudioPublicId();
        String oldCoverPublicId = audio.getCoverImagePublicId();

        applyMetadata(audio, request, false);
        if (audioMedia != null) {
            applyAudioMedia(audio, audioMedia);
        }
        if (coverMedia != null) {
            applyCoverMedia(audio, coverMedia);
        }
        updateCategories(audio, request.categoryKeys());
        Audio saved = audioRepository.saveAndFlush(audio);
        replaceArtistAssignments(saved.getId(), request);

        if (audioMedia != null) {
            deleteAfterCommit(oldAudioPublicId, audioMedia.publicId(), true);
        }
        if (coverMedia != null) {
            deleteAfterCommit(oldCoverPublicId, coverMedia.publicId(), false);
        }
        return toDetails(saved, artistAssignmentRepository.findCreditsForAudios(List.of(saved.getId()))
                .get(saved.getId()));
    }

    @Transactional
    public AudioDtos.AudioDetailsDto updateStatus(Long id, AudioStatus status) {
        Audio audio = findAudio(id);
        audio.setStatus(status);
        Audio saved = audioRepository.saveAndFlush(audio);
        AudioDtos.AudioArtistCredits credits =
                artistAssignmentRepository.findCreditsForAudios(List.of(id)).get(id);
        return toDetails(saved, credits);
    }

    @Transactional
    public void delete(Long id) {
        Audio audio = findAudio(id);
        String audioPublicId = audio.getAudioPublicId();
        String coverPublicId = audio.getCoverImagePublicId();

        audio.getCategories().clear();
        audioRepository.saveAndFlush(audio);
        artistAssignmentRepository.deleteForAudio(id);
        audioRepository.delete(audio);
        audioRepository.flush();

        deleteAfterCommit(audioPublicId, null, true);
        deleteAfterCommit(coverPublicId, null, false);
    }

    private void applyMetadata(Audio audio, AudioDtos.AudioRequest request, boolean creating) {
        if (request == null || request.title() == null || request.title().isBlank()) {
            throw new IllegalArgumentException("Title is required.");
        }
        if (request.languageCode() == null || request.languageCode().isBlank()) {
            throw new IllegalArgumentException("Language is required.");
        }
        audio.setTitle(request.title().trim());
        audio.setDescription(request.description());
        audio.setLanguage(languageRepository.findById(request.languageCode().trim())
                .filter(Language::isActive)
                .orElseThrow(() -> new IllegalArgumentException("The selected language does not exist or is inactive.")));
        audio.setPublishedDate(request.publishedDate());

        if (request.status() != null && !request.status().isBlank()) {
            audio.setStatus(parseStatus(request.status()));
        } else if (creating) {
            audio.setStatus(AudioStatus.DRAFT);
        }
    }

    private void applyMedia(Audio audio, MediaUploadResult audioMedia, MediaUploadResult coverMedia) {
        applyAudioMedia(audio, audioMedia);
        applyCoverMedia(audio, coverMedia);
    }

    private void applyAudioMedia(Audio audio, MediaUploadResult media) {
        audio.setOriginalAudioFilename(media.originalFilename());
        audio.setAudioUrl(media.secureUrl());
        audio.setAudioPublicId(media.publicId());
        audio.setAudioFormat(media.format());
        audio.setAudioSize(media.sizeBytes());
        audio.setAudioDurationSeconds(media.durationSeconds());
    }

    private void applyCoverMedia(Audio audio, MediaUploadResult media) {
        audio.setOriginalCoverFilename(media.originalFilename());
        audio.setCoverImageUrl(media.secureUrl());
        audio.setCoverImagePublicId(media.publicId());
        audio.setCoverImageFormat(media.format());
    }

    private void updateCategories(Audio audio, List<String> categoryKeys) {
        List<AudioCategory> categories = resolveCategories(categoryKeys);
        audio.getCategories().clear();
        audio.getCategories().addAll(categories);
    }

    private List<AudioCategory> resolveCategories(List<String> categoryKeys) {
        if (categoryKeys == null || categoryKeys.isEmpty()) {
            throw new IllegalArgumentException("At least one category is required.");
        }
        Set<String> uniqueKeys = new HashSet<>();
        for (String key : categoryKeys) {
            if (key == null || key.isBlank() || !uniqueKeys.add(key.trim())) {
                throw new IllegalArgumentException("Category mappings must be present and unique.");
            }
        }
        List<String> normalizedKeys = categoryKeys.stream().map(String::trim).toList();
        List<AudioCategory> categories = categoryRepository.findAllById(normalizedKeys).stream()
                .filter(AudioCategory::isActive)
                .toList();
        if (categories.size() != normalizedKeys.size()) {
            throw new IllegalArgumentException("One or more selected categories do not exist or are inactive.");
        }
        Map<String, AudioCategory> byKey = new LinkedHashMap<>();
        categories.forEach(category -> byKey.put(category.getCategoryKey(), category));
        return normalizedKeys.stream().map(byKey::get).toList();
    }

    private void replaceArtistAssignments(Long audioId, AudioDtos.AudioRequest request) {
        List<Artist> singers = resolveArtists(request.singerArtistIds(), "Singer");
        List<Artist> writers = resolveArtists(request.writerArtistIds(), "Writer");
        artistAssignmentRepository.replace(audioId, "SINGER", singers);
        artistAssignmentRepository.replace(audioId, "WRITER", writers);
    }

    private List<Artist> resolveArtists(List<Long> artistIds, String role) {
        if (artistIds == null || artistIds.isEmpty()) {
            return List.of();
        }
        Set<Long> uniqueIds = new HashSet<>();
        for (Long artistId : artistIds) {
            if (artistId == null || artistId <= 0 || !uniqueIds.add(artistId)) {
                throw new IllegalArgumentException(role + " artist mappings must contain unique valid IDs.");
            }
        }
        Map<Long, Artist> artistsById = new LinkedHashMap<>();
        artistRepository.findAllById(artistIds).forEach(artist -> artistsById.put(artist.getId(), artist));
        if (artistsById.size() != artistIds.size()) {
            throw new IllegalArgumentException("One or more selected " + role.toLowerCase() + " artists do not exist.");
        }
        List<Artist> artists = new ArrayList<>(artistIds.size());
        for (Long artistId : artistIds) {
            artists.add(artistsById.get(artistId));
        }
        return artists;
    }

    private List<Audio> loadInPageOrder(List<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<Long, Audio> audiosById = new LinkedHashMap<>();
        audioRepository.findAllWithLanguageAndCategoriesByIdIn(ids)
                .forEach(audio -> audiosById.put(audio.getId(), audio));
        return ids.stream().map(audiosById::get).filter(audio -> audio != null).toList();
    }

    private Audio findAudio(Long id) {
        return audioRepository.findWithLanguageAndCategoriesById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Audio record was not found."));
    }

    private AudioStatus parseStatus(String status) {
        try {
            return AudioStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Status must be DRAFT, PUBLISHED, or INACTIVE.");
        }
    }

    private void deleteAfterCommit(String oldPublicId, String newPublicId, boolean audio) {
        if (oldPublicId == null || oldPublicId.isBlank()
                || oldPublicId.equals(newPublicId)) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    if (audio) {
                        cloudinaryMediaService.deleteAudio(oldPublicId);
                    } else {
                        cloudinaryMediaService.deleteCoverImage(oldPublicId);
                    }
                } catch (RuntimeException exception) {
                    log.warn("Post-commit Audio media cleanup failed.");
                }
            }
        });
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim().toLowerCase();
    }

    private AudioDtos.AudioDetailsDto toDetails(Audio audio, AudioDtos.AudioArtistCredits credits) {
        List<AudioDtos.CategoryDto> categories = audio.getCategories().stream()
                .sorted((first, second) -> first.getName().compareToIgnoreCase(second.getName()))
                .map(category -> new AudioDtos.CategoryDto(
                        category.getCategoryKey(),
                        category.getName(),
                        category.getDescription(),
                        category.isActive(),
                        category.getCreatedAt(),
                        category.getUpdatedAt()))
                .toList();
        return new AudioDtos.AudioDetailsDto(
                audio.getId(),
                audio.getTitle(),
                audio.getDescription(),
                new AudioDtos.LanguageDto(
                        audio.getLanguage().getCode(),
                        audio.getLanguage().getName(),
                        audio.getLanguage().getNativeName(),
                        audio.getLanguage().isActive()),
                categories,
                credits == null ? List.of() : credits.singers(),
                credits == null ? List.of() : credits.writers(),
                audio.getOriginalAudioFilename(),
                audio.getAudioUrl(),
                audio.getAudioPublicId(),
                audio.getAudioFormat(),
                audio.getAudioSize(),
                audio.getAudioDurationSeconds(),
                audio.getOriginalCoverFilename(),
                audio.getCoverImageUrl(),
                audio.getCoverImagePublicId(),
                audio.getCoverImageFormat(),
                audio.getPublishedDate(),
                audio.getStatus(),
                audio.getCreatedAt(),
                audio.getUpdatedAt());
    }
}
