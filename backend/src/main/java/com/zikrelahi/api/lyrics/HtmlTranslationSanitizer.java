package com.zikrelahi.api.lyrics;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Entities;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;
import org.jsoup.safety.Safelist;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

public final class HtmlTranslationSanitizer {

    public static final int MAX_HTML_BYTES = 256 * 1024;
    private static final int MAX_PARAGRAPHS = 300;
    private static final int MAX_ELEMENTS = 4_000;
    private static final int MAX_TEXT_CHARACTERS = 100_000;
    private static final Pattern HEX_COLOR = Pattern.compile("#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})");
    private static final Pattern FONT_SIZE = Pattern.compile("(?:14|16|18|20|24|28|32|36)px");
    private static final Pattern FONT_WEIGHT = Pattern.compile("(?:normal|bold|[1-9]00)");
    private static final Pattern FONT_FAMILY_NAME =
            Pattern.compile("[\\p{L}\\p{N}][\\p{L}\\p{N} _-]{0,63}");
    private static final Set<String> FONT_STYLES = Set.of("normal", "italic", "oblique");
    private static final Set<String> TEXT_DECORATIONS = Set.of("none", "underline", "line-through", "overline");
    private static final Set<String> TAGS = Set.of("p", "span", "strong", "b", "em", "i", "u", "s", "del", "br");
    private static final Safelist SAFELIST = Safelist.none()
            .addTags("p", "span", "strong", "b", "em", "i", "u", "s", "del", "br")
            .addAttributes("p", "dir", "style")
            .addAttributes("span", "dir", "style")
            .addAttributes("strong", "dir", "style")
            .addAttributes("b", "dir", "style")
            .addAttributes("em", "dir", "style")
            .addAttributes("i", "dir", "style")
            .addAttributes("u", "dir", "style")
            .addAttributes("s", "dir", "style")
            .addAttributes("del", "dir", "style");

    private HtmlTranslationSanitizer() {
    }

    public static ValidatedHtml validate(String html) {
        if (html == null || html.isBlank()) {
            throw invalid("HTML content must contain non-whitespace text.");
        }
        if (html.getBytes(StandardCharsets.UTF_8).length > MAX_HTML_BYTES) {
            throw invalid("HTML content exceeds the 256 KiB size limit.");
        }

        Document.OutputSettings outputSettings = new Document.OutputSettings()
                .prettyPrint(false)
                .escapeMode(Entities.EscapeMode.xhtml)
                .charset(StandardCharsets.UTF_8);
        String cleaned = Jsoup.clean(html, "", SAFELIST, outputSettings);
        Document document = Jsoup.parseBodyFragment(cleaned);
        document.outputSettings(outputSettings);
        List<Element> paragraphs = document.body().select("p");
        if (document.body().getAllElements().size() - 1 > MAX_ELEMENTS) {
            throw invalid("HTML content must contain at most 4,000 elements.");
        }
        if (paragraphs.size() > MAX_PARAGRAPHS) {
            throw invalid("HTML content must contain at most 300 paragraphs.");
        }

        for (Element element : document.body().getAllElements()) {
            if (!"body".equals(element.normalName()) && !TAGS.contains(element.normalName())) {
                throw invalid("HTML contains an unsupported element.");
            }
            if (element.hasAttr("dir")) {
                String direction = element.attr("dir").toLowerCase(Locale.ROOT);
                if (!"ltr".equals(direction) && !"rtl".equals(direction)) {
                    element.removeAttr("dir");
                } else {
                    element.attr("dir", direction);
                }
            }
            if (element.hasAttr("style")) {
                String style = sanitizeStyle(element.attr("style"));
                if (style.isEmpty()) {
                    element.removeAttr("style");
                } else {
                    element.attr("style", style);
                }
            }
            for (org.jsoup.nodes.Attribute attribute : new ArrayList<>(element.attributes().asList())) {
                if (!"dir".equals(attribute.getKey()) && !"style".equals(attribute.getKey())) {
                    element.removeAttr(attribute.getKey());
                }
            }
        }

        String sanitized = document.body().html();
        String plainText = extractPlainText(document.body());
        if (plainText.isBlank()) {
            throw invalid("HTML content must contain non-whitespace text.");
        }
        if (plainText.length() > MAX_TEXT_CHARACTERS) {
            throw invalid("HTML content contains too much text.");
        }
        return new ValidatedHtml(sanitized, plainText);
    }

