package com.zikrelahi.api.quran.ayah;

import com.zikrelahi.api.quran.translation.Translation;

/**
 * Public reader DTO — no status field, combines Arabic text with an optional translation.
 * Shape matches quranApiService.ts ApiAyah:
 *   { surahNumber, ayahNumber, arabicText, translation: {...} | null }
 */
public record PublicAyahDto(
        int surahNumber,
        int ayahNumber,
        String arabicText,
        TranslationInfo translation) {

    public record TranslationInfo(
            String languageCode,
            String text,
            String translatorName) {}

    public static PublicAyahDto from(Ayah ayah, Translation translation, String translatorName) {
        return new PublicAyahDto(
                ayah.getSurahNumber(),
                ayah.getAyahNumber(),
                ayah.getArabicText(),
                translation == null ? null : new TranslationInfo(
                        translation.getLanguageCode().name(),
                        translation.getText(),
                        translatorName));
    }
}
