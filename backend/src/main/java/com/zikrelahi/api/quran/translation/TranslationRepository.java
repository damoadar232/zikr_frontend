package com.zikrelahi.api.quran.translation;

import com.zikrelahi.api.common.ContentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TranslationRepository extends JpaRepository<Translation, Long> {

    Optional<Translation> findFirstBySurahNumberAndAyahNumberAndLanguageCodeOrderByTranslatorIdAsc(
            Short surahNumber, Short ayahNumber, LanguageCode languageCode);

    default Optional<Translation> findBySurahNumberAndAyahNumberAndLanguageCode(
            Short surahNumber, Short ayahNumber, LanguageCode languageCode) {
        return findFirstBySurahNumberAndAyahNumberAndLanguageCodeOrderByTranslatorIdAsc(
                surahNumber, ayahNumber, languageCode);
    }

    Optional<Translation> findBySurahNumberAndAyahNumberAndLanguageCodeAndTranslatorId(
            Short surahNumber, Short ayahNumber, LanguageCode languageCode, Long translatorId);

    List<Translation> findBySurahNumberAndAyahNumberAndLanguageCodeOrderByTranslatorIdAsc(
            Short surahNumber, Short ayahNumber, LanguageCode languageCode);

    List<Translation> findBySurahNumberAndAyahNumberOrderByLanguageCodeAscTranslatorIdAsc(
            Short surahNumber, Short ayahNumber);

    @Query("""
            SELECT t.surahNumber, t.ayahNumber, t.languageCode, tr.id, tr.name, t.text
              FROM Translation t
              JOIN t.translator tr
              JOIN com.zikrelahi.api.quran.ayah.Ayah a
                ON a.id.surahNumber = t.surahNumber
               AND a.id.ayahNumber = t.ayahNumber
              JOIN a.surah s
             WHERE t.surahNumber = :surah
               AND t.languageCode IN :languages
               AND t.status = :status
               AND a.status = :status
               AND s.status = :status
             ORDER BY t.ayahNumber ASC, t.languageCode ASC, tr.id ASC
            """)
    List<Object[]> findPublishedTranslationsBySurahAndLanguages(
            @Param("surah") Short surah,
            @Param("languages") List<LanguageCode> languages,
            @Param("status") ContentStatus status);

    @Query("""
            SELECT t.surahNumber, t.ayahNumber, t.languageCode, tr.id, tr.name, t.text
              FROM Translation t
              JOIN t.translator tr
              JOIN com.zikrelahi.api.quran.ayah.Ayah a
                ON a.id.surahNumber = t.surahNumber
               AND a.id.ayahNumber = t.ayahNumber
              JOIN a.surah s
             WHERE (t.surahNumber > :startSurah
                    OR (t.surahNumber = :startSurah AND t.ayahNumber >= :startAyah))
               AND (t.surahNumber < :endSurah
                    OR (t.surahNumber = :endSurah AND t.ayahNumber <= :endAyah))
               AND t.languageCode IN :languages
               AND t.status = :status
               AND a.status = :status
               AND s.status = :status
             ORDER BY t.surahNumber ASC, t.ayahNumber ASC, t.languageCode ASC, tr.id ASC
            """)
    List<Object[]> findPublishedTranslationsBetween(
            @Param("startSurah") Short startSurah,
            @Param("startAyah") Short startAyah,
            @Param("endSurah") Short endSurah,
            @Param("endAyah") Short endAyah,
            @Param("languages") List<LanguageCode> languages,
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
             WHERE a.id.surahNumber = :surah
               AND a.status = :status
               AND s.status = :status
             ORDER BY a.id.surahNumber ASC, a.id.ayahNumber ASC, tr.id ASC
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
             ORDER BY a.id.surahNumber ASC, a.id.ayahNumber ASC, tr.id ASC
            """)
    List<Object[]> findPublishedAyahsBetween(
            @Param("startSurah") Short startSurah,
            @Param("startAyah") Short startAyah,
            @Param("endSurah") Short endSurah,
            @Param("endAyah") Short endAyah,
            @Param("lang") LanguageCode lang,
            @Param("status") ContentStatus status);
}
