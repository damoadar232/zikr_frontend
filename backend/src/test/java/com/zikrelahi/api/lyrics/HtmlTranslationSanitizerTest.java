package com.zikrelahi.api.lyrics;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HtmlTranslationSanitizerTest {

    @Test
    void preservesApprovedFormattingUnicodeAndRightToLeftDirection() {
        var validated = HtmlTranslationSanitizer.validate(
                "<p dir=\"rtl\"><span style=\"color: #DC2626; font-size: 28px; "
                        + "font-weight: 700; font-family: 'Noto Nastaliq Urdu'\">اردو نمایاں</span></p>"
                        + "<p><strong>bold</strong> <em>italic</em> <u>underline</u><br>दूसरी पंक्ति</p>");

        assertTrue(validated.html().contains("dir=\"rtl\""));
        assertTrue(validated.html().contains("color: #dc2626"));
        assertTrue(validated.html().contains("font-size: 28px"));
        assertTrue(validated.html().contains("font-weight: 700"));
        assertTrue(validated.html().contains("font-family: Noto Nastaliq Urdu"));
        assertTrue(validated.html().contains("<strong>bold</strong>"));
        assertTrue(validated.html().contains("<em>italic</em>"));
        assertTrue(validated.html().contains("<u>underline</u>"));
        assertEquals("اردو نمایاں\nbold italic underline\nदूसरी पंक्ति", validated.plainText());
    }

    @Test
    void preservesStrikeDirectionAndAllValidatedTextStyles() {
        var validated = HtmlTranslationSanitizer.validate(
                "<p dir=\"ltr\"><span style=\"color: #ABC; font-size: 24px; font-family: Georgia; "
                        + "font-weight: bold; font-style: italic; text-decoration: underline line-through\">"
                        + "mañana नमस्ते</span> <s dir=\"rtl\">retired</s> <del>removed</del></p>");

        assertTrue(validated.html().contains("dir=\"ltr\""));
        assertTrue(validated.html().contains("color: #abc"));
        assertTrue(validated.html().contains("font-size: 24px"));
        assertTrue(validated.html().contains("font-family: Georgia"));
        assertTrue(validated.html().contains("font-weight: bold"));
        assertTrue(validated.html().contains("font-style: italic"));
        assertTrue(validated.html().contains("text-decoration: underline line-through"));
        assertTrue(validated.html().contains("<s dir=\"rtl\">retired</s>"));
        assertTrue(validated.html().contains("<del>removed</del>"));
        assertEquals("mañana नमस्ते retired removed", validated.plainText());
    }

    @Test
    void preservesValidatedFontFamiliesWithoutANameAllowlist() {
        var validated = HtmlTranslationSanitizer.validate(
                "<p><span style=\"font-family: 'Noto Nastaliq Urdu', Custom Display 2025\">متن</span></p>");

        assertTrue(validated.html().contains("font-family: Noto Nastaliq Urdu, Custom Display 2025"));
    }

    @Test
    void removesUnsafeMarkupAttributesAndCssWhileKeepingSafeText() {
        var validated = HtmlTranslationSanitizer.validate(
                "<p onclick=\"alert(1)\" dir=\"rtl\"><span style=\"color:expression(alert(1));"
                        + "position:fixed;font-family:Arial;font-weight:bold;"
                        + "font-style:url(javascript:alert(1));text-decoration:underline url(x)\">safe</span>"
                        + " <script>alert('xss')</script><a href=\"javascript:alert(1)\">text</a>"
                        + " <iframe src=\"javascript:alert(1)\">embedded</iframe></p>");

        assertTrue(validated.html().contains("dir=\"rtl\""));
        assertTrue(validated.html().contains("font-family: Arial"));
        assertTrue(validated.html().contains("font-weight: bold"));
        assertFalse(validated.html().contains("onclick"));
        assertFalse(validated.html().contains("expression"));
        assertFalse(validated.html().contains("position"));
        assertFalse(validated.html().contains("font-style"));
        assertFalse(validated.html().contains("text-decoration"));
        assertFalse(validated.html().contains("script"));
        assertFalse(validated.html().contains("iframe"));
        assertFalse(validated.html().contains("javascript:"));
        assertEquals("safe text embedded", validated.plainText());
    }
}
