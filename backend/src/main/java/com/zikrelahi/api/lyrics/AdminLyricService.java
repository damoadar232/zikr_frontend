package com.zikrelahi.api.lyrics;

import com.zikrelahi.api.books.BookService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zikrelahi.api.artists.Artist;
import com.zikrelahi.api.artists.ArtistRepository;
import com.zikrelahi.api.artists.ArtistRole;
import com.zikrelahi.api.admin.AdminUser;
import com.zikrelahi.api.common.ConflictException;
import com.zikrelahi.api.common.ContentStatus;
import com.zikrelahi.api.common.ResourceNotFoundException;
import com.zikrelahi.api.lyrics.LyricDtos.AdminLyricDto;
import com.zikrelahi.api.lyrics.LyricDtos.LanguageVersionRequest;
import com.zikrelahi.api.lyrics.LyricDtos.MediaReferenceRequest;
import com.zikrelahi.api.lyrics.LyricDtos.MetadataRequest;
import com.zikrelahi.api.lyrics.LyricDtos.PageSlice;
import com.zikrelahi.api.lyrics.LyricDtos.RevisionDto;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import static com.zikrelahi.api.lyrics.LyricDtos.*;

@Service
public class AdminLyricService {

    private final LyricRepository lyricRepository;
    private final LyricCategoryRepository categoryRepository;
    private final LyricSubjectRepository subjectRepository;
    private final LyricLanguageVersionRepository languageVersionRepository;
    private final LyricRevisionRepository revisionRepository;
    private final LyricPersistenceService persistenceService;
    private final LyricDtoAssembler assembler;
    private final NumericLyricReferenceResolver numericReferenceResolver;
    private final ArtistRepository artistRepository;
    private final BookService bookService;
    private final LyricArtistAssignmentRepository artistAssignmentRepository;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    public AdminLyricService(LyricRepository lyricRepository,
            LyricCategoryRepository categoryRepository,
            LyricSubjectRepository subjectRepository,
            LyricLanguageVersionRepository languageVersionRepository,
            LyricRevisionRepository revisionRepository,
            LyricPersistenceService persistenceService,
            LyricDtoAssembler assembler,
            NumericLyricReferenceResolver numericReferenceResolver,
            ArtistRepository artistRepository,
            BookService bookService,
            LyricArtistAssignmentRepository artistAssignmentRepository,
            ObjectMapper objectMapper,
            Validator validator) {
        this.lyricRepository = lyricRepository;
        this.categoryRepository = categoryRepository;
        this.subjectRepository = subjectRepository;
        this.languageVersionRepository = languageVersionRepository;
        this.revisionRepository = revisionRepository;
        this.persistenceService = persistenceService;
        this.assembler = assembler;
        this.numericReferenceResolver = numericReferenceResolver;
        this.artistRepository = artistRepository;
        this.bookService = bookService;
        this.artistAssignmentRepository = artistAssignmentRepository;
        this.objectMapper = objectMapper;
        this.validator = validator;
    }

    @Transactional(readOnly = true)
    public List<SubjectOptionDto> listSubjectOptions() {
        return subjectRepository.findAllOptions().stream()
                .map(subject -> new SubjectOptionDto(subject.getId(), subject.getName(), subject.getNumericId()))
                .toList();
    }

    @Transactional
    public AdminLyricDto createRequest(JsonNode body, AdminUser editor) {
        if (isCombinedRequest(body)) {
            return createCombined(validateRequest(readRequest(body, CombinedLyricRequest.class)), editor);
        }
        return create(validateRequest(readRequest(body, MetadataRequest.class)), editor);
    }

    @Transactional
    public AdminLyricDto updateRequest(String reference, JsonNode body, AdminUser editor) {
        if (isCombinedRequest(body)) {
            return updateCombined(reference,
                    validateRequest(readRequest(body, CombinedLyricRequest.class)), editor,
                    body.has("artistId"), body.has("writerId"), body.has("bookId"), body.has("featured"));
        }
        return updateMetadata(reference, validateRequest(readRequest(body, MetadataRequest.class)), editor);
    }

