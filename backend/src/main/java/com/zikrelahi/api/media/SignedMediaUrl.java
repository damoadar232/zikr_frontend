package com.zikrelahi.api.media;

import java.time.Instant;

public record SignedMediaUrl(String url, Instant expiresAt) {
}
