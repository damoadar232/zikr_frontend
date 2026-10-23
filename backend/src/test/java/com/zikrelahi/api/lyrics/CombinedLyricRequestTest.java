package com.zikrelahi.api.lyrics;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zikrelahi.api.lyrics.LyricDtos.CombinedLyricRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CombinedLyricRequestTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void deserializesTheFinalThreeLanguageRequestFixture() throws Exception {
        String json = """
                {
                  "title": "A lyric",
                  "slug": "a-lyric",
                  "writerId": 101,
                  "reciterIds": [102],
                  "categoryIds": [201],
                  "subjectIds": [301],
                  "tags": ["devotional"],
                  "bookId": "book-key",
                  "featured": true,
                  "mediaReferences": [],
                  "translations": [
                    {"languageCode":"ur","content":"<p>سلام</p>","contentFormat":"HTML"},
                    {"languageCode":"hi","content":"<p>नमस्ते</p>","contentFormat":"HTML"},
                    {"languageCode":"roman","content":"<p>Salaam</p>","contentFormat":"HTML"}
                  ]
                }
                """;

        CombinedLyricRequest request = objectMapper.readValue(json, CombinedLyricRequest.class);

        assertEquals("A lyric", request.title());
        assertEquals(101L, request.writerId());
        assertEquals(102L, request.reciterIds().getFirst());
        assertEquals(3, request.translations().size());
        assertEquals(LyricLanguageCode.roman, request.translations().getLast().languageCode());
        assertEquals(LyricDtos.HtmlTranslationFormat.HTML, request.translations().getFirst().contentFormat());
        assertTrue(request.mediaReferences().isEmpty());
        assertTrue(validator.validate(request).isEmpty());
    }

    @Test
    void distinguishesOmittedTranslationsFromAnExplicitlyEmptyArray() throws Exception {
        CombinedLyricRequest omitted = objectMapper.readValue(
                "{\"title\":\"A lyric\"}", CombinedLyricRequest.class);
        CombinedLyricRequest empty = objectMapper.readValue(
                "{\"title\":\"A lyric\",\"translations\":[]}", CombinedLyricRequest.class);

        assertNull(omitted.translations());
        assertTrue(empty.translations().isEmpty());
        assertTrue(validator.validate(omitted).isEmpty());
        assertTrue(validator.validate(empty).isEmpty());
    }

    @Test
    void rejectsDuplicateNumericReferencesAndDuplicateTranslationLanguages() {
        CombinedLyricRequest request = new CombinedLyricRequest(
                "A lyric", null, null, java.util.List.of(12L, 12L), null, null, null,
                null, null, java.util.List.of(), java.util.List.of(
                        new LyricDtos.HtmlTranslationRequest(
                                LyricLanguageCode.ur, "<p>سلام</p>", LyricDtos.HtmlTranslationFormat.HTML, null),
                        new LyricDtos.HtmlTranslationRequest(
                                LyricLanguageCode.ur, "<p>دوبارہ</p>", LyricDtos.HtmlTranslationFormat.HTML, null)),
                null);

        assertFalse(validator.validate(request).isEmpty());
    }

    @Test
    void rejectsUnsupportedLanguageAndContentFormatDuringDeserialization() {
        assertThrows(Exception.class, () -> objectMapper.readValue(
                "{\"title\":\"A lyric\",\"translations\":[{\"languageCode\":\"en\","
                        + "\"content\":\"<p>x</p>\",\"contentFormat\":\"HTML\"}]}",
                CombinedLyricRequest.class));
        assertThrows(Exception.class, () -> objectMapper.readValue(
                "{\"title\":\"A lyric\",\"translations\":[{\"languageCode\":\"ur\","
                        + "\"content\":\"<p>x</p>\",\"contentFormat\":\"TIPTAP_JSON\"}]}",
                CombinedLyricRequest.class));
    }
}