    private AdminLyricDto createCombined(CombinedLyricRequest request, AdminUser editor) {
        PreparedCombinedRequest prepared = prepareCombinedRequest(request);
        if (prepared.translations() != null && prepared.translations().stream()
                .anyMatch(translation -> translation.expectedRowVersion() != null)) {
            throw new ConflictException("A new language version cannot have an expected row version.");
        }
        String slug = StringUtils.hasText(request.slug())
                ? normalizeSlug(request.slug())
                : slugify(request.title());
        if (!StringUtils.hasText(slug)) {
            throw new IllegalArgumentException("Provide a slug or a title that can be converted to one.");
        }
        requireAvailableSlug(slug, null);

        Lyric lyric = Lyric.builder()
                .legacyId(slug)
                .title(request.title().trim())
                .slug(slug)
                .status(ContentStatus.DRAFT)
                .createdBy(editor)
                .updatedBy(editor)
                .build();
        applyCombinedMetadata(lyric, prepared, true);
        lyricRepository.saveAndFlush(lyric);
        synchronizeCombinedArtistAssignments(lyric, prepared, true, true);
        saveCombinedTranslations(lyric, prepared, editor);
        return assembler.toAdmin(lyricRepository.findById(lyric.getId()).orElseThrow());
    }

    private AdminLyricDto updateCombined(
            String reference,
            CombinedLyricRequest request,
            AdminUser editor,
            boolean artistIdSupplied,
            boolean writerIdSupplied,
            boolean bookIdSupplied,
            boolean featuredSupplied) {
        Lyric lyric = findAdmin(reference);
        PreparedCombinedRequest prepared = prepareCombinedRequest(request);
        String updatedSlug = StringUtils.hasText(request.slug()) ? normalizeSlug(request.slug()) : null;
        if (updatedSlug != null) {
            requireAvailableSlug(updatedSlug, lyric.getId());
        }

        validateTranslationVersions(lyric.getId(), prepared);
        saveCombinedTranslations(lyric, prepared, editor);
        lyric.setTitle(request.title().trim());
        if (updatedSlug != null) {
            lyric.setSlug(updatedSlug);
        }
        lyric.setUpdatedBy(editor);
        applyCombinedMetadata(lyric, prepared, false, artistIdSupplied,
                writerIdSupplied, bookIdSupplied, featuredSupplied);
        lyricRepository.saveAndFlush(lyric);
        synchronizeCombinedArtistAssignments(lyric, prepared, false, writerIdSupplied);
        return assembler.toAdmin(lyricRepository.findById(lyric.getId()).orElseThrow());
    }

    @Transactional
    public AdminLyricDto create(MetadataRequest request, AdminUser editor) {
        String slug = StringUtils.hasText(request.slug()) ? normalizeSlug(request.slug()) : slugify(request.title());
        String legacyId = StringUtils.hasText(request.legacyId()) ? request.legacyId().trim() : slug;
        if (!StringUtils.hasText(slug) || !StringUtils.hasText(legacyId)) {
            throw new IllegalArgumentException("Provide a URL slug or a title that can be converted to one.");
        }
        Lyric lyric = Lyric.builder()
                .legacyId(legacyId)
                .title(request.title().trim())
                .slug(slug)
                .status(ContentStatus.DRAFT)
                .createdBy(editor)
                .updatedBy(editor)
                .build();
        applyMetadata(lyric, request);
        lyricRepository.saveAndFlush(lyric);
        synchronizeLegacyArtistAssignments(lyric, request);
        return assembler.toAdmin(lyricRepository.findById(lyric.getId()).orElseThrow());
    }

    @Transactional(readOnly = true)
    public PageSlice<AdminLyricDto> list(int page, int size, String status, String query) {
        PublicLyricService.requirePageBounds(page, size);
        ContentStatus parsedStatus = parseStatus(status);
        Page<Lyric> results = lyricRepository.findAdminPage(parsedStatus,
                StringUtils.hasText(query) ? query.trim().toLowerCase(Locale.ROOT) : null,
                PageRequest.of(page, size));
        return new PageSlice<>(assembler.toAdmin(results.getContent()), results.getNumber(),
                results.getSize(), results.getTotalElements(), results.getTotalPages());
    }

