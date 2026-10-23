package com.zikrelahi.api.artists;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public final class ArtistDtos {

    public record CreateArtistRequest(
            @NotBlank(message = "Full name is required.")
            @Size(max = 200, message = "Full name must not exceed 200 characters.")
            String fullName,
            @Size(max = 200, message = "Display name must not exceed 200 characters.")
            String displayName,
            @NotEmpty(message = "At least one role is required.")
            List<@NotBlank String> roles,
            String biography,
            String status) {}

    public record UpdateArtistRequest(
            @NotBlank(message = "Full name is required.")
            @Size(max = 200) String fullName,
            @Size(max = 200) String displayName,
            @NotEmpty(message = "At least one role is required.")
            List<@NotBlank String> roles,
            String biography,
            String status) {}

    public record StatusRequest(@NotBlank(message = "Status is required.") String status) {}

    public record AdminArtistDto(
            Long id,
            String artistKey,
            Long numericId,
            String fullName,
            String displayName,
            List<String> roles,
            String biography,
            String status,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {}

    public record ArtistOptionDto(
            Long id,
            String artistKey,
            String fullName,
            String displayName,
            List<String> roles,
            String status) {}

    public record RoleDto(String code, String label) {}

    public record PageSlice<T>(List<T> items, int page, int size, long totalElements, int totalPages) {}
}