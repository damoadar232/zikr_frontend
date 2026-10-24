package com.zikrelahi.api.quran.translation;

import com.zikrelahi.api.common.ContentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TranslationRepository extends JpaRepository<Translation, Long> {

    Optional<Translation> findBySurahNumberAndAyahNumberAndLanguageCode(
            Short surahNumber, Short ayahNumber, LanguageCode languageCode);

    List<Translation> findBySurahNumberAndAyahNumberOrderByLanguageCodeAsc(
            Short surahNumber, Short ayahNumber);

    @Query("""
            SELECT a, t, tr.name
              FROM com.zikrelahi.api.quran.ayah.Ayah a
              JOIN a.surah s
              LEFT JOIN Translation t
                ON t.surahNumber = a.id.surahNumber
               AND t.ayahNumber = a.id.ayahNumber
               AND t.languageCode = :lang
               AND t.status = :status
              LEFT JOIN t.translator tr
             WHERE a.id.surahNumber = :surah
               AND a.status = :status
               AND s.status = :status
             ORDER BY a.id.surahNumber ASC, a.id.ayahNumber ASC
            """)
    List<Object[]> findPublishedAyahsBySurahAndLanguage(
            @Param("surah")  Short surah,
            @Param("lang")   LanguageCode lang,
            @Param("status") ContentStatus status);

    @Query("""
            SELECT a, t, tr.name
              FROM com.zikrelahi.api.quran.ayah.Ayah a
              JOIN a.surah s
              LEFT JOIN Translation t
                ON t.surahNumber = a.id.surahNumber
               AND t.ayahNumber = a.id.ayahNumber
               AND t.languageCode = :lang
               AND t.status = :status
              LEFT JOIN t.translator tr
             WHERE a.status = :status
               AND s.status = :status
               AND (a.id.surahNumber > :startSurah
                    OR (a.id.surahNumber = :startSurah AND a.id.ayahNumber >= :startAyah))
               AND (a.id.surahNumber < :endSurah
                    OR (a.id.surahNumber = :endSurah AND a.id.ayahNumber <= :endAyah))
             ORDER BY a.id.surahNumber ASC, a.id.ayahNumber ASC
            """)
    List<Object[]> findPublishedAyahsBetween(
            @Param("startSurah") Short startSurah,
            @Param("startAyah") Short startAyah,
            @Param("endSurah") Short endSurah,
            @Param("endAyah") Short endAyah,
            @Param("lang") LanguageCode lang,
            @Param("status") ContentStatus status);
}
