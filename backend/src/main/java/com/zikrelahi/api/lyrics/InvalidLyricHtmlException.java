package com.zikrelahi.api.lyrics;

public class InvalidLyricHtmlException extends IllegalArgumentException {
    public InvalidLyricHtmlException(String message) {
        super(message);
    }
}
