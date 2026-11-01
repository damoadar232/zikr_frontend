package com.zikrelahi.api.ebooks;

public record EbookAuthorResponse(
        Long id,
        String artistKey,
        String fullName,
        String displayName,
        int position) {
}
