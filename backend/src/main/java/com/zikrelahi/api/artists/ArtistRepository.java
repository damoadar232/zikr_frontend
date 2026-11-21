package com.zikrelahi.api.artists;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

public interface ArtistRepository extends JpaRepository<Artist, Long> {

    java.util.Optional<Artist> findByArtistKey(String artistKey);

    java.util.Optional<Artist> findByIdAndStatus(Long id, ArtistStatus status);

    boolean existsByArtistKey(String artistKey);

    @Query("""
            SELECT DISTINCT a FROM Artist a
            LEFT JOIN FETCH a.roles
            WHERE LOWER(a.artistKey) = LOWER(:reference)
               OR LOWER(a.fullName) = LOWER(:reference)
               OR LOWER(a.displayName) = LOWER(:reference)
            """)
    List<Artist> findByReference(@Param("reference") String reference);

    @Query("""
            SELECT DISTINCT a FROM Artist a
            LEFT JOIN FETCH a.roles
            WHERE (:status IS NULL OR a.status = :status)
            AND (:role IS NULL OR :role MEMBER OF a.roles)
            AND (:query IS NULL OR LOWER(a.fullName) LIKE LOWER(CONCAT('%', :query, '%'))
                 OR (a.displayName IS NOT NULL AND LOWER(a.displayName) LIKE LOWER(CONCAT('%', :query, '%'))))
            ORDER BY a.fullName ASC
            """)
    Page<Artist> searchArtists(
            @Param("status") ArtistStatus status,
            @Param("role") ArtistRole role,
            @Param("query") String query,
            Pageable pageable);

    @Query("""
            SELECT DISTINCT a FROM Artist a
            LEFT JOIN FETCH a.roles
            WHERE a.status = ArtistStatus.ACTIVE
            AND (:role IS NULL OR :role MEMBER OF a.roles)
            AND (:query IS NULL OR LOWER(a.fullName) LIKE LOWER(CONCAT('%', :query, '%'))
                 OR (a.displayName IS NOT NULL AND LOWER(a.displayName) LIKE LOWER(CONCAT('%', :query, '%'))))
            ORDER BY a.fullName ASC
            """)
    List<Artist> findActiveOptions(
            @Param("role") ArtistRole role,
            @Param("query") String query);

    @Query(value = """
            SELECT
                (SELECT COUNT(*) FROM lyric_artist_ids lai WHERE lai.artist_id = :artistId)
                + (SELECT COUNT(*) FROM lyric_artist_ids_legacy lail WHERE lail.artist_id = :artistKey)
                + (SELECT COUNT(*) FROM lyrics l
                   WHERE l.artist_id = :artistId OR l.writer_id = :artistId
                      OR l.artist_id_legacy = :artistKey OR l.writer_id_legacy = :artistKey)
                + (SELECT COUNT(*) FROM lyric_reciters lr
                   JOIN artists a ON LOWER(lr.display_name) = LOWER(a.full_name)
                                       OR LOWER(lr.display_name) = LOWER(a.display_name)
                   WHERE a.id = :artistId)
            """, nativeQuery = true)
    long countLyricReferences(@Param("artistId") Long artistId, @Param("artistKey") String artistKey);

    @Query(value = """
            SELECT DISTINCT a.*
            FROM artists a
            JOIN artist_roles ar ON ar.artist_id = a.id
            WHERE a.status = :status
              AND ar.role IN (:reciterRoles)
              AND (:letter IS NULL OR (
                  (:letter = '0-9' AND LEFT(COALESCE(a.display_name, a.full_name), 1) REGEXP '^[0-9]')
                  OR (:letter <> '0-9' AND UPPER(LEFT(COALESCE(a.display_name, a.full_name), 1)) = :letter)
              ))
            ORDER BY a.full_name ASC, a.id ASC
            """, countQuery = """
            SELECT COUNT(DISTINCT a.id)
            FROM artists a
            JOIN artist_roles ar ON ar.artist_id = a.id
            WHERE a.status = :status
              AND ar.role IN (:reciterRoles)
              AND (:letter IS NULL OR (
                  (:letter = '0-9' AND LEFT(COALESCE(a.display_name, a.full_name), 1) REGEXP '^[0-9]')
                  OR (:letter <> '0-9' AND UPPER(LEFT(COALESCE(a.display_name, a.full_name), 1)) = :letter)
              ))
            """, nativeQuery = true)
    Page<Artist> searchPublicReciters(
            @Param("status") String status,
            @Param("reciterRoles") List<String> reciterRoles,
            @Param("letter") String letter,
            Pageable pageable);

    @Query(value = """
            SELECT DISTINCT a.*
            FROM artists a
            JOIN artist_roles ar ON ar.artist_id = a.id
            WHERE a.status = :status
              AND ar.role = :poetRole
              AND (:letter IS NULL OR (
                  (:letter = '0-9' AND LEFT(COALESCE(a.display_name, a.full_name), 1) REGEXP '^[0-9]')
                  OR (:letter <> '0-9' AND UPPER(LEFT(COALESCE(a.display_name, a.full_name), 1)) = :letter)
              ))
            ORDER BY a.full_name ASC, a.id ASC
            """, countQuery = """
            SELECT COUNT(DISTINCT a.id)
            FROM artists a
            JOIN artist_roles ar ON ar.artist_id = a.id
            WHERE a.status = :status
              AND ar.role = :poetRole
              AND (:letter IS NULL OR (
                  (:letter = '0-9' AND LEFT(COALESCE(a.display_name, a.full_name), 1) REGEXP '^[0-9]')
                  OR (:letter <> '0-9' AND UPPER(LEFT(COALESCE(a.display_name, a.full_name), 1)) = :letter)
              ))
            """, nativeQuery = true)
    Page<Artist> searchPublicPoets(
            @Param("status") String status,
            @Param("poetRole") String poetRole,
            @Param("letter") String letter,
            Pageable pageable);

    @Query(value = """
            SELECT COUNT(*) FROM lyric_artist_ids
            WHERE artist_id = :artistId AND role = :role
            """, nativeQuery = true)
    long countRoleAssignments(@Param("artistId") Long artistId, @Param("role") String role);
}