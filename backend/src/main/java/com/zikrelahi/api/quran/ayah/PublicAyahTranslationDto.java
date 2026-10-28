package com.zikrelahi.api.quran.ayah;

public record PublicAyahTranslationDto(
        int surahNumber,
        int ayahNumber,
        String languageCode,
        Long translatorId,
        String translatorName,
        String text) {
}
