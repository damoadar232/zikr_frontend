package com.zikrelahi.api.lyrics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TiptapDocumentValidatorTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void acceptsConfiguredMarksAndExtractsNormalizedText() throws Exception {
        JsonNode document = objectMapper.readTree(
                """
                        {"type":"doc","content":[
                          {"type":"paragraph","attrs":{"textAlign":"right","paragraphSpacing":"16px"},"content":[
                            {"type":"text","text":"  Salaam","marks":[{"type":"bold"},{"type":"textStyle","attrs":{"color":"#D4AF65","fontFamily":"Noto Nastaliq Urdu","fontSize":"24px"}}]},
                            {"type":"hardBreak"},
                            {"type":"text","text":"peace","marks":[{"type":"highlight","attrs":{"color":"#F2D18B"}}]}
                          ]},
                          {"type":"paragraph","content":[{"type":"text","text":"second"}]}
                        ]}
                        """);

        var validated = TiptapDocumentValidator.validate(document);

        assertEquals("Salaam\npeace\nsecond", validated.plainText());
        assertEquals(document, validated.document());
    }

    @Test
    void acceptsEveryFontFamilySupportedByTheBackend() throws Exception {
        for (String fontFamily : new String[] {
                "Noto Nastaliq Urdu", "Noto Sans Devanagari", "DM Sans", "Georgia"
        }) {
            JsonNode document = objectMapper.readTree("""
                    {"type":"doc","content":[{"type":"paragraph","content":[
                      {"type":"text","text":"translation","marks":[
                        {"type":"textStyle","attrs":{"fontFamily":"%s"}}
                      ]}
                    ]}]}
                    """.formatted(fontFamily));

            assertEquals(fontFamily, TiptapDocumentValidator.validate(document).document()
                    .at("/content/0/content/0/marks/0/attrs/fontFamily").asText());
        }
    }

    @Test
    void rejectsUnsupportedNodesMarksAttributesAndUnsafeMarkup() throws Exception {
        assertInvalid("{\"type\":\"doc\",\"content\":[{\"type\":\"image\"}]}");
        assertInvalid(
                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"word\",\"marks\":[{\"type\":\"link\"}]}]}]}");
        assertInvalid(
                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"word\",\"marks\":[{\"type\":\"textStyle\",\"attrs\":{\"fontFamily\":\"Comic Sans\"}}]}]}]}");
        assertInvalid(
                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"word\",\"marks\":[{\"type\":\"textStyle\",\"attrs\":{\"color\":\"red\"}}]}]}]}");
        assertInvalid(
                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"<script>alert(1)</script>\"}]}]}");
    }

    @Test
    void rejectsEmptyAndOversizedDocuments() throws Exception {
        assertInvalid("{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[]}]}");
        String large = objectMapper.writeValueAsString("x".repeat(TiptapDocumentValidator.MAX_DOCUMENT_BYTES));
        assertThrows(InvalidTiptapDocumentException.class, () -> TiptapDocumentValidator.validate(
                objectMapper.createObjectNode().put("type", "doc").set("content", objectMapper.createArrayNode()
                        .add(objectMapper.createObjectNode().put("type", "paragraph").set("content",
                                objectMapper.createArrayNode().add(objectMapper.createObjectNode()
                                        .put("type", "text").set("text", objectMapper.readTree(large))))))));
    }

    private void assertInvalid(String json) throws Exception {
        assertThrows(InvalidTiptapDocumentException.class,
                () -> TiptapDocumentValidator.validate(objectMapper.readTree(json)));
    }
}