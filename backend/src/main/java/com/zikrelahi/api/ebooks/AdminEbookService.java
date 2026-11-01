package com.zikrelahi.api.ebooks;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminEbookService {

    private static final Set<String> SORT_FIELDS =
            Set.of("title", "publishedDate", "createdAt", "updatedAt", "status", "id");

    private final EbookPersistenceService persistenceService;
    private final EbookMediaService mediaService;

    public EbookPageResponse list(
            int page,
            int size,
            String query,
            String categoryKey,
            Long authorId,
            String languageCode,
            String status,
            String sortField,
            String direction) {
        EbookStatus statusFilter = parseOptionalStatus(status);
        String normalizedSort = sortField == null || sortField.isBlank() ? "publishedDate" : sortField.trim();
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
        String databaseSortField = switch (normalizedSort) {
            case "publishedDate" -> "published_date";
            case "createdAt" -> "created_at";
            case "updatedAt" -> "updated_at";
            default -> normalizedSort;
        };
        Sort sort = Sort.by(sortDirection, databaseSortField).and(Sort.by(sortDirection, "id"));
        return persistenceService.list(
                query,
                statusFilter,
                languageCode,
                categoryKey,
                authorId,
                PageRequest.of(page, size, sort));
    }

    public EbookResponse get(Long id) {
        return persistenceService.get(id);
    }

    public EbookResponse create(
            CreateEbookRequest request,
            MultipartFile coverImage,
            MultipartFile bookFile) {
        persistenceService.validateCreateReferences(request);
        EbookMediaFiles uploaded = mediaService.uploadFiles(coverImage, bookFile);
        try {
            return persistenceService.create(request, uploaded);
        } catch (RuntimeException exception) {
            mediaService.cleanupUploaded(uploaded);
            throw exception;
        }
    }

    public EbookResponse update(
            Long id,
            UpdateEbookRequest request,
            MultipartFile coverImage,
            MultipartFile bookFile) {
        persistenceService.validateUpdateReferences(id, request);
        EbookMediaFiles replacements = uploadReplacements(coverImage, bookFile);
        try {
            return persistenceService.update(id, request, replacements);
        } catch (RuntimeException exception) {
            mediaService.cleanupUploaded(replacements);
            throw exception;
        }
    }

    public EbookResponse updateStatus(Long id, String status) {
        return persistenceService.updateStatus(id, parseStatus(status));
    }

    public void delete(Long id) {
        persistenceService.delete(id);
    }

    public java.util.List<EbookCategoryResponse> activeCategories() {
        return persistenceService.activeCategories();
    }

    private EbookMediaFiles uploadReplacements(MultipartFile coverImage, MultipartFile bookFile) {
        EbookMediaMetadata cover = null;
        EbookMediaMetadata book = null;
        try {
            if (hasFile(coverImage)) {
                cover = mediaService.uploadCoverImage(coverImage);
            }
            if (hasFile(bookFile)) {
                book = mediaService.uploadBookFile(bookFile);
            }
            return cover == null && book == null ? null : new EbookMediaFiles(cover, book);
        } catch (RuntimeException exception) {
            mediaService.cleanupUploaded(cover == null && book == null
                    ? null
                    : new EbookMediaFiles(cover, book));
            throw exception;
        }
    }

    private boolean hasFile(MultipartFile file) {
        return file != null && !file.isEmpty();
    }

    private EbookStatus parseOptionalStatus(String status) {
        return status == null || status.isBlank() ? null : parseStatus(status);
    }

    private EbookStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("Status is required.");
        }
        try {
            return EbookStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Status must be DRAFT, PUBLISHED, or INACTIVE.");
        }
    }
}