    public static ValidatedHtml validatePersisted(String html) {
        return validate(html);
    }

    private static String sanitizeStyle(String style) {
        Map<String, String> accepted = new LinkedHashMap<>();
        for (String declaration : style.split(";")) {
            int separator = declaration.indexOf(':');
            if (separator < 1) {
                continue;
            }
            String property = declaration.substring(0, separator).trim().toLowerCase(Locale.ROOT);
            String value = declaration.substring(separator + 1).trim();
            String normalized = normalizeStyleValue(property, value);
            if (normalized != null) {
                accepted.put(property, normalized);
            }
        }
        return accepted.entrySet().stream()
                .map(entry -> entry.getKey() + ": " + entry.getValue())
                .collect(java.util.stream.Collectors.joining("; "));
    }

    private static String normalizeStyleValue(String property, String value) {
        return switch (property) {
            case "color" -> HEX_COLOR.matcher(value).matches() ? value.toLowerCase(Locale.ROOT) : null;
            case "font-size" -> FONT_SIZE.matcher(value).matches() ? value : null;
            case "font-weight" -> FONT_WEIGHT.matcher(value).matches() ? value.toLowerCase(Locale.ROOT) : null;
            case "font-style" -> FONT_STYLES.contains(value.toLowerCase(Locale.ROOT))
                    ? value.toLowerCase(Locale.ROOT)
                    : null;
            case "text-decoration" -> normalizeTextDecoration(value);
            case "font-family" -> normalizeFontFamily(value);
            default -> null;
        };
    }

    private static String normalizeFontFamily(String value) {
        List<String> families = new ArrayList<>();
        for (String candidate : value.split(",", -1)) {
            String family = candidate.trim();
            if (family.length() >= 2 && (family.startsWith("\"") && family.endsWith("\"")
                    || family.startsWith("'") && family.endsWith("'"))) {
                family = family.substring(1, family.length() - 1).trim();
            } else if (family.contains("\"") || family.contains("'")) {
                return null;
            }
            family = family.replaceAll("\\s+", " ");
            if (!FONT_FAMILY_NAME.matcher(family).matches()) {
                return null;
            }
            families.add(family);
        }
        return families.isEmpty() ? null : String.join(", ", families);
    }

    private static String normalizeTextDecoration(String value) {
        Set<String> decorations = new LinkedHashSet<>();
        for (String token : value.toLowerCase(Locale.ROOT).split("\\s+")) {
            if (!TEXT_DECORATIONS.contains(token)) {
                return null;
            }
            decorations.add(token);
        }
        if (decorations.isEmpty() || (decorations.contains("none") && decorations.size() > 1)) {
            return null;
        }
        return String.join(" ", decorations);
    }

    private static String extractPlainText(Element body) {
        List<String> paragraphs = new ArrayList<>();
        for (Node node : body.childNodes()) {
            if (node instanceof Element element && "p".equals(element.normalName())) {
                paragraphs.add(textWithin(element).strip());
            } else {
                String text = textWithin(node).strip();
                if (!text.isEmpty()) {
                    paragraphs.add(text);
                }
            }
        }
        return String.join("\n", paragraphs).strip();
    }

    private static String textWithin(Node node) {
        if (node instanceof TextNode textNode) {
            return textNode.getWholeText();
        }
        if (node instanceof Element element && "br".equals(element.normalName())) {
            return "\n";
        }
        StringBuilder text = new StringBuilder();
        for (Node child : node.childNodes()) {
            text.append(textWithin(child));
        }
        return text.toString();
    }

    private static InvalidLyricHtmlException invalid(String message) {
        return new InvalidLyricHtmlException(message);
    }

    public record ValidatedHtml(String html, String plainText) {
    }
}
