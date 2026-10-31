package com.zikrelahi.api.audio;

import java.time.LocalDate;
import java.util.List;

public final class PublicAudioDtos {

    private PublicAudioDtos() {
    }

    public record LanguageDto(String code, String name, String nativeName) {
    }

    public record CategoryDto(String categoryKey, String name, String description) {
    }

    public record ArtistDto(Long id, String artistKey, String fullName, String displayName, int position) {
    }

    public record AudioDto(
            Long id,
            String title,
            String description,
            LanguageDto language,
            String audioUrl,
            Integer audioDurationSeconds,
            String coverImageUrl,
            List<CategoryDto> categories,
            List<ArtistDto> singers,
            List<ArtistDto> writers,
            LocalDate publishedDate) {
    }

    public record PageSlice<T>(
            List<T> items,
            int page,
            int size,
            long totalElements,
            int totalPages) {
    }
}
