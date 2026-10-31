package com.zikrelahi.api.media;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.unit.DataSize;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MediaFileValidatorTest {

    @Test
    void acceptsSupportedMp3AndRetainsSafeOriginalFilename() throws Exception {
        MediaFileValidator validator = validator(DataSize.ofBytes(1024), DataSize.ofBytes(1024));
        byte[] mp3FrameHeader = { (byte) 0xFF, (byte) 0xFB, (byte) 0x90, 0x64 };
        MockMultipartFile upload = new MockMultipartFile(
                "audioFile",
                "C:\\client\\track.mp3",
                "audio/mpeg",
                mp3FrameHeader);

        MediaFileValidator.ValidatedFile validated = validator.validateAudio(upload);
        try {
            assertEquals("track.mp3", validated.originalFilename());
            assertEquals(mp3FrameHeader.length, validated.sizeBytes());
            assertEquals("audio/mpeg", validated.detectedMimeType());
        } finally {
            java.nio.file.Files.deleteIfExists(validated.path());
        }
    }

    @Test
    void rejectsUnsupportedFormatOversizedFilesAndMismatchedMimeTypes() {
        MediaFileValidator validator = validator(DataSize.ofBytes(16), DataSize.ofBytes(16));
        byte[] frame = { (byte) 0xFF, (byte) 0xFB, (byte) 0x90, 0x64 };

        assertThrows(MediaValidationException.class, () -> validator.validateAudio(
                new MockMultipartFile("audioFile", "track.mp4", "audio/mp4", frame)));
        assertThrows(MediaValidationException.class, () -> validator.validateAudio(
                new MockMultipartFile("audioFile", "track.mp3", "audio/wav", frame)));
        assertThrows(MediaValidationException.class, () -> validator.validateAudio(
                new MockMultipartFile("audioFile", "track.mp3", "audio/mpeg", new byte[17])));
        assertThrows(MediaValidationException.class, () -> validator.validateAudio(
                new MockMultipartFile("audioFile", "track.mp3", "audio/mpeg", new byte[0])));
    }

    @Test
    void acceptsDecodablePngAndRejectsImageContentThatDoesNotMatchItsExtension() throws Exception {
        MediaFileValidator validator = validator(DataSize.ofMegabytes(1), DataSize.ofMegabytes(1));
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB), "png", output);
        MockMultipartFile png = new MockMultipartFile(
                "coverImage", "cover.png", "image/png", output.toByteArray());

        MediaFileValidator.ValidatedFile validated = validator.validateCover(png);
        try {
            assertEquals("cover.png", validated.originalFilename());
            assertEquals("image/png", validated.detectedMimeType());
        } finally {
            java.nio.file.Files.deleteIfExists(validated.path());
        }

        assertThrows(MediaValidationException.class, () -> validator.validateCover(
                new MockMultipartFile("coverImage", "cover.png", "image/png", new byte[] { 1, 2, 3 })));
    }

    private static MediaFileValidator validator(DataSize audioLimit, DataSize coverLimit) {
        MediaUploadProperties properties = new MediaUploadProperties();
        properties.setAudioMaxFileSize(audioLimit);
        properties.setCoverMaxFileSize(coverLimit);
        return new MediaFileValidator(properties);
    }
}
