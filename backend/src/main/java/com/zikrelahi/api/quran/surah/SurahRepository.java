package com.zikrelahi.api.quran.surah;

import com.zikrelahi.api.common.ContentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SurahRepository extends JpaRepository<Surah, Short> {

    List<Surah> findAllByOrderByNumberAsc();

    List<Surah> findByStatusOrderByNumberAsc(ContentStatus status);

    List<Surah> findByRevelationAndStatusOrderByNumberAsc(
            RevelationType revelation, ContentStatus status);

    Optional<Surah> findByNumberAndStatus(Short number, ContentStatus status);
}
