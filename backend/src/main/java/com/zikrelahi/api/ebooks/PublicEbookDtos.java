package com.zikrelahi.api.ebooks;

import java.time.Instant;

public final class PublicEbookDtos {

    private PublicEbookDtos() {
    }

    public record DeliveryLink(
            String url,
            Instant expiresAt) {
    }
}
