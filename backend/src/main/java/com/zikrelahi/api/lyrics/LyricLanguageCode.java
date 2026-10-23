package com.zikrelahi.api.lyrics;

public enum LyricLanguageCode {
    ur,
    hi,
    roman;

    public static LyricLanguageCode fromEditorCode(String code) {
        if ("en".equalsIgnoreCase(code) || "roman".equalsIgnoreCase(code)) {
            return roman;
        }
        if ("ur".equalsIgnoreCase(code)) {
            return ur;
        }
        if ("hi".equalsIgnoreCase(code)) {
            return hi;
        }
        throw new IllegalArgumentException("Unsupported lyric language code: " + code);
    }

    public static LyricLanguageCode fromApiCode(String code) {
        return switch (code == null ? "" : code) {
            case "ur" -> ur;
            case "hi" -> hi;
            case "roman" -> roman;
            default -> throw new IllegalArgumentException(
                    "Unsupported language code. Use ur, hi, or roman.");
        };
    }

    public String toEditorCode() {
        return this == roman ? "en" : name();
    }
}