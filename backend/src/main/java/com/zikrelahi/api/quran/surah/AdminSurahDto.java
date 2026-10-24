package com.zikrelahi.api.quran.surah;

public record AdminSurahDto(
        int number,
        String arabicName,
        String transliterated,
        String englishMeaning,
        int ayahCount,
        String revelation,
        int revelationOrder,
        String status) {

    public static AdminSurahDto from(Surah surah) {
        return new AdminSurahDto(
                surah.getNumber(),
                surah.getArabicName(),
                surah.getTransliterated(),
                surah.getEnglishMeaning(),
                surah.getAyahCount(),
                surah.getRevelation().name(),
                surah.getRevelationOrder(),
                surah.getStatus().name());
    }
}
