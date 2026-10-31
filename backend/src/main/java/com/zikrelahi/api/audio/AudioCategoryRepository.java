package com.zikrelahi.api.audio;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface AudioCategoryRepository extends JpaRepository<AudioCategory, String> {

    List<AudioCategory> findAllByActiveTrueOrderByNameAsc();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndCategoryKeyNot(String name, String categoryKey);

    @Query("""
            select distinct c from AudioCategory c
            where c.active = true
              and exists (
                  select a.id from Audio a join a.categories assigned
                  where assigned = c and a.status = com.zikrelahi.api.audio.AudioStatus.PUBLISHED)
            order by c.name
            """)
    List<AudioCategory> findPublicCategoriesWithPublishedAudios();
}
