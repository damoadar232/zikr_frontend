package com.zikrelahi.api.audio;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AudioRepository extends JpaRepository<Audio, Long> {

    @Query("""
            select a.id from Audio a
            where (:query is null or lower(a.title) like concat('%', :query, '%'))
              and (:status is null or a.status = :status)
              and (:languageCode is null or a.language.code = :languageCode)
              and (:categoryKey is null or exists (
                  select c.categoryKey from Audio a2 join a2.categories c
                  where a2.id = a.id and c.categoryKey = :categoryKey))
            """)
    Page<Long> findAudioIds(
            @Param("query") String query,
            @Param("status") AudioStatus status,
            @Param("languageCode") String languageCode,
            @Param("categoryKey") String categoryKey,
            Pageable pageable);

    @Query("""
            select a.id from Audio a
            where a.status = com.zikrelahi.api.audio.AudioStatus.PUBLISHED
              and (:query is null or lower(a.title) like concat('%', :query, '%'))
              and (:languageCode is null or a.language.code = :languageCode)
              and (:categoryKey is null or exists (
                  select c.categoryKey from Audio a2 join a2.categories c
                  where a2.id = a.id and c.categoryKey = :categoryKey and c.active = true))
            """)
    Page<Long> findPublishedAudioIds(
            @Param("query") String query,
            @Param("languageCode") String languageCode,
            @Param("categoryKey") String categoryKey,
            Pageable pageable);

    @EntityGraph(attributePaths = { "language", "categories" })
    List<Audio> findAllWithLanguageAndCategoriesByIdIn(Collection<Long> ids);

    @EntityGraph(attributePaths = { "language", "categories" })
    Optional<Audio> findWithLanguageAndCategoriesById(Long id);
}
