package com.zikrelahi.api.ebooks;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record EbookListItemResponse(
        Long id,
        String title,
        String description,
        String coverImageUrl,
        List<EbookCategoryResponse> categories,
        List<EbookAuthorResponse> authors,
        EbookLanguageResponse language,
        LocalDate publishedDate,
        EbookStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
