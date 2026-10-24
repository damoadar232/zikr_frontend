package com.zikrelahi.api.quran.ayah;

import com.zikrelahi.api.common.ContentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AyahRepository extends JpaRepository<Ayah, AyahId> {

    List<Ayah> findByIdSurahNumberAndStatusOrderByIdAyahNumberAsc(
            Short surahNumber, ContentStatus status);

    List<Ayah> findByIdSurahNumberOrderByIdAyahNumberAsc(Short surahNumber);

    Optional<Ayah> findByIdSurahNumberAndIdAyahNumber(
            Short surahNumber, Short ayahNumber);

    boolean existsByIdSurahNumberAndIdAyahNumber(Short surahNumber, Short ayahNumber);
}
