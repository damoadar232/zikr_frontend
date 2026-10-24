package com.zikrelahi.api.lyrics;

import com.fasterxml.jackson.databind.JsonNode;
import com.zikrelahi.api.common.ContentStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.AssertTrue;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class LyricDtos {

    private LyricDtos() {
    }

    public record MetadataRequest(
            @Size(max = 120) String legacyId,
            @NotBlank @Size(max = 250) String title,
            @Size(max = 180) String slug,
            @Size(max = 120) String artistId,
            @Size(max = 120) String writerId,
            @Size(max = 200) String writerName,
            @Size(max = 120) String bookId,
            @Size(max = 2048) String coverImageUrl,
            Boolean featured,
            @Size(max = 20) List<@NotBlank @Size(max = 120) String> artistIds,
            @Size(max = 30) List<@NotBlank @Size(max = 200) String> reciters,
            @Size(max = 30) List<@NotBlank @Size(max = 80) String> categoryIds,
            @Size(max = 30) List<@NotBlank @Size(max = 80) String> subjectIds,
            @Size(max = 50) List<@NotBlank @Size(max = 120) String> tags,
            @Size(max = 40) List<@Valid MediaReferenceRequest> mediaReferences) {
    }

    public record MediaReferenceRequest(
            @NotNull LyricMediaType mediaType,
            @NotBlank @Size(max = 255) String title,
            @NotBlank @Size(max = 2048) String url) {
    }

    public record LanguageVersionRequest(
            @NotNull JsonNode document,
            @Size(max = 500) String changeNote,
            @jakarta.validation.constraints.PositiveOrZero Long expectedRowVersion) {
    }

    public record CombinedLyricRequest(
            @NotBlank @Size(max = 250) String title,
            @Size(max = 180) String slug,
            @Positive Long writerId,
            @Size(max = 30) List<@NotNull @Positive Long> reciterIds,
            @Size(max = 30) List<@NotNull @Positive Long> categoryIds,
            @Size(max = 30) List<@NotNull @Positive Long> subjectIds,
            @Size(max = 50) List<@NotBlank @Size(max = 120) String> tags,
            @Size(max = 120) String bookId,
            Boolean featured,
            @Size(max = 40) List<@Valid MediaReferenceRequest> mediaReferences,
            @Size(max = 3) List<@NotNull @Valid HtmlTranslationRequest> translations,
            @Positive Long artistId) {

        @AssertTrue(message = "Numeric reference IDs must not contain duplicates.")
        public boolean isReferenceIdsUnique() {
            return unique(reciterIds) && unique(categoryIds) && unique(subjectIds);
        }

        @AssertTrue(message = "Translation language codes must not contain duplicates.")
        public boolean isTranslationLanguagesUnique() {
            if (translations == null) {
                return true;
            }
            Set<LyricLanguageCode> languages = new HashSet<>();
            return translations.stream().allMatch(translation -> translation == null
                    || languages.add(translation.languageCode()));
        }

        private static boolean unique(List<Long> ids) {
            return ids == null || ids.stream().allMatch(new HashSet<>()::add);
        }
    }

    public record HtmlTranslationRequest(
            @NotNull LyricLanguageCode languageCode,
            @NotBlank @Size(max = 262_144) String content,
            @NotNull HtmlTranslationFormat contentFormat,
            @jakarta.validation.constraints.PositiveOrZero Long expectedRowVersion) {
    }

    public enum HtmlTranslationFormat {
        HTML
    }

    public record StatusRequest(@NotNull ContentStatus status) {
    }

    public record PublicLyricDto(
            String id,
            String title,
            String slug,
            Long artistId,
            List<Long> artistIds,
            List<String> reciters,
            Long writerId,
            String writer,
            List<String> categoryIds,
            List<String> subjectIds,
            List<String> tags,
            String bookId,
            String image,
            boolean featured,
            LocalDateTime createdAt,
            List<PublicLanguageVersionDto> languageVersions,
            List<MediaReferenceDto> relatedAudio,
            List<MediaReferenceDto> relatedVideos) {
    }

    public record PublicLanguageVersionDto(
            LyricLanguageCode code,
            String label,
            String script,
            String dir,
            JsonNode document,
            LyricContentFormat contentFormat,
            String content,
            String text) {
    }

    public record AdminLyricDto(
            Long id,
            String legacyId,
            String title,
            String slug,
            Long artistId,
            List<Long> artistIds,
            List<String> reciters,
            Long writerId,
            String writer,
            List<String> categoryIds,
            List<String> subjectIds,
            List<String> tags,
            String bookId,
            String coverImageUrl,
            boolean featured,
            ContentStatus status,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            List<AdminLanguageVersionDto> languageVersions,
            List<MediaReferenceDto> mediaReferences) {
    }

    public record AdminLanguageVersionDto(
            Long id,
            LyricLanguageCode languageCode,
            JsonNode document,
            LyricContentFormat contentFormat,
            String content,
            String plainText,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            Long rowVersion) {
    }

    public record RevisionDto(
            Long id,
            int revisionNumber,
            LyricLanguageCode languageCode,
            String lyricTitle,
            String lyricSlug,
            JsonNode document,
            LyricContentFormat contentFormat,
            String content,
            String plainText,
            ContentStatus status,
            LocalDateTime versionUpdatedAt,
            LocalDateTime createdAt,
            String editorDisplayName,
            String changeNote) {
    }

    public record MediaReferenceDto(String mediaType, String title, String url) {
    }

    public record SubjectOptionDto(String id, String name, Long numericId) {
    }

    public record PublicSubjectDto(String id, String name) {
    }

    public record PageSlice<T>(List<T> items, int page, int size, long totalElements, int totalPages) {
    }
}