    @Transactional(readOnly = true)
    public AdminLyricDto get(String reference) {
        return assembler.toAdmin(findAdmin(reference));
    }

    @Transactional
    public AdminLyricDto updateMetadata(String reference, MetadataRequest request, AdminUser editor) {
        Lyric lyric = findAdmin(reference);
        lyric.setTitle(request.title().trim());
        if (StringUtils.hasText(request.slug()))
            lyric.setSlug(normalizeSlug(request.slug()));
        lyric.setUpdatedBy(editor);
        applyMetadata(lyric, request);
        lyricRepository.saveAndFlush(lyric);
        synchronizeLegacyArtistAssignments(lyric, request);
        return assembler.toAdmin(lyricRepository.findById(lyric.getId()).orElseThrow());
    }

    private PreparedCombinedRequest prepareCombinedRequest(CombinedLyricRequest request) {
        NumericLyricReferenceResolver.ResolvedReferences references = numericReferenceResolver.resolve(request);
        List<PreparedTranslation> translations = request.translations() == null
                ? null
                : request.translations().stream()
                        .map(translation -> new PreparedTranslation(
                                translation.languageCode(),
                                HtmlTranslationSanitizer.validate(translation.content()),
                                translation.expectedRowVersion()))
                        .toList();
        List<LyricMediaReference> media = request.mediaReferences() == null
                ? null
                : resolveMedia(request.mediaReferences());
        return new PreparedCombinedRequest(request, references, translations, media);
    }

    private void applyCombinedMetadata(
            Lyric lyric,
            PreparedCombinedRequest prepared,
            boolean create) {
        applyCombinedMetadata(lyric, prepared, create, true, true, true, true);
    }

    private void applyCombinedMetadata(
            Lyric lyric,
            PreparedCombinedRequest prepared,
            boolean create,
            boolean artistIdSupplied,
            boolean writerIdSupplied,
            boolean bookIdSupplied,
            boolean featuredSupplied) {
        CombinedLyricRequest request = prepared.request();
        NumericLyricReferenceResolver.ResolvedReferences references = prepared.references();

        if (create || artistIdSupplied) {
            Long primaryArtistId = references.primaryArtistId();
            if (create && primaryArtistId == null && references.reciterIds() != null
                    && !references.reciterIds().isEmpty()) {
                primaryArtistId = references.reciterIds().getFirst();
            }
            lyric.setArtistId(primaryArtistId);
            lyric.setLegacyArtistId(null);
        }
        if (create || writerIdSupplied) {
            lyric.setWriterId(references.writerId());
            lyric.setLegacyWriterId(null);
            lyric.setWriterName(references.writerId() == null ? null : artistDisplayName(references.writerId()));
        }
        if (create || request.categoryIds() != null) {
            lyric.setCategories(resolveCategories(references.categoryKeys()));
        }
        if (create || request.subjectIds() != null) {
            lyric.setSubjects(resolveSubjects(references.subjectKeys()));
        }
        if (create || request.tags() != null) {
            lyric.setTags(new LinkedHashSet<>(cleanStrings(request.tags())));
        }
        if (create || bookIdSupplied) {
            String bookId = clean(request.bookId());
            bookService.validateReference(bookId);
            lyric.setBookId(bookId);
        }
        if (create || featuredSupplied) {
            lyric.setFeatured(Boolean.TRUE.equals(request.featured()));
        }
        if (create || prepared.mediaReferences() != null) {
            lyric.setMediaReferences(prepared.mediaReferences() == null
                    ? new ArrayList<>()
                    : prepared.mediaReferences());
        }
    }

