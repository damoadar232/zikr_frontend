package com.zikrelahi.api.lyrics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;

import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Set;
import java.util.regex.Pattern;

public final class TiptapDocumentValidator {

    public static final int MAX_DOCUMENT_BYTES = 256 * 1024;
    private static final int MAX_PARAGRAPHS = 300;
    private static final int MAX_NODES = 4_000;
    private static final int MAX_TEXT_CHARACTERS = 100_000;
    private static final Set<String> FONTS = Set.of(
            "Noto Nastaliq Urdu", "Noto Sans Devanagari", "DM Sans", "Georgia");
    private static final Set<String> FONT_SIZES = Set.of(
            "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px");
    private static final Set<String> ALIGNMENTS = Set.of("left", "center", "right", "justify");
    private static final Set<String> PARAGRAPH_SPACINGS = Set.of("8px", "16px", "24px", "32px");
    private static final Set<String> TEXT_MARKS = Set.of(
            "bold", "italic", "underline", "strike", "textStyle", "highlight");
    private static final Pattern HEX_COLOR = Pattern.compile("#[0-9a-fA-F]{6}");
    private static final Pattern HTML_MARKUP = Pattern.compile("(?is)<\\s*/?\\s*[a-z][^>]*>");
    private static final ObjectMapper STORAGE_JSON_PARSER = new ObjectMapper();

    private TiptapDocumentValidator() {
    }

    public static ValidatedDocument validate(JsonNode document) {
        if (document == null || !document.isObject()) {
            throw invalid("Document must be a JSON object.");
        }
        int bytes = document.toString().getBytes(StandardCharsets.UTF_8).length;
        if (bytes > MAX_DOCUMENT_BYTES) {
            throw invalid("Document exceeds the 256 KiB size limit.");
        }
        requireOnlyFields(document, Set.of("type", "content"), "document");
        requireType(document, "doc");
        JsonNode paragraphs = document.get("content");
        if (paragraphs == null || !paragraphs.isArray() || paragraphs.size() > MAX_PARAGRAPHS) {
            throw invalid("Document content must contain at most 300 paragraphs.");
        }

        Counter counter = new Counter();
        StringBuilder plainText = new StringBuilder();
        for (int index = 0; index < paragraphs.size(); index++) {
            if (index > 0)
                plainText.append('\n');
            validateParagraph(paragraphs.get(index), plainText, counter);
        }
        String normalizedText = plainText.toString()
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .strip();
        if (normalizedText.isEmpty()) {
            throw invalid("Document must contain non-whitespace text.");
        }
        return new ValidatedDocument(document.deepCopy(), normalizedText);
    }

    public static ValidatedDocument validatePersisted(JsonNode storedDocument) {
        JsonNode document = storedDocument;
        if (storedDocument != null && storedDocument.isTextual()) {
            try {
                document = STORAGE_JSON_PARSER.readTree(storedDocument.asText());
            } catch (JsonProcessingException ex) {
                throw invalid("Stored language document is malformed JSON.");
            }
        }
        return validate(document);
    }

    private static void validateParagraph(JsonNode paragraph, StringBuilder plainText, Counter counter) {
        countNode(counter);
        if (paragraph == null || !paragraph.isObject())
            throw invalid("Paragraphs must be objects.");
        requireOnlyFields(paragraph, Set.of("type", "attrs", "content"), "paragraph");
        requireType(paragraph, "paragraph");
        validateParagraphAttributes(paragraph.get("attrs"));
        JsonNode content = paragraph.get("content");
        if (content == null)
            return;
        if (!content.isArray())
            throw invalid("Paragraph content must be an array.");
        for (JsonNode child : content) {
            if (!child.isObject())
                throw invalid("Paragraph children must be objects.");
            String type = child.path("type").asText();
            if ("text".equals(type)) {
                validateText(child, plainText, counter);
            } else if ("hardBreak".equals(type)) {
                countNode(counter);
                requireOnlyFields(child, Set.of("type"), "hardBreak");
                plainText.append('\n');
            } else {
                throw invalid("Unsupported lyric node type: " + type + ".");
            }
        }
    }

