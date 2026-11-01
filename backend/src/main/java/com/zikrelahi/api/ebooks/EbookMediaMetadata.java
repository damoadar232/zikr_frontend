package com.zikrelahi.api.ebooks;

public record EbookMediaMetadata(
        String originalFilename,
        String secureUrl,
        String publicId,
        String format,
        long sizeBytes) {
}
