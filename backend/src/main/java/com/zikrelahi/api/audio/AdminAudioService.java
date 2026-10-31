package com.zikrelahi.api.audio;

import com.zikrelahi.api.media.CloudinaryMediaService;
import com.zikrelahi.api.media.MediaUploadResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAudioService {

    private static final Set<String> SORT_FIELDS =
            Set.of("title", "publishedDate", "createdAt", "updatedAt", "status", "id");

    private final AudioPersistenceService persistenceService;
    private final CloudinaryMediaService cloudinaryMediaService;

    public AudioDtos.PageSlice<AudioDtos.AudioDetailsDto> list(
            int page,
            int size,
            String query,
            String status,
            String languageCode,
            String categoryKey,
            String sortField,
            String direction) {
        AudioStatus statusFilter = parseOptionalStatus(status);
        String normalizedSort = sortField == null || sortField.isBlank() ? "updatedAt" : sortField.trim();
        if (!SORT_FIELDS.contains(normalizedSort)) {
            throw new IllegalArgumentException(
                    "Sort must be one of title, publishedDate, createdAt, updatedAt, status, or id.");
        }
        Sort.Direction sortDirection;
        try {
            sortDirection = Sort.Direction.fromString(
                    direction == null || direction.isBlank() ? "DESC" : direction.trim());
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Sort direction must be ASC or DESC.");
        }
        return persistenceService.list(
                query,
                statusFilter,
                languageCode,
                categoryKey,
                PageRequest.of(page, size, Sort.by(sortDirection, normalizedSort)));
    }

    public AudioDtos.AudioDetailsDto get(Long id) {
        return persistenceService.get(id);
    }

    public AudioDtos.AudioDetailsDto create(
            AudioDtos.AudioRequest request,
            MultipartFile audioFile,
            MultipartFile coverImage) {
        MediaUploadResult uploadedAudio = cloudinaryMediaService.uploadAudio(audioFile);
        MediaUploadResult uploadedCover;
        try {
            uploadedCover = cloudinaryMediaService.uploadCoverImage(coverImage);
        } catch (RuntimeException exception) {
            safelyDelete(uploadedAudio.publicId(), true);
            throw exception;
        }

        try {
            return persistenceService.create(request, uploadedAudio, uploadedCover);
        } catch (RuntimeException exception) {
            safelyDelete(uploadedAudio.publicId(), true);
            safelyDelete(uploadedCover.publicId(), false);
            throw exception;
        }
    }

    public AudioDtos.AudioDetailsDto update(
            Long id,
            AudioDtos.AudioRequest request,
            MultipartFile audioFile,
            MultipartFile coverImage) {
        List<UploadedAsset> uploaded = new ArrayList<>(2);
        try {
            MediaUploadResult audio = null;
            MediaUploadResult cover = null;
            if (audioFile != null && !audioFile.isEmpty()) {
                audio = cloudinaryMediaService.uploadAudio(audioFile);
                uploaded.add(new UploadedAsset(audio.publicId(), true));
            }
            if (coverImage != null && !coverImage.isEmpty()) {
                cover = cloudinaryMediaService.uploadCoverImage(coverImage);
                uploaded.add(new UploadedAsset(cover.publicId(), false));
            }
            return persistenceService.update(id, request, audio, cover);
        } catch (RuntimeException exception) {
            uploaded.forEach(asset -> safelyDelete(asset.publicId(), asset.audio()));
            throw exception;
        }
    }

    public AudioDtos.AudioDetailsDto updateStatus(Long id, String status) {
        return persistenceService.updateStatus(id, parseStatus(status));
    }

    public void delete(Long id) {
        persistenceService.delete(id);
    }

    private AudioStatus parseOptionalStatus(String status) {
        return status == null || status.isBlank() ? null : parseStatus(status);
    }

    private AudioStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("Status is required.");
        }
        try {
            return AudioStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Status must be DRAFT, PUBLISHED, or INACTIVE.");
        }
    }

    private void safelyDelete(String publicId, boolean audio) {
        try {
            if (audio) {
                cloudinaryMediaService.deleteAudio(publicId);
            } else {
                cloudinaryMediaService.deleteCoverImage(publicId);
            }
        } catch (RuntimeException exception) {
            log.warn("Compensation cleanup of a newly uploaded Cloudinary asset failed.");
        }
    }

    private record UploadedAsset(String publicId, boolean audio) {
    }
}
