package com.zikrelahi.api.books;

import java.time.LocalDateTime;

public record BookDto(
        Long id,
        String name,
        String author,
        String slug,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
