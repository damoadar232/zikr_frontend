package com.zikrelahi.api.quran.translator;

public record PublicTranslatorDto(
        Long id,
        String name,
        String languageCode) {

    public static PublicTranslatorDto from(Translator translator) {
        return new PublicTranslatorDto(
                translator.getId(),
                translator.getName(),
                translator.getLanguageCode().name());
    }
}
