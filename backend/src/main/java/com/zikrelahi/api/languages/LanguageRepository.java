package com.zikrelahi.api.languages;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LanguageRepository extends JpaRepository<Language, String> {

    List<Language> findAllByActiveTrueOrderByNameAsc();
}
