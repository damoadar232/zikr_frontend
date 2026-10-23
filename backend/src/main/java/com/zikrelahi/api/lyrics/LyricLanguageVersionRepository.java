package com.zikrelahi.api.lyrics;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LyricLanguageVersionRepository extends JpaRepository<LyricLanguageVersion, Long> {

    Optional<LyricLanguageVersion> findByLyric_IdAndLanguageCode(Long lyricId, LyricLanguageCode languageCode);

    List<LyricLanguageVersion> findAllByLyric_IdOrderByLanguageCode(Long lyricId);

    boolean existsByLyric_Id(Long lyricId);

    @Query("""
            select v from LyricLanguageVersion v
            where v.lyric.id in :lyricIds
            order by v.lyric.id, v.languageCode
            """)
    List<LyricLanguageVersion> findAllForLyricIds(@Param("lyricIds") List<Long> lyricIds);

}