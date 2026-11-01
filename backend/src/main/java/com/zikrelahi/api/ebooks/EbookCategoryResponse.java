package com.zikrelahi.api.ebooks;

import java.time.LocalDateTime;

public record EbookCategoryResponse(
        String categoryKey,
        String name,
        String description,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
