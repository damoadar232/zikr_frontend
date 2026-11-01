package com.zikrelahi.api.ebooks;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EbookCategoryRepository extends JpaRepository<EbookCategory, String> {

    List<EbookCategory> findAllByActiveTrueOrderByNameAsc();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndCategoryKeyNot(String name, String categoryKey);
}
