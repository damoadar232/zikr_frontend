package com.zikrelahi.api.media;

public record MediaUploadResult(
        String secureUrl,
        String publicId,
        String format,
        long sizeBytes,
        String originalFilename,
        Integer durationSeconds) {
}
