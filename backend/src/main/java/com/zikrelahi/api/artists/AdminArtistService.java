package com.zikrelahi.api.artists;

import com.zikrelahi.api.common.ConflictException;
import com.zikrelahi.api.common.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminArtistService {

    private final ArtistRepository artistRepository;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public ArtistDtos.AdminArtistDto create(ArtistDtos.CreateArtistRequest request) {
        String id = slugify(request.fullName());
        if (id.isEmpty()) {
            throw new IllegalArgumentException("Full name must contain at least one letter or number to create a slug ID.");
        }
        if (id.length() > 120) {
            throw new IllegalArgumentException("The generated artist ID must not exceed 120 characters.");
        }
        if (artistRepository.existsByArtistKey(id)) {
            throw new ConflictException("An artist with ID '" + id + "' already exists. Use a different name.");
        }
        Set<ArtistRole> roles = parseRoles(request.roles());
        ArtistStatus status = request.status() != null ? parseStatus(request.status()) : ArtistStatus.ACTIVE;
        Artist artist = Artist.builder()
                .artistKey(id)
                .fullName(request.fullName().trim())
                .displayName(request.displayName() != null ? request.displayName().trim() : null)
                .biography(request.biography() != null ? request.biography().trim() : null)
                .roles(roles)
                .status(status)
                .build();
        Artist saved = artistRepository.saveAndFlush(artist);
        jdbcTemplate.update("INSERT INTO artist_numeric_mappings (id, artist_key) VALUES (?, ?)",
                saved.getId(), saved.getArtistKey());
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public ArtistDtos.PageSlice<ArtistDtos.AdminArtistDto> list(int page, int size, String status, String role, String query) {
        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("page must be >= 0 and size must be between 1 and 100.");
        }
        ArtistStatus statusFilter = status != null && !status.isBlank() ? parseStatus(status) : null;
        ArtistRole roleFilter = role != null && !role.isBlank() ? parseRole(role) : null;
        String queryFilter = query != null && !query.isBlank() ? query.trim() : null;
        Page<Artist> results = artistRepository.searchArtists(
                statusFilter, roleFilter, queryFilter, PageRequest.of(page, size));
        return new ArtistDtos.PageSlice<>(
                results.getContent().stream().map(this::toDto).toList(),
                results.getNumber(), results.getSize(),
                results.getTotalElements(), results.getTotalPages());
    }

    @Transactional(readOnly = true)
    public ArtistDtos.AdminArtistDto get(String id) {
        return toDto(findOrThrow(id));
    }

    @Transactional
    public ArtistDtos.AdminArtistDto update(String id, ArtistDtos.UpdateArtistRequest request) {
        Artist artist = findOrThrow(id);
        Set<ArtistRole> updatedRoles = parseRoles(request.roles());
        if (!hasWriterRole(updatedRoles)
                && artistRepository.countRoleAssignments(artist.getId(), "WRITER") > 0) {
            throw new ConflictException("Writer role cannot be removed while the artist is assigned as a writer.");
        }
        if (!hasReciterRole(updatedRoles)
                && artistRepository.countRoleAssignments(artist.getId(), "RECITER") > 0) {
            throw new ConflictException("Reciter role cannot be removed while the artist is assigned as a reciter.");
        }
        artist.setFullName(request.fullName().trim());
        artist.setDisplayName(request.displayName() != null ? request.displayName().trim() : null);
        artist.setBiography(request.biography() != null ? request.biography().trim() : null);
        artist.setRoles(updatedRoles);
        if (request.status() != null && !request.status().isBlank()) {
            artist.setStatus(parseStatus(request.status()));
        }
        return toDto(artistRepository.save(artist));
    }

    @Transactional
    public ArtistDtos.AdminArtistDto updateStatus(String id, String status) {
        Artist artist = findOrThrow(id);
        artist.setStatus(parseStatus(status));
        return toDto(artistRepository.save(artist));
    }

    @Transactional
    public void delete(String id) {
        Artist artist = findOrThrow(id);
        if (artistRepository.countLyricReferences(artist.getId(), artist.getArtistKey()) > 0) {
            throw new ConflictException("Artist is referenced by lyrics and cannot be deleted. Deactivate it instead.");
        }
        artistRepository.delete(artist);
    }

    @Transactional(readOnly = true)
    public List<ArtistDtos.ArtistOptionDto> options(String role, String query) {
        ArtistRole roleFilter = role != null && !role.isBlank() ? parseRole(role) : null;
        String queryFilter = query != null && !query.isBlank() ? query.trim() : null;
        return artistRepository.findActiveOptions(roleFilter, queryFilter).stream()
                .map(this::toOptionDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ArtistDtos.RoleDto> roles() {
        return Arrays.stream(ArtistRole.values())
                .map(r -> new ArtistDtos.RoleDto(r.name(), formatLabel(r)))
                .toList();
    }

    private Artist findOrThrow(String id) {
        return artistRepository.findByArtistKey(id)
                .or(() -> parseNumericId(id).flatMap(artistRepository::findById))
                .orElseThrow(() -> new ResourceNotFoundException("Artist '" + id + "' not found."));
    }

    private java.util.Optional<Long> parseNumericId(String id) {
        try {
            return java.util.Optional.of(Long.parseLong(id));
        } catch (NumberFormatException ignored) {
            return java.util.Optional.empty();
        }
    }

    private Set<ArtistRole> parseRoles(List<String> roles) {
        if (roles == null || roles.isEmpty()) {
            throw new IllegalArgumentException("At least one role is required.");
        }
        Set<ArtistRole> parsed = new LinkedHashSet<>();
        for (String role : roles) {
            if (role == null || role.isBlank()) {
                throw new IllegalArgumentException("Role cannot be empty.");
            }
            parsed.add(parseRole(role.trim()));
        }
        return parsed;
    }

    private ArtistRole parseRole(String role) {
        try {
            return ArtistRole.valueOf(role.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid role: '" + role + "'. Valid roles: "
                    + Arrays.stream(ArtistRole.values()).map(Enum::name)
                            .collect(Collectors.joining(", ")) + ".");
        }
    }

    private ArtistStatus parseStatus(String status) {
        try {
            return ArtistStatus.valueOf(status.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid status: '" + status + "'. Use ACTIVE or INACTIVE.");
        }
    }

    private String slugify(String name) {
        return name.trim().toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N}\\p{M}]+", "-")
                .replaceAll("^-|-$", "");
    }

    private String formatLabel(ArtistRole role) {
        return switch (role) {
            case NAAT_KHWAN -> "Naat Khwan";
            default -> {
                String name = role.name();
                yield name.charAt(0) + name.substring(1).toLowerCase();
            }
        };
    }

    private boolean hasWriterRole(Set<ArtistRole> roles) {
        return roles.stream().anyMatch(role -> Set.of(
                ArtistRole.WRITER, ArtistRole.LYRICIST, ArtistRole.POET).contains(role));
    }

    private boolean hasReciterRole(Set<ArtistRole> roles) {
        return roles.stream().anyMatch(role -> Set.of(
                ArtistRole.RECITER, ArtistRole.NAAT_KHWAN).contains(role));
    }

    private ArtistDtos.AdminArtistDto toDto(Artist artist) {
        return new ArtistDtos.AdminArtistDto(
                artist.getId(),
                artist.getArtistKey(),
                artist.getId(),
                artist.getFullName(),
                artist.getDisplayName(),
                artist.getRoles().stream().map(Enum::name).sorted().toList(),
                artist.getBiography(),
                artist.getStatus().name(),
                artist.getCreatedAt(),
                artist.getUpdatedAt());
    }

    private ArtistDtos.ArtistOptionDto toOptionDto(Artist artist) {
        return new ArtistDtos.ArtistOptionDto(
                artist.getId(),
                artist.getArtistKey(),
                artist.getFullName(),
                artist.getDisplayName(),
                artist.getRoles().stream().map(Enum::name).sorted().toList(),
                artist.getStatus().name());
    }
}