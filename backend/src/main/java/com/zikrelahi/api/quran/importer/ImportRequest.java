package com.zikrelahi.api.quran.importer;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.Valid;
import java.util.List;

public record ImportRequest(
        @NotEmpty(message = "rows array must contain at least one row.")
        List<@Valid AyahImportRow> rows) {}
