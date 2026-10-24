package com.zikrelahi.api.books;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BookRepository extends JpaRepository<Book, Long> {
    List<Book> findAllByOrderByNameAscIdAsc();

    Optional<Book> findBySlug(String slug);

    boolean existsBySlug(String slug);
}
