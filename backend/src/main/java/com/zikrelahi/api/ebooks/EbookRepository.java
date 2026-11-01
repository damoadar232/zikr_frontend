package com.zikrelahi.api.ebooks;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EbookRepository extends JpaRepository<Ebook, Long> {

    @Query(value = """
            select e.id from ebooks e
            where (:query is null
                   or lower(e.title) like concat('%', :query, '%')
                   or (:searchDescription = true and lower(e.description) like concat('%', :query, '%')))
              and (:status is null or e.status = :status)
              and (:languageCode is null or e.language_code = :languageCode)
              and (:categoryKey is null or exists (
                  select 1 from ebook_category_assignments category_assignment
                  where category_assignment.ebook_id = e.id
                    and category_assignment.category_key = :categoryKey))
              and (:authorId is null or exists (
                  select 1 from ebook_author_ids author_assignment
                  where author_assignment.ebook_id = e.id
                    and author_assignment.artist_id = :authorId))
            """,
            countQuery = """
                    select count(*) from ebooks e
                    where (:query is null
                           or lower(e.title) like concat('%', :query, '%')
                           or (:searchDescription = true
                               and lower(e.description) like concat('%', :query, '%')))
                      and (:status is null or e.status = :status)
                      and (:languageCode is null or e.language_code = :languageCode)
                      and (:categoryKey is null or exists (
                          select 1 from ebook_category_assignments category_assignment
                          where category_assignment.ebook_id = e.id
                            and category_assignment.category_key = :categoryKey))
                      and (:authorId is null or exists (
                          select 1 from ebook_author_ids author_assignment
                          where author_assignment.ebook_id = e.id
                            and author_assignment.artist_id = :authorId))
                    """,
            nativeQuery = true)
    Page<Long> findEbookIds(
            @Param("query") String query,
            @Param("searchDescription") boolean searchDescription,
            @Param("status") String status,
            @Param("languageCode") String languageCode,
            @Param("categoryKey") String categoryKey,
            @Param("authorId") Long authorId,
            Pageable pageable);

    @EntityGraph(attributePaths = { "language", "categories" })
    List<Ebook> findAllWithLanguageAndCategoriesByIdIn(Collection<Long> ids);

    @EntityGraph(attributePaths = { "language", "categories" })
    Optional<Ebook> findWithLanguageAndCategoriesById(Long id);
}
