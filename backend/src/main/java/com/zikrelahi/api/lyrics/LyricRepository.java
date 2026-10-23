package com.zikrelahi.api.lyrics;

import com.zikrelahi.api.common.ContentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface LyricRepository extends JpaRepository<Lyric, Long> {

    Optional<Lyric> findByLegacyId(String legacyId);

    Optional<Lyric> findBySlug(String slug);

    Optional<Lyric> findByIdAndStatus(Long id, ContentStatus status);

    Optional<Lyric> findByLegacyIdAndStatus(String legacyId, ContentStatus status);

    Optional<Lyric> findBySlugAndStatus(String slug, ContentStatus status);

    @Query("""
            select l from Lyric l
            where (:status is null or l.status = :status)
              and (:query is null or lower(l.title) like concat('%', :query, '%')
                 or lower(l.legacyId) like concat('%', :query, '%')
                 or lower(l.slug) like concat('%', :query, '%'))
            order by l.updatedAt desc, l.id desc
            """)
    Page<Lyric> findAdminPage(@Param("status") ContentStatus status,
            @Param("query") String query,
            Pageable pageable);

    @Query(value = """
            SELECT l.* FROM lyrics l
            WHERE l.status = 'PUBLISHED'
              AND (:categoryId IS NULL OR EXISTS (
                  SELECT 1 FROM lyric_category_assignments ca
                  WHERE ca.lyric_id = l.id AND ca.category_id = :categoryId))
              AND (:reciter IS NULL OR EXISTS (
                  SELECT 1 FROM lyric_artist_ids la
                  JOIN artists a ON a.id = la.artist_id
                  WHERE la.lyric_id = l.id AND la.role = 'RECITER'
                    AND (LOWER(COALESCE(a.display_name, a.full_name)) LIKE CONCAT('%', LOWER(:reciter), '%')
                         OR a.artist_key = :reciter))
                  OR EXISTS (
                      SELECT 1 FROM lyric_reciters r
                      WHERE r.lyric_id = l.id
                        AND LOWER(r.display_name) LIKE CONCAT('%', LOWER(:reciter), '%')))
              AND (:poetArtistId IS NULL OR l.writer_id = :poetArtistId)
              AND (:poet IS NULL OR :poetArtistId IS NOT NULL
                   OR l.writer_id_legacy = :poet OR LOWER(l.writer_name) = LOWER(:poet)
                   OR EXISTS (
                       SELECT 1 FROM lyric_artist_ids la
                       JOIN artists a ON a.id = la.artist_id
                       WHERE la.lyric_id = l.id AND la.role = 'WRITER'
                         AND (a.artist_key = :poet OR LOWER(a.full_name) = LOWER(:poet)
                              OR LOWER(a.display_name) = LOWER(:poet))))
              AND (:languageCode IS NULL OR EXISTS (
                  SELECT 1 FROM lyric_language_versions v
                  WHERE v.lyric_id = l.id AND v.language_code = :languageCode))
            ORDER BY l.created_at DESC, l.id DESC
            """, countQuery = """
            SELECT COUNT(*) FROM lyrics l
            WHERE l.status = 'PUBLISHED'
              AND (:categoryId IS NULL OR EXISTS (
                  SELECT 1 FROM lyric_category_assignments ca
                  WHERE ca.lyric_id = l.id AND ca.category_id = :categoryId))
              AND (:reciter IS NULL OR EXISTS (
                  SELECT 1 FROM lyric_artist_ids la
                  JOIN artists a ON a.id = la.artist_id
                  WHERE la.lyric_id = l.id AND la.role = 'RECITER'
                    AND (LOWER(COALESCE(a.display_name, a.full_name)) LIKE CONCAT('%', LOWER(:reciter), '%')
                         OR a.artist_key = :reciter))
                  OR EXISTS (
                      SELECT 1 FROM lyric_reciters r
                      WHERE r.lyric_id = l.id
                        AND LOWER(r.display_name) LIKE CONCAT('%', LOWER(:reciter), '%')))
              AND (:poetArtistId IS NULL OR l.writer_id = :poetArtistId)
              AND (:poet IS NULL OR :poetArtistId IS NOT NULL
                   OR l.writer_id_legacy = :poet OR LOWER(l.writer_name) = LOWER(:poet)
                   OR EXISTS (
                       SELECT 1 FROM lyric_artist_ids la
                       JOIN artists a ON a.id = la.artist_id
                       WHERE la.lyric_id = l.id AND la.role = 'WRITER'
                         AND (a.artist_key = :poet OR LOWER(a.full_name) = LOWER(:poet)
                              OR LOWER(a.display_name) = LOWER(:poet))))
              AND (:languageCode IS NULL OR EXISTS (
                  SELECT 1 FROM lyric_language_versions v
                  WHERE v.lyric_id = l.id AND v.language_code = :languageCode))
            """, nativeQuery = true)
    Page<Lyric> findPublicPage(@Param("categoryId") String categoryId,
            @Param("reciter") String reciter,
            @Param("poet") String poet,
            @Param("poetArtistId") Long poetArtistId,
            @Param("languageCode") String languageCode,
            Pageable pageable);
}