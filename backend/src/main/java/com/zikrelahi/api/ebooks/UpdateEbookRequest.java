package com.zikrelahi.api.ebooks;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record UpdateEbookRequest(
        @NotBlank(message = "Title is required.")
        @Size(max = 255, message = "Title must not exceed 255 characters.")
        String title,
        @NotBlank(message = "Description is required.")
        @Size(max = 1200, message = "Description must not exceed 1200 characters.")
        String description,
        @NotBlank(message = "Language is required.")
        @Size(max = 20)
        String languageCode,
        @NotEmpty(message = "At least one category is required.")
        List<@NotBlank @Size(max = 80) String> categoryKeys,
        @NotEmpty(message = "At least one author is required.")
        List<@NotNull Long> authorIds,
        @NotNull(message = "Published date is required.")
        LocalDate publishedDate,
        @Pattern(regexp = "(?i)DRAFT|PUBLISHED|INACTIVE",
                message = "Status must be DRAFT, PUBLISHED, or INACTIVE.")
        String status) {
}