    private static void validateText(JsonNode textNode, StringBuilder plainText, Counter counter) {
        countNode(counter);
        requireOnlyFields(textNode, Set.of("type", "text", "marks"), "text");
        requireType(textNode, "text");
        JsonNode text = textNode.get("text");
        if (text == null || !text.isTextual())
            throw invalid("Text nodes require string text.");
        String value = text.asText();
        if (value.length() > MAX_TEXT_CHARACTERS
                || value.chars().anyMatch(character -> character < 0x20 && character != '\n' && character != '\t')
                || HTML_MARKUP.matcher(value).find()) {
            throw invalid("Text contains unsupported markup or control characters.");
        }
        counter.textCharacters += value.length();
        if (counter.textCharacters > MAX_TEXT_CHARACTERS) {
            throw invalid("Document contains too much text.");
        }
        validateMarks(textNode.get("marks"));
        plainText.append(value);
    }

    private static void validateMarks(JsonNode marks) {
        if (marks == null)
            return;
        if (!marks.isArray())
            throw invalid("Text marks must be an array.");
        for (JsonNode mark : marks) {
            if (!mark.isObject())
                throw invalid("Text marks must be objects.");
            String type = mark.path("type").asText();
            if (!TEXT_MARKS.contains(type))
                throw invalid("Unsupported text mark: " + type + ".");
            requireOnlyFields(mark, Set.of("type", "attrs"), "mark");
            JsonNode attrs = mark.get("attrs");
            if ("textStyle".equals(type)) {
                validateTextStyleAttributes(attrs);
            } else if ("highlight".equals(type)) {
                validateHighlightAttributes(attrs);
            } else if (attrs != null) {
                throw invalid("Mark '" + type + "' does not accept attributes.");
            }
        }
    }

    private static void validateParagraphAttributes(JsonNode attrs) {
        if (attrs == null || attrs.isNull())
            return;
        if (!attrs.isObject())
            throw invalid("Paragraph attributes must be an object.");
        requireOnlyFields(attrs, Set.of("textAlign", "paragraphSpacing"), "paragraph attributes");
        validateOptionalChoice(attrs.get("textAlign"), ALIGNMENTS, "text alignment");
        validateOptionalChoice(attrs.get("paragraphSpacing"), PARAGRAPH_SPACINGS, "paragraph spacing");
    }

    private static void validateTextStyleAttributes(JsonNode attrs) {
        if (attrs == null || attrs.isNull())
            throw invalid("Text style marks require attributes.");
        if (!attrs.isObject())
            throw invalid("Text style attributes must be an object.");
        requireOnlyFields(attrs, Set.of("color", "fontFamily", "fontSize"), "text style attributes");
        validateColor(attrs.get("color"), "text color");
        validateOptionalChoice(attrs.get("fontFamily"), FONTS, "font family");
        validateOptionalChoice(attrs.get("fontSize"), FONT_SIZES, "font size");
        if (attrs.isEmpty())
            throw invalid("Text style marks require at least one attribute.");
    }

    private static void validateHighlightAttributes(JsonNode attrs) {
        if (attrs == null || attrs.isNull())
            return;
        if (!attrs.isObject())
            throw invalid("Highlight attributes must be an object.");
        requireOnlyFields(attrs, Set.of("color"), "highlight attributes");
        validateColor(attrs.get("color"), "highlight color");
    }

    private static void validateColor(JsonNode value, String name) {
        if (value == null || value.isNull())
            return;
        if (!value.isTextual() || !HEX_COLOR.matcher(value.asText()).matches()) {
            throw invalid(name + " must be a six-digit hexadecimal color.");
        }
    }

    private static void validateOptionalChoice(JsonNode value, Set<String> allowed, String name) {
        if (value == null || value.isNull())
            return;
        if (!value.isTextual() || !allowed.contains(value.asText())) {
            throw invalid("Unsupported " + name + ".");
        }
    }

    private static void requireType(JsonNode node, String type) {
        if (!type.equals(node.path("type").asText()))
            throw invalid("Expected node type '" + type + "'.");
    }

    private static void requireOnlyFields(JsonNode node, Set<String> allowed, String context) {
        Iterator<String> fields = node.fieldNames();
        while (fields.hasNext()) {
            String field = fields.next();
            if (!allowed.contains(field))
                throw invalid("Unsupported " + context + " field: " + field + ".");
        }
    }

    private static void countNode(Counter counter) {
        if (++counter.nodes > MAX_NODES)
            throw invalid("Document contains too many nodes.");
    }

    private static InvalidTiptapDocumentException invalid(String message) {
        return new InvalidTiptapDocumentException(message);
    }

    public record ValidatedDocument(JsonNode document, String plainText) {
    }

    private static final class Counter {
        private int nodes;
        private int textCharacters;
    }
}