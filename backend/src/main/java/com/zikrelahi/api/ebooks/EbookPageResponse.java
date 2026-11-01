package com.zikrelahi.api.ebooks;

import java.util.List;

public record EbookPageResponse(
        List<EbookListItemResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages) {
}