    private void saveCombinedTranslations(Lyric lyric, PreparedCombinedRequest prepared, AdminUser editor) {
        if (prepared.translations() == null || prepared.translations().isEmpty()) {
            return;
        }
        for (PreparedTranslation translation : prepared.translations()) {
            LyricLanguageVersion existing = languageVersionRepository
                    .findByLyric_IdAndLanguageCode(lyric.getId(), translation.languageCode()).orElse(null);
            Long expectedRowVersion = existing == null ? null : existing.getRowVersion();
            persistenceService.saveHtmlLanguageVersion(
                    lyric.getId(),
                    translation.languageCode(),
                    translation.content().html(),
                    ContentStatus.DRAFT,
                    editor,
                    null,
                    expectedRowVersion);
        }
    }

    private void validateTranslationVersions(Long lyricId, PreparedCombinedRequest prepared) {
        if (prepared.translations() == null) {
            return;
        }
        for (PreparedTranslation translation : prepared.translations()) {
            Long expected = translation.expectedRowVersion();
            if (expected == null) {
                continue;
            }
            LyricLanguageVersion existing = languageVersionRepository
                    .findByLyric_IdAndLanguageCode(lyricId, translation.languageCode()).orElse(null);
            if (existing == null || !expected.equals(existing.getRowVersion())) {
                throw new ConflictException(
                        "This language version changed after it was loaded. Reload before saving.");
            }
        }
    }

    private String artistDisplayName(Long artistId) {
        Artist artist = artistRepository.findById(artistId)
                .orElseThrow(() -> new EntityNotFoundException("Mapped artist no longer exists."));
        return StringUtils.hasText(artist.getDisplayName()) ? artist.getDisplayName() : artist.getFullName();
    }

    private void synchronizeCombinedArtistAssignments(
            Lyric lyric,
            PreparedCombinedRequest prepared,
            boolean create,
            boolean writerIdSupplied) {
        CombinedLyricRequest request = prepared.request();
        NumericLyricReferenceResolver.ResolvedReferences references = prepared.references();
        if (create || writerIdSupplied) {
            artistAssignmentRepository.replaceWriters(
                    lyric.getId(),
                    references.writerId() == null ? List.of() : List.of(references.writerId()));
        }
        if (create || request.reciterIds() != null) {
            artistAssignmentRepository.replaceReciters(
                    lyric.getId(),
                    references.reciterIds() == null ? List.of() : references.reciterIds());
        }
    }

    private void synchronizeLegacyArtistAssignments(Lyric lyric, MetadataRequest request) {
        Set<Long> writerIds = new LinkedHashSet<>();
        Set<Long> reciterIds = new LinkedHashSet<>();
        List<String> legacyArtistKeys = new ArrayList<>();

        List<String> genericArtistReferences = new ArrayList<>();
        if (StringUtils.hasText(request.artistId())) {
            genericArtistReferences.add(request.artistId().trim());
        }
        genericArtistReferences.addAll(cleanStrings(request.artistIds()));
        for (String reference : new LinkedHashSet<>(genericArtistReferences)) {
            Artist artist = findUnambiguousArtist(reference);
            if (artist == null) {
                legacyArtistKeys.add(reference);
                continue;
            }
            boolean assigned = false;
            if (hasWriterRole(artist)) {
                writerIds.add(artist.getId());
                assigned = true;
            }
            if (hasReciterRole(artist)) {
                reciterIds.add(artist.getId());
                assigned = true;
            }
            if (!assigned) {
                legacyArtistKeys.add(artist.getArtistKey());
            }
        }

        if (StringUtils.hasText(request.writerId())) {
            Artist writer = findUnambiguousArtist(request.writerId().trim());
            if (writer != null) {
                if (!hasWriterRole(writer)) {
                    throw new IllegalArgumentException(
                            "The selected artist does not have a writer-compatible role.");
                }
                writerIds.add(writer.getId());
            }
        }

        List<LyricArtistAssignmentRepository.PositionedArtist> resolvedReciters = new ArrayList<>();
        List<LyricArtistAssignmentRepository.PositionedName> unresolvedReciters = new ArrayList<>();
        List<String> reciters = cleanStrings(request.reciters());
        for (int position = 0; position < reciters.size(); position++) {
            String reference = reciters.get(position);
            Artist reciter = findUnambiguousArtist(reference);
            if (reciter != null && !hasReciterRole(reciter)) {
                throw new IllegalArgumentException(
                        "The selected artist does not have a reciter-compatible role.");
            }
            if (reciter != null) {
                resolvedReciters.add(new LyricArtistAssignmentRepository.PositionedArtist(
                        reciter.getId(), position));
            } else {
                unresolvedReciters.add(new LyricArtistAssignmentRepository.PositionedName(
                        reference, position));
            }
        }

        artistAssignmentRepository.replaceWriters(lyric.getId(), List.copyOf(writerIds));
        artistAssignmentRepository.replaceRecitersWithPositions(lyric.getId(), resolvedReciters);
        artistAssignmentRepository.replaceLegacyArtistIds(lyric.getId(), legacyArtistKeys);
        artistAssignmentRepository.replaceLegacyReciters(lyric.getId(), unresolvedReciters);
    }

