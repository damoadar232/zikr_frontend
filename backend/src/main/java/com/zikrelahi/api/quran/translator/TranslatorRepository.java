package com.zikrelahi.api.quran.translator;

import com.zikrelahi.api.quran.translation.LanguageCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TranslatorRepository extends JpaRepository<Translator, Long> {
    List<Translator> findByLanguageCodeOrderByNameAsc(LanguageCode languageCode);

    List<Translator> findAllByOrderByLanguageCodeAscNameAscIdAsc();
}
