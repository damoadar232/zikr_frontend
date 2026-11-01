package com.zikrelahi.api.ebooks;

import com.zikrelahi.api.artists.Artist;
import com.zikrelahi.api.artists.ArtistRepository;
import com.zikrelahi.api.common.ResourceNotFoundException;
import com.zikrelahi.api.languages.Language;
import com.zikrelahi.api.languages.LanguageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class EbookPersistenceService {

    private final EbookRepository ebookRepository;
    private final EbookCategoryRepository categoryRepository;
    private final EbookAuthorAssignmentRepository authorAssignmentRepository;
    private final ArtistRepository artistRepository;
    private final LanguageRepository languageRepository;
    private final EbookMediaService mediaService;

    @Transactional(readOnly = true)
    public void validateCreateReferences(CreateEbookRequest request) {
        resolveLanguage(request.languageCode());
        resolveCategories(request.categoryKeys());
        resolveAuthors(request.authorIds());
    }

    @Transactional(readOnly = true)
    public void validateUpdateReferences(Long id, UpdateEbookRequest request) {
        findEbook(id);
        resolveLanguage(request.languageCode());
        resolveCategories(request.categoryKeys());
        resolveAuthors(request.authorIds());
    }

    @Transactional(readOnly = true)
    public EbookPageResponse list(
            String query,
            EbookStatus status,
            String languageCode,
            String categoryKey,
            Long authorId,
            Pageable pageable) {
        Page<Long> idsPage = ebookRepository.findEbookIds(
                normalizeQuery(query),
                false,
                status == null ? null : status.name(),
                normalize(languageCode),
                normalize(categoryKey),
                authorId,
                pageable);

        List<Ebook> ebooks = loadInPageOrder(idsPage.getContent());
        Map<Long, List<Artist>> authors = authorAssignmentRepository.findAuthorsForEbooks(idsPage.getContent());
        List<EbookListItemResponse> items = ebooks.stream()
                .map(ebook -> toListItem(ebook, authors.get(ebook.getId())))
                .toList();
        return new EbookPageResponse(
                items,
                idsPage.getNumber(),
                idsPage.getSize(),
                idsPage.getTotalElements(),
                idsPage.getTotalPages());
    }

    @Transactional(readOnly = true)
    public EbookResponse get(Long id) {
        Ebook ebook = findEbook(id);
        return toResponse(ebook, authorAssignmentRepository.findAuthorsForEbooks(List.of(id)).get(id));
    }

    @Transactional(readOnly = true)
    public EbookPageResponse listPublished(
            String search,
            String categoryKey,
            Long authorId,
            String languageCode,
            Pageable pageable) {
        Page<Long> idsPage = ebookRepository.findEbookIds(
                normalizeQuery(search),
                true,
                EbookStatus.PUBLISHED.name(),
                normalize(languageCode),
                normalize(categoryKey),
                authorId,
                pageable);

        List<Ebook> ebooks = loadInPageOrder(idsPage.getContent());
        Map<Long, List<Artist>> authors = authorAssignmentRepository.findAuthorsForEbooks(idsPage.getContent());
        return new EbookPageResponse(
                ebooks.stream()
                        .map(ebook -> toPublicListItem(ebook, authors.get(ebook.getId())))
                        .toList(),
                idsPage.getNumber(),
                idsPage.getSize(),
                idsPage.getTotalElements(),
                idsPage.getTotalPages());
    }

    @Transactional(readOnly = true)
    public EbookListItemResponse getPublished(Long id) {
        Ebook ebook = findPublishedEbook(id);
        return toPublicListItem(ebook, authorAssignmentRepository.findAuthorsForEbooks(List.of(id)).get(id));
    }

    @Transactional(readOnly = true)
    public EbookPdfAsset getPublishedBookAsset(Long id) {
        Ebook ebook = findPublishedEbook(id);
        return new EbookPdfAsset(ebook.getBookFilePublicId(), ebook.getOriginalBookFilename());
    }

    @Transactional(readOnly = true)
    public List<EbookCategoryResponse> activeCategories() {
        return categoryRepository.findAllByActiveTrueOrderByNameAsc().stream()
                .map(this::toCategory)
                .toList();
    }

    @Transactional
    public EbookResponse create(CreateEbookRequest request, EbookMediaFiles media) {
        Ebook ebook = new Ebook();
        ebook.setTitle(request.title().trim());
        ebook.setDescription(request.description().trim());
        ebook.setLanguage(resolveLanguage(request.languageCode()));
        ebook.setPublishedDate(request.publishedDate());
        ebook.setStatus(request.status() == null ? EbookStatus.DRAFT : parseStatus(request.status()));
        applyMedia(ebook, media);
        ebook.setCategories(new LinkedHashSet<>(resolveCategories(request.categoryKeys())));

        Ebook saved = ebookRepository.saveAndFlush(ebook);
        authorAssignmentRepository.replace(saved.getId(), resolveAuthors(request.authorIds()));
        return toResponse(saved, authorAssignmentRepository.findAuthorsForEbooks(List.of(saved.getId()))
                .get(saved.getId()));
    }

    @Transactional
    public EbookResponse update(Long id, UpdateEbookRequest request, EbookMediaFiles replacements) {
        Ebook ebook = findEbook(id);
        String oldCoverPublicId = ebook.getCoverImagePublicId();
        String oldBookPublicId = ebook.getBookFilePublicId();

        ebook.setTitle(request.title().trim());
        ebook.setDescription(request.description().trim());
        ebook.setLanguage(resolveLanguage(request.languageCode()));
        ebook.setPublishedDate(request.publishedDate());
        if (request.status() != null) {
            ebook.setStatus(parseStatus(request.status()));
        }
        if (replacements != null && replacements.coverImage() != null) {
            applyCover(ebook, replacements.coverImage());
        }
        if (replacements != null && replacements.bookFile() != null) {
            applyBook(ebook, replacements.bookFile());
        }
        ebook.setCategories(new LinkedHashSet<>(resolveCategories(request.categoryKeys())));

        Ebook saved = ebookRepository.saveAndFlush(ebook);
        authorAssignmentRepository.replace(saved.getId(), resolveAuthors(request.authorIds()));
        if (replacements != null
                && (replacements.coverImage() != null || replacements.bookFile() != null)) {
            mediaService.deleteReplacedMediaAfterCommit(oldCoverPublicId, oldBookPublicId, replacements);
        }
        return toResponse(saved, authorAssignmentRepository.findAuthorsForEbooks(List.of(saved.getId()))
                .get(saved.getId()));
    }

    @Transactional
    public EbookResponse updateStatus(Long id, EbookStatus status) {
        Ebook ebook = findEbook(id);
        ebook.setStatus(status);
        Ebook saved = ebookRepository.saveAndFlush(ebook);
        return toResponse(saved, authorAssignmentRepository.findAuthorsForEbooks(List.of(id)).get(id));
    }

    @Transactional
    public void delete(Long id) {
        Ebook ebook = findEbook(id);
        String coverPublicId = ebook.getCoverImagePublicId();
        String bookPublicId = ebook.getBookFilePublicId();

        ebook.getCategories().clear();
        ebookRepository.saveAndFlush(ebook);
        authorAssignmentRepository.deleteForEbook(id);
        ebookRepository.delete(ebook);
        ebookRepository.flush();
        mediaService.deleteMediaAfterCommit(coverPublicId, bookPublicId);
    }

    private void applyMedia(Ebook ebook, EbookMediaFiles media) {
        if (media == null || media.coverImage() == null || media.bookFile() == null) {
            throw new IllegalArgumentException("A cover image and PDF book file are required.");
        }
        applyCover(ebook, media.coverImage());
        applyBook(ebook, media.bookFile());
    }

    private void applyCover(Ebook ebook, EbookMediaMetadata media) {
        ebook.setOriginalCoverFilename(media.originalFilename());
        ebook.setCoverImageUrl(media.secureUrl());
        ebook.setCoverImagePublicId(media.publicId());
        ebook.setCoverImageFormat(media.format());
        ebook.setCoverImageSize(media.sizeBytes());
    }

    private void applyBook(Ebook ebook, EbookMediaMetadata media) {
        ebook.setOriginalBookFilename(media.originalFilename());
        ebook.setBookFileUrl(media.secureUrl());
        ebook.setBookFilePublicId(media.publicId());
        ebook.setBookFileFormat(media.format());
        ebook.setBookFileSize(media.sizeBytes());
    }

    private Language resolveLanguage(String languageCode) {
        if (languageCode == null || languageCode.isBlank()) {
            throw new IllegalArgumentException("Language is required.");
        }
        return languageRepository.findById(languageCode.trim())
                .filter(Language::isActive)
                .orElseThrow(() -> new IllegalArgumentException(
                        "The selected language does not exist or is inactive."));
    }

    private List<EbookCategory> resolveCategories(List<String> categoryKeys) {
        if (categoryKeys == null || categoryKeys.isEmpty()) {
            throw new IllegalArgumentException("At least one category is required.");
        }
        Set<String> uniqueKeys = new HashSet<>();
        for (String categoryKey : categoryKeys) {
            if (categoryKey == null || categoryKey.isBlank() || !uniqueKeys.add(categoryKey.trim())) {
                throw new IllegalArgumentException("Category mappings must be present and unique.");
            }
        }

        List<String> normalizedKeys = categoryKeys.stream().map(String::trim).toList();
        Map<String, EbookCategory> categoriesByKey = new LinkedHashMap<>();
        categoryRepository.findAllById(normalizedKeys).stream()
                .filter(EbookCategory::isActive)
                .forEach(category -> categoriesByKey.put(category.getCategoryKey(), category));
        if (categoriesByKey.size() != normalizedKeys.size()) {
            throw new IllegalArgumentException("One or more selected categories do not exist or are inactive.");
        }
        return normalizedKeys.stream().map(categoriesByKey::get).toList();
    }

    private List<Artist> resolveAuthors(List<Long> authorIds) {
        if (authorIds == null || authorIds.isEmpty()) {
            throw new IllegalArgumentException("At least one author is required.");
        }
        Set<Long> uniqueIds = new HashSet<>();
        for (Long authorId : authorIds) {
            if (authorId == null || authorId <= 0 || !uniqueIds.add(authorId)) {
                throw new IllegalArgumentException("Author mappings must contain unique valid IDs.");
            }
        }

        Map<Long, Artist> artistsById = new LinkedHashMap<>();
        artistRepository.findAllById(authorIds).forEach(artist -> artistsById.put(artist.getId(), artist));
        if (artistsById.size() != authorIds.size()) {
            throw new IllegalArgumentException("One or more selected authors do not exist.");
        }
        List<Artist> authors = new ArrayList<>(authorIds.size());
        for (Long authorId : authorIds) {
            authors.add(artistsById.get(authorId));
        }
        return authors;
    }

    private List<Ebook> loadInPageOrder(List<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<Long, Ebook> ebooksById = new LinkedHashMap<>();
        ebookRepository.findAllWithLanguageAndCategoriesByIdIn(ids)
                .forEach(ebook -> ebooksById.put(ebook.getId(), ebook));
        return ids.stream().map(ebooksById::get).filter(ebook -> ebook != null).toList();
    }

    private Ebook findEbook(Long id) {
        return ebookRepository.findWithLanguageAndCategoriesById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ebook record was not found."));
    }

    private Ebook findPublishedEbook(Long id) {
        Ebook ebook = findEbook(id);
        if (ebook.getStatus() != EbookStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Ebook record was not found.");
        }
        return ebook;
    }

    private EbookStatus parseStatus(String status) {
        try {
            return EbookStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Status must be DRAFT, PUBLISHED, or INACTIVE.");
        }
    }

    private EbookResponse toResponse(Ebook ebook, List<Artist> authors) {
        return new EbookResponse(
                ebook.getId(),
                ebook.getTitle(),
                ebook.getDescription(),
                toLanguage(ebook.getLanguage()),
                toCategories(ebook),
                toAuthors(authors),
                ebook.getOriginalCoverFilename(),
                ebook.getCoverImageUrl(),
                ebook.getCoverImagePublicId(),
                ebook.getCoverImageFormat(),
                ebook.getCoverImageSize(),
                ebook.getOriginalBookFilename(),
                ebook.getBookFileFormat(),
                ebook.getBookFileSize(),
                ebook.getPublishedDate(),
                ebook.getStatus(),
                ebook.getCreatedAt(),
                ebook.getUpdatedAt());
    }

    private EbookListItemResponse toListItem(Ebook ebook, List<Artist> authors) {
        return new EbookListItemResponse(
                ebook.getId(),
                ebook.getTitle(),
                ebook.getDescription(),
                ebook.getCoverImageUrl(),
                toCategories(ebook),
                toAuthors(authors),
                toLanguage(ebook.getLanguage()),
                ebook.getPublishedDate(),
                ebook.getStatus(),
                ebook.getCreatedAt(),
                ebook.getUpdatedAt());
    }

    private EbookListItemResponse toPublicListItem(Ebook ebook, List<Artist> authors) {
        List<EbookCategoryResponse> categories = ebook.getCategories().stream()
                .filter(EbookCategory::isActive)
                .sorted((first, second) -> first.getName().compareToIgnoreCase(second.getName()))
                .map(this::toCategory)
                .toList();
        return new EbookListItemResponse(
                ebook.getId(),
                ebook.getTitle(),
                ebook.getDescription(),
                ebook.getCoverImageUrl(),
                categories,
                toAuthors(authors),
                toLanguage(ebook.getLanguage()),
                ebook.getPublishedDate(),
                ebook.getStatus(),
                ebook.getCreatedAt(),
                ebook.getUpdatedAt());
    }

    private List<EbookCategoryResponse> toCategories(Ebook ebook) {
        return ebook.getCategories().stream()
                .sorted((first, second) -> first.getName().compareToIgnoreCase(second.getName()))
                .map(this::toCategory)
                .toList();
    }

    private EbookCategoryResponse toCategory(EbookCategory category) {
        return new EbookCategoryResponse(
                category.getCategoryKey(),
                category.getName(),
                category.getDescription(),
                category.isActive(),
                category.getCreatedAt(),
                category.getUpdatedAt());
    }

    private EbookLanguageResponse toLanguage(Language language) {
        return new EbookLanguageResponse(
                language.getCode(),
                language.getName(),
                language.getNativeName(),
                language.isActive());
    }

    private List<EbookAuthorResponse> toAuthors(List<Artist> authors) {
        if (authors == null) {
            return List.of();
        }
        List<EbookAuthorResponse> result = new ArrayList<>(authors.size());
        for (int position = 0; position < authors.size(); position++) {
            Artist artist = authors.get(position);
            result.add(new EbookAuthorResponse(
                    artist.getId(),
                    artist.getArtistKey(),
                    artist.getFullName(),
                    artist.getDisplayName(),
                    position));
        }
        return List.copyOf(result);
    }

    private String normalizeQuery(String query) {
        return query == null || query.isBlank() ? null : query.trim().toLowerCase(Locale.ROOT);
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