    private Artist findUnambiguousArtist(String reference) {
        Artist byId = findArtistByNumericId(reference);
        if (byId != null) {
            return byId;
        }
        if (reference.matches("[0-9]+")) {
            throw new ResourceNotFoundException("Unknown artist ID: " + reference + ".");
        }
        List<Artist> matches = artistRepository.findByReference(reference);
        return matches.size() == 1 ? matches.get(0) : null;
    }

    private Artist findArtistByNumericId(String reference) {
        if (!StringUtils.hasText(reference)) {
            return null;
        }
        try {
            return artistRepository.findById(Long.parseLong(reference)).orElse(null);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private boolean hasWriterRole(Artist artist) {
        return artist.getRoles().stream().anyMatch(role -> Set.of(
                ArtistRole.WRITER, ArtistRole.LYRICIST, ArtistRole.POET).contains(role));
    }

    private boolean hasReciterRole(Artist artist) {
        return artist.getRoles().stream().anyMatch(role -> Set.of(
                ArtistRole.RECITER, ArtistRole.NAAT_KHWAN).contains(role));
    }

    private void requireAvailableSlug(String slug, Long currentLyricId) {
        lyricRepository.findBySlug(slug).filter(existing -> !existing.getId().equals(currentLyricId))
                .ifPresent(existing -> {
                    throw new ConflictException("A lyric with slug '" + slug + "' already exists.");
                });
        lyricRepository.findByLegacyId(slug).filter(existing -> !existing.getId().equals(currentLyricId))
                .ifPresent(existing -> {
                    throw new ConflictException("A lyric with identifier '" + slug + "' already exists.");
                });
    }

    private <T> T readRequest(JsonNode body, Class<T> requestType) {
        if (body == null || !body.isObject()) {
            throw new IllegalArgumentException("The request body must be a JSON object.");
        }
        try {
            return objectMapper.treeToValue(body, requestType);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("The request body contains invalid fields or values.", ex);
        }
    }

    private <T> T validateRequest(T request) {
        Set<ConstraintViolation<T>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }
        return request;
    }

    private static boolean isCombinedRequest(JsonNode body) {
        if (body == null || !body.isObject()) {
            return false;
        }
        if (body.has("translations") || body.has("reciterIds")) {
            return true;
        }
        if (hasStringArray(body.get("categoryIds")) || hasStringArray(body.get("subjectIds"))) {
            return false;
        }
        JsonNode writerId = body.get("writerId");
        if (writerId != null && writerId.isNumber()) {
            return true;
        }
        if (writerId != null && writerId.isTextual()) {
            return false;
        }
        if (hasNumericArray(body.get("categoryIds")) || hasNumericArray(body.get("subjectIds"))) {
            return true;
        }
        return !body.has("legacyId")
                && !body.has("artistId")
                && !body.has("artistIds")
                && !body.has("reciters")
                && !body.has("writerName")
                && !body.has("coverImageUrl");
    }

    private static boolean hasNumericArray(JsonNode value) {
        return value != null && value.isArray()
                && value.elements().hasNext() && value.elements().next().isNumber();
    }

    private static boolean hasStringArray(JsonNode value) {
        return value != null && value.isArray()
                && value.elements().hasNext() && value.elements().next().isTextual();
    }

    @Transactional
    public AdminLyricDto saveLanguage(String reference, String languageCode,
            LanguageVersionRequest request, AdminUser editor) {
        Lyric lyric = findAdmin(reference);
        LyricLanguageCode language = LyricLanguageCode.fromApiCode(languageCode);
        TiptapDocumentValidator.ValidatedDocument validated = TiptapDocumentValidator.validate(request.document());
        LyricLanguageVersion currentVersion = languageVersionRepository
                .findByLyric_IdAndLanguageCode(lyric.getId(), language).orElse(null);
        if (currentVersion == null && request.expectedRowVersion() != null) {
            throw new ConflictException("This language version changed after it was loaded. Reload before saving.");
        }
        if (currentVersion != null && (request.expectedRowVersion() == null
                || !request.expectedRowVersion().equals(currentVersion.getRowVersion()))) {
            throw new ConflictException("This language version changed after it was loaded. Reload before saving.");
        }
        persistenceService.saveLanguageVersion(lyric.getId(), language, validated.document(),
                validated.plainText(), ContentStatus.DRAFT, editor, request.changeNote());
        return assembler.toAdmin(lyricRepository.findById(lyric.getId()).orElseThrow());
    }

    @Transactional
    public AdminLyricDto setLyricStatus(String reference, ContentStatus status, AdminUser editor) {
        Lyric lyric = findAdmin(reference);
        if (status == ContentStatus.PUBLISHED && !hasValidLanguageVersion(lyric.getId())) {
            throw new ConflictException("Save at least one valid language version before publishing a lyric.");
        }
        lyric.setStatus(status);
        lyric.setUpdatedBy(editor);
        return assembler.toAdmin(lyricRepository.saveAndFlush(lyric));
    }

    @Transactional(readOnly = true)
    public List<RevisionDto> revisions(String reference, String languageCode) {
        Lyric lyric = findAdmin(reference);
        LyricLanguageCode language = LyricLanguageCode.fromApiCode(languageCode);
        LyricLanguageVersion version = languageVersionRepository
                .findByLyric_IdAndLanguageCode(lyric.getId(), language)
                .orElseThrow(() -> new ResourceNotFoundException("Language version not found."));
        return revisionRepository.findAllByLanguageVersion_IdOrderByRevisionNumberDesc(version.getId())
                .stream().map(assembler::toRevision).toList();
    }

    @Transactional
    public void delete(String reference) {
        Lyric lyric = findAdmin(reference);
        if (languageVersionRepository.existsByLyric_Id(lyric.getId())) {
            throw new ConflictException(
                    "Lyrics with language versions or revision history cannot be deleted. Unpublish the lyric instead.");
        }
        artistAssignmentRepository.deleteForLyric(lyric.getId());
        lyricRepository.delete(lyric);
    }

    private Lyric findAdmin(String reference) {
        if (!StringUtils.hasText(reference))
            throw new ResourceNotFoundException("Lyric not found.");
        return lyricRepository.findByLegacyId(reference)
                .or(() -> lyricRepository.findBySlug(reference))
                .or(() -> findByNumericId(reference))
                .orElseThrow(() -> new ResourceNotFoundException("Lyric not found."));
    }

    private java.util.Optional<Lyric> findByNumericId(String reference) {
        try {
            return lyricRepository.findById(Long.parseLong(reference));
        } catch (NumberFormatException ignored) {
            return java.util.Optional.empty();
        }
    }

    private void applyMetadata(Lyric lyric, MetadataRequest request) {
        String artistId = clean(request.artistId());
        Artist artist = artistId == null ? null : findUnambiguousArtist(artistId);
        lyric.setArtistId(artist == null ? null : artist.getId());
        lyric.setLegacyArtistId(artist == null ? artistId : null);
        String writerId = clean(request.writerId());
        Artist writer = writerId == null ? null : findUnambiguousArtist(writerId);
        if (writer != null && !hasWriterRole(writer)) {
            throw new IllegalArgumentException("The selected artist does not have a writer-compatible role.");
        }
        lyric.setWriterId(writer == null ? null : writer.getId());
        lyric.setLegacyWriterId(writer == null ? writerId : null);
        String writerName = clean(request.writerName());
        lyric.setWriterName(writerName != null ? writerName
                : writer == null ? null : artistDisplayName(writer.getId()));
        String bookId = clean(request.bookId());
        bookService.validateReference(bookId);
        lyric.setBookId(bookId);
        lyric.setCoverImageUrl(clean(request.coverImageUrl()));
        lyric.setFeatured(Boolean.TRUE.equals(request.featured()));
        lyric.setTags(new LinkedHashSet<>(cleanStrings(request.tags())));
        lyric.setCategories(resolveCategories(request.categoryIds()));
        lyric.setSubjects(resolveSubjects(request.subjectIds()));
        lyric.setMediaReferences(resolveMedia(request.mediaReferences()));
    }

    private Set<LyricCategory> resolveCategories(List<String> ids) {
        if (ids == null || ids.isEmpty())
            return new LinkedHashSet<>();
        List<LyricCategory> categories = categoryRepository.findAllById(ids);
        if (categories.size() != new LinkedHashSet<>(ids).size()) {
            throw new IllegalArgumentException("One or more category IDs are unknown.");
        }
        return new LinkedHashSet<>(categories);
    }

    private boolean hasValidLanguageVersion(Long lyricId) {
        return languageVersionRepository.findAllByLyric_IdOrderByLanguageCode(lyricId).stream()
                .anyMatch(version -> {
                    try {
                        String plainText = version.getContentFormat() == LyricContentFormat.HTML
                                ? HtmlTranslationSanitizer.validatePersisted(version.getHtmlContent()).plainText()
                                : TiptapDocumentValidator.validatePersisted(version.getDocument()).plainText();
                        return StringUtils.hasText(plainText);
                    } catch (InvalidLyricHtmlException | InvalidTiptapDocumentException exception) {
                        return false;
                    }
                });
    }

    private Set<LyricSubject> resolveSubjects(List<String> ids) {
        if (ids == null || ids.isEmpty())
            return new LinkedHashSet<>();
        List<LyricSubject> subjects = subjectRepository.findAllById(ids);
        if (subjects.size() != new LinkedHashSet<>(ids).size()) {
            throw new IllegalArgumentException("One or more subject IDs are unknown.");
        }
        return new LinkedHashSet<>(subjects);
    }

    private List<LyricMediaReference> resolveMedia(List<MediaReferenceRequest> references) {
        if (references == null)
            return new ArrayList<>();
        return references.stream().map(reference -> {
            if (!"https".equalsIgnoreCase(URI.create(reference.url()).getScheme())) {
                throw new IllegalArgumentException("Related media URLs must use HTTPS.");
            }
            return LyricMediaReference.builder().mediaType(reference.mediaType())
                    .title(reference.title().trim()).url(reference.url().trim()).build();
        }).toList();
    }

    private static ContentStatus parseStatus(String status) {
        if (!StringUtils.hasText(status))
            return null;
        try {
            return ContentStatus.valueOf(status);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("status must be DRAFT or PUBLISHED.");
        }
    }

    private static List<String> cleanStrings(List<String> values) {
        if (values == null)
            return new ArrayList<>();
        return values.stream().map(String::trim).filter(StringUtils::hasText).distinct().toList();
    }

    private static String clean(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static String slugify(String value) {
        return normalizeSlug(Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", ""));
    }

    private static String normalizeSlug(String value) {
        String slug = value.trim().toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9-]+", "-").replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "");
        if (slug.isEmpty())
            throw new IllegalArgumentException("slug must contain at least one letter or digit.");
        return slug;
    }

    private record PreparedCombinedRequest(
            CombinedLyricRequest request,
            NumericLyricReferenceResolver.ResolvedReferences references,
            List<PreparedTranslation> translations,
            List<LyricMediaReference> mediaReferences) {
    }

    private record PreparedTranslation(
            LyricLanguageCode languageCode,
            HtmlTranslationSanitizer.ValidatedHtml content,
            Long expectedRowVersion) {
    }
}