package com.zikrelahi.api.quran.surah;

import com.zikrelahi.api.common.ContentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SurahUpdateRequest(
        @NotBlank @Size(max = 100) String arabicName,
        @NotBlank @Size(max = 100) String transliterated,
        @NotBlank @Size(max = 200) String englishMeaning,
        RevelationType revelation,
        ContentStatus status) {}
