package com.zikrelahi.api.ebooks;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateEbookStatusRequest(
        @NotBlank(message = "Status is required.")
        @Pattern(regexp = "(?i)DRAFT|PUBLISHED|INACTIVE",
                message = "Status must be DRAFT, PUBLISHED, or INACTIVE.")
        String status) {
}
