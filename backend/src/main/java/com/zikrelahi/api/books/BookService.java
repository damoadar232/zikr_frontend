package com.zikrelahi.api.books;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BookService {

    private final BookRepository bookRepository;

    @Transactional(readOnly = true)
    public List<BookDto> list() {
        return bookRepository.findAllByOrderByNameAscIdAsc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public void validateReference(String slug) {
        if (!StringUtils.hasText(slug)) {
            return;
        }
        if (!bookRepository.existsBySlug(slug)) {
            throw new IllegalArgumentException("Unknown book reference: " + slug + ".");
        }
    }

    private BookDto toDto(Book book) {
        return new BookDto(book.getId(), book.getName(), book.getAuthor(), book.getSlug(),
                book.getCreatedAt(), book.getUpdatedAt());
    }
}
