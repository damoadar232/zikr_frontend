package com.zikrelahi.api.lyrics;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;
import java.util.Optional;

public interface LyricRevisionRepository extends JpaRepository<LyricRevision, Long> {

    @EntityGraph(attributePaths = "changedBy")
    List<LyricRevision> findAllByLanguageVersion_IdOrderByRevisionNumberDesc(Long languageVersionId);

    Optional<LyricRevision> findTopByLanguageVersion_IdOrderByRevisionNumberDesc(Long languageVersionId);
}