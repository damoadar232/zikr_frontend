package com.zikrelahi.api.audio;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

public final class AudioDtos {

    private AudioDtos() {
    }

    public record AudioRequest(
            @NotBlank(message = "Title is required.")
            @Size(max = 250, message = "Title must not exceed 250 characters.")
            String title,
            String description,
            @NotBlank(message = "Language is required.")
            @Size(max = 20)
            String languageCode,
            @NotEmpty(message = "At least one category is required.")
            List<@NotBlank String> categoryKeys,
            List<Long> singerIds,
            List<Long> writerIds,
            List<@NotNull @Valid ArtistAssignmentRequest> artists,
            LocalDate publishedDate,
            String status) {

        public AudioRequest(
                String title,
                String description,
                String languageCode,
                List<String> categoryKeys,
                List<Long> singerIds,
                List<Long> writerIds,
                LocalDate publishedDate,
                String status) {
            this(title, description, languageCode, categoryKeys, singerIds, writerIds, null, publishedDate, status);
        }

        public List<Long> singerArtistIds() {
            return artistIdsForRole("SINGER", singerIds);
        }

        public List<Long> writerArtistIds() {
            return artistIdsForRole("WRITER", writerIds);
        }

        private List<Long> artistIdsForRole(String role, List<Long> legacyIds) {
            if (artists == null) {
                return legacyIds;
            }
            return artists.stream()
                    .filter(assignment -> assignment.role().equals(role))
                    .sorted(Comparator.comparing(ArtistAssignmentRequest::position))
                    .map(ArtistAssignmentRequest::artistId)
                    .toList();
        }
    }

    public record ArtistAssignmentRequest(
            @NotNull @Min(1) Long artistId,
            @NotBlank @Pattern(regexp = "SINGER|WRITER") String role,
            @NotNull @Min(0) Integer position) {
    }

    public record StatusRequest(@NotBlank(message = "Status is required.") String status) {
    }

    public record CategoryRequest(
            @NotBlank(message = "Category key is required.")
            @Size(max = 80)
            String categoryKey,
            @NotBlank(message = "Category name is required.")
            @Size(max = 120)
            String name,
            String description,
            Boolean active) {
    }

    public record CategoryUpdateRequest(
            @NotBlank(message = "Category name is required.")
            @Size(max = 120)
            String name,
            String description,
            Boolean active) {
    }

    public record CategoryDto(
            String categoryKey,
            String name,
            String description,
            boolean active,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
    }

    public record LanguageDto(
            String code,
            String name,
            String nativeName,
            boolean active) {
    }

    public record ArtistCreditDto(
            Long id,
            String artistKey,
            String fullName,
            String displayName,
            int position) {
    }

    public record AudioArtistCredits(
            List<ArtistCreditDto> singers,
            List<ArtistCreditDto> writers) {
    }

    public record AudioDetailsDto(
            Long id,
            String title,
            String description,
            LanguageDto language,
            List<CategoryDto> categories,
            List<ArtistCreditDto> singers,
            List<ArtistCreditDto> writers,
            String originalAudioFilename,
            String audioUrl,
            String audioPublicId,
            String audioFormat,
            Long audioSize,
            Integer audioDurationSeconds,
            String originalCoverFilename,
            String coverImageUrl,
            String coverImagePublicId,
            String coverImageFormat,
            LocalDate publishedDate,
            AudioStatus status,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
    }

    public record PageSlice<T>(
            List<T> items,
            int page,
            int size,
            long totalElements,
            int totalPages) {
    }
}
