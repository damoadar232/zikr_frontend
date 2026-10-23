package com.zikrelahi.api.lyrics;

import com.zikrelahi.api.artists.Artist;
import com.zikrelahi.api.artists.ArtistRepository;
import com.zikrelahi.api.artists.ArtistRole;
import com.zikrelahi.api.artists.ArtistStatus;
import com.zikrelahi.api.common.ResourceNotFoundException;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static com.zikrelahi.api.lyrics.LyricDtos.CombinedLyricRequest;

@Service
@RequiredArgsConstructor
public class NumericLyricReferenceResolver {

    private static final Set<ArtistRole> WRITER_ROLES = Set.of(
            ArtistRole.WRITER, ArtistRole.LYRICIST, ArtistRole.POET);
    private static final Set<ArtistRole> RECITER_ROLES = Set.of(
            ArtistRole.RECITER, ArtistRole.NAAT_KHWAN);

    private final JdbcTemplate jdbcTemplate;
    private final ArtistRepository artistRepository;
    private final LyricCategoryRepository categoryRepository;
    private final LyricSubjectRepository subjectRepository;

    @Transactional(readOnly = true)
    public ResolvedReferences resolve(CombinedLyricRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("A lyric request is required.");
        }
        Long primaryArtistId = request.artistId() == null ? null : resolveArtist(request.artistId(), null);
        Long writerId = request.writerId() == null ? null : resolveArtist(request.writerId(), true);
        List<Long> reciterIds = resolveIds(request.reciterIds(),
                id -> resolveArtist(id, false), "reciter");
        List<String> categoryKeys = resolveIds(request.categoryIds(),
                id -> sourceKey("category_numeric_mappings", "category_key", id, "category"), "category");
        List<String> subjectKeys = resolveIds(request.subjectIds(),
                id -> sourceKey("subject_numeric_mappings", "subject_key", id, "subject"), "subject");
        categoryKeys = categoryKeys == null ? null : categoryKeys.stream()
                .map(key -> categoryRepository.findById(key)
                        .orElseThrow(() -> new EntityNotFoundException("Mapped category no longer exists.")))
                .map(LyricCategory::getId).toList();
        subjectKeys = subjectKeys == null ? null : subjectKeys.stream()
                .map(key -> subjectRepository.findById(key)
                        .orElseThrow(() -> new EntityNotFoundException("Mapped subject no longer exists.")))
                .map(LyricSubject::getId).toList();
        return new ResolvedReferences(primaryArtistId, writerId, reciterIds, categoryKeys, subjectKeys);
    }

    private Long resolveArtist(Long numericId, Boolean writer) {
        if (numericId == null || numericId <= 0) {
            throw new IllegalArgumentException("A positive numeric artist ID is required.");
        }
        Artist artist = artistRepository.findById(numericId)
                .orElseThrow(() -> new ResourceNotFoundException("Unknown artist ID: " + numericId + "."));
        if (artist.getStatus() != ArtistStatus.ACTIVE) {
            throw new IllegalArgumentException("Inactive artists cannot be assigned to new lyrics.");
        }
        Set<ArtistRole> allowedRoles = writer == null ? null : writer ? WRITER_ROLES : RECITER_ROLES;
        if (allowedRoles != null
                && (artist.getRoles() == null || artist.getRoles().stream().noneMatch(allowedRoles::contains))) {
            throw new IllegalArgumentException(writer
                    ? "The selected artist does not have a writer-compatible role."
                    : "The selected artist does not have a reciter-compatible role.");
        }
        return artist.getId();
    }

    private String sourceKey(String table, String keyColumn, Long numericId, String entityName) {
        if (numericId == null || numericId <= 0) {
            throw new IllegalArgumentException("A positive numeric " + entityName + " ID is required.");
        }
        String sql = "SELECT " + keyColumn + " FROM " + table + " WHERE id = ?";
        try {
            return jdbcTemplate.queryForObject(sql, String.class, numericId);
        } catch (EmptyResultDataAccessException ex) {
            throw new ResourceNotFoundException(
                    "Unknown " + entityName + " ID: " + numericId + ".");
        }
    }

    private <T> List<T> resolveIds(List<Long> ids, IdResolver<T> resolver, String entityName) {
        if (ids == null) {
            return null;
        }
        Set<Long> uniqueIds = new HashSet<>();
        List<T> resolved = new ArrayList<>(ids.size());
        for (Long id : ids) {
            if (!uniqueIds.add(id)) {
                throw new IllegalArgumentException("Duplicate " + entityName + " ID: " + id + ".");
            }
            resolved.add(resolver.resolve(id));
        }
        return List.copyOf(resolved);
    }

    @FunctionalInterface
    private interface IdResolver<T> {
        T resolve(Long id);
    }

    public record ResolvedReferences(
            Long primaryArtistId,
            Long writerId,
            List<Long> reciterIds,
            List<String> categoryKeys,
            List<String> subjectKeys) {
    }
}
