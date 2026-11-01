package com.zikrelahi.api.ebooks;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record EbookResponse(
        Long id,
        String title,
        String description,
        EbookLanguageResponse language,
        List<EbookCategoryResponse> categories,
        List<EbookAuthorResponse> authors,
        String originalCoverFilename,
        String coverImageUrl,
        String coverImagePublicId,
        String coverImageFormat,
        Long coverImageSize,
        String originalBookFilename,
        String bookFileFormat,
        Long bookFileSize,
        LocalDate publishedDate,
        EbookStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
