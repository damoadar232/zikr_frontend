package com.zikrelahi.api.media;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;

@Component
@Slf4j
class MediaFileValidator {

    private static final Set<String> AUDIO_EXTENSIONS = Set.of("mp3", "wav", "m4a");
    private static final Set<String> COVER_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final long MAX_IMAGE_PIXELS = 40_000_000L;

    private final MediaUploadProperties properties;

    MediaFileValidator(MediaUploadProperties properties) {
        this.properties = properties;
    }

    ValidatedFile validateAudio(MultipartFile upload) throws IOException {
        return validate(upload, properties.getAudioMaxFileSize(), AUDIO_EXTENSIONS, MediaKind.AUDIO);
    }

    ValidatedFile validateCover(MultipartFile upload) throws IOException {
        return validate(upload, properties.getCoverMaxFileSize(), COVER_EXTENSIONS, MediaKind.IMAGE);
    }

    private ValidatedFile validate(
            MultipartFile upload,
            DataSize maximumSize,
            Set<String> allowedExtensions,
            MediaKind kind) throws IOException {
        if (upload == null || upload.isEmpty() || upload.getSize() <= 0) {
            throw new MediaValidationException("A non-empty " + kind.label + " file is required.");
        }
        if (upload.getSize() > maximumSize.toBytes()) {
            throw new MediaValidationException(
                    "The " + kind.label + " file exceeds the configured size limit.");
        }

        String originalFilename = safeFilename(upload.getOriginalFilename());
        String extension = extensionOf(originalFilename);
        if (!allowedExtensions.contains(extension)) {
            throw new MediaValidationException(
                    "Unsupported " + kind.label + " format. Allowed formats: " + kind.allowedFormats + ".");
        }

        Path temporaryFile = Files.createTempFile("zikr-media-validation-", "." + extension);
        try {
            try (var input = upload.getInputStream()) {
                Files.copy(input, temporaryFile, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            }
            long actualSize = Files.size(temporaryFile);
            if (actualSize == 0) {
                throw new MediaValidationException("The " + kind.label + " file is empty.");
            }
            if (actualSize > maximumSize.toBytes()) {
                throw new MediaValidationException(
                        "The " + kind.label + " file exceeds the configured size limit.");
            }

            String detectedFormat = kind == MediaKind.AUDIO
                    ? validateAudioContent(temporaryFile, extension)
                    : validateImageContent(temporaryFile, extension);
            validateProvidedContentType(upload.getContentType(), detectedFormat, kind);
            return new ValidatedFile(temporaryFile, actualSize, originalFilename, detectedFormat);
        } catch (IOException | RuntimeException exception) {
            try {
                Files.deleteIfExists(temporaryFile);
            } catch (IOException cleanupException) {
                log.warn("Cleanup of an invalid temporary media file failed.");
            }
            throw exception;
        }
    }

    private String validateAudioContent(Path file, String extension) throws IOException {
        return switch (extension) {
            case "mp3" -> {
                if (!hasMp3Frame(file)) {
                    throw new MediaValidationException("The file content is not a valid MP3 audio stream.");
                }
                yield "audio/mpeg";
            }
            case "wav" -> {
                if (!isValidWav(file)) {
                    throw new MediaValidationException("The file content is not a valid WAV audio stream.");
                }
                yield "audio/wav";
            }
            case "m4a" -> {
                if (!hasM4aContainer(readHeader(file, 32))) {
                    throw new MediaValidationException("The file content is not a valid M4A audio stream.");
                }
                yield "audio/mp4";
            }
            default -> throw new MediaValidationException("Unsupported audio format.");
        };
    }

    private String validateImageContent(Path file, String extension) throws IOException {
        byte[] header = readHeader(file, 32);
        String mimeType = switch (extension) {
            case "jpg", "jpeg" -> startsWith(header, 0xFF, 0xD8, 0xFF) ? "image/jpeg" : null;
            case "png" -> startsWith(header, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
                    ? "image/png"
                    : null;
            case "webp" -> isWebpHeader(file, header) ? "image/webp" : null;
            default -> null;
        };
        if (mimeType == null) {
            throw new MediaValidationException("The file content does not match the selected cover image format.");
        }

        if (!mimeType.equals("image/webp")) {
            validateDecodableImage(file);
        }
        return mimeType;
    }

    private void validateDecodableImage(Path file) throws IOException {
        try (ImageInputStream input = ImageIO.createImageInputStream(file.toFile())) {
            if (input == null) {
                throw new MediaValidationException("The cover image cannot be decoded.");
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw new MediaValidationException("The cover image cannot be decoded.");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width <= 0 || height <= 0 || (long) width * height > MAX_IMAGE_PIXELS) {
                    throw new MediaValidationException("The cover image dimensions are invalid or too large.");
                }
                if (reader.read(0) == null) {
                    throw new MediaValidationException("The cover image cannot be decoded.");
                }
            } catch (RuntimeException exception) {
                if (exception instanceof MediaValidationException) {
                    throw exception;
                }
                throw new MediaValidationException("The cover image cannot be decoded.");
            } catch (IOException exception) {
                throw new MediaValidationException("The cover image cannot be decoded.");
            } finally {
                reader.dispose();
            }
        }
    }

    private void validateProvidedContentType(String providedType, String detectedType, MediaKind kind) {
        if (providedType == null || providedType.isBlank()) {
            return;
        }
        String normalized = providedType.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
        if ("application/octet-stream".equals(normalized)) {
            return;
        }
        boolean matches = kind == MediaKind.AUDIO
                ? switch (detectedType) {
                    case "audio/mpeg" -> Set.of("audio/mpeg", "audio/mp3").contains(normalized);
                    case "audio/wav" -> Set.of("audio/wav", "audio/x-wav", "audio/wave").contains(normalized);
                    case "audio/mp4" -> Set.of("audio/mp4", "audio/x-m4a", "audio/m4a").contains(normalized);
                    default -> false;
                }
                : detectedType.equals(normalized)
                        || (detectedType.equals("image/jpeg") && normalized.equals("image/jpg"));
        if (!matches) {
            throw new MediaValidationException(
                    "The provided MIME type does not match the " + kind.label + " file content.");
        }
    }

    private boolean hasMp3Frame(Path file) throws IOException {
        long offset = 0;
        byte[] id3Header = readHeader(file, 10);
        if (id3Header.length >= 10 && id3Header[0] == 'I' && id3Header[1] == 'D' && id3Header[2] == '3') {
            for (int index = 6; index < 10; index++) {
                if ((id3Header[index] & 0x80) != 0) {
                    return false;
                }
            }
            int tagSize = ((id3Header[6] & 0x7F) << 21)
                    | ((id3Header[7] & 0x7F) << 14)
                    | ((id3Header[8] & 0x7F) << 7)
                    | (id3Header[9] & 0x7F);
            offset = 10L + tagSize + ((id3Header[5] & 0x10) != 0 ? 10 : 0);
        }
        if (offset >= Files.size(file)) {
            return false;
        }

        try (var input = Files.newInputStream(file)) {
            input.skipNBytes(offset);
            byte[] header = input.readNBytes(64 * 1024);
            for (int index = 0; index + 3 < header.length; index++) {
                int first = header[index] & 0xFF;
                int second = header[index + 1] & 0xFF;
                int third = header[index + 2] & 0xFF;
                int fourth = header[index + 3] & 0xFF;
                int layer = (second >> 1) & 0x03;
                int bitrateIndex = (third >> 4) & 0x0F;
                int sampleRateIndex = (third >> 2) & 0x03;
                if (first == 0xFF && (second & 0xE0) == 0xE0
                        && layer != 0 && bitrateIndex != 0 && bitrateIndex != 0x0F
                        && sampleRateIndex != 0x03 && (fourth & 0x03) != 0x02) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean isValidWav(Path file) throws IOException {
        if (Files.size(file) < 44) {
            return false;
        }
        byte[] header = readHeader(file, 12);
        if (!asciiAt(header, 0, "RIFF") || !asciiAt(header, 8, "WAVE")) {
            return false;
        }
        boolean hasFormat = false;
        boolean hasData = false;
        long position = 12;
        long fileSize = Files.size(file);
        try (var input = Files.newInputStream(file)) {
            input.skipNBytes(12);
            while (position + 8 <= fileSize) {
                byte[] chunkHeader = input.readNBytes(8);
                if (chunkHeader.length != 8) {
                    return false;
                }
                long chunkSize = Integer.toUnsignedLong(ByteBuffer.wrap(chunkHeader, 4, 4)
                        .order(ByteOrder.LITTLE_ENDIAN).getInt());
                position += 8;
                String chunk = new String(chunkHeader, 0, 4, java.nio.charset.StandardCharsets.US_ASCII);
                if (chunk.equals("fmt ")) {
                if (chunkSize < 16 || chunkSize + (chunkSize & 1) > fileSize - position) {
                        return false;
                    }
                    byte[] format = input.readNBytes(16);
                    if (format.length != 16) {
                        return false;
                    }
                    int audioFormat = Short.toUnsignedInt(ByteBuffer.wrap(format, 0, 2)
                            .order(ByteOrder.LITTLE_ENDIAN).getShort());
                    int channels = Short.toUnsignedInt(ByteBuffer.wrap(format, 2, 2)
                            .order(ByteOrder.LITTLE_ENDIAN).getShort());
                    long sampleRate = Integer.toUnsignedLong(ByteBuffer.wrap(format, 4, 4)
                            .order(ByteOrder.LITTLE_ENDIAN).getInt());
                    int bitsPerSample = Short.toUnsignedInt(ByteBuffer.wrap(format, 14, 2)
                            .order(ByteOrder.LITTLE_ENDIAN).getShort());
                    if ((audioFormat != 1 && audioFormat != 3 && audioFormat != 0xFFFE)
                            || channels == 0 || sampleRate == 0 || bitsPerSample == 0) {
                        return false;
                    }
                    input.skipNBytes(chunkSize - 16 + (chunkSize & 1));
                    position += chunkSize + (chunkSize & 1);
                    hasFormat = true;
                } else if (chunk.equals("data")) {
                    hasData = chunkSize > 0 && chunkSize <= fileSize - position;
                    break;
                } else {
                    if (chunkSize + (chunkSize & 1) > fileSize - position) {
                        return false;
                    }
                    input.skipNBytes(chunkSize + (chunkSize & 1));
                    position += chunkSize + (chunkSize & 1);
                }
            }
        }
        return hasFormat && hasData;
    }

    private boolean hasM4aContainer(byte[] header) {
        return header.length >= 12 && asciiAt(header, 4, "ftyp")
                && (asciiAt(header, 8, "M4A ") || asciiAt(header, 8, "M4B ")
                        || asciiAt(header, 8, "mp42") || asciiAt(header, 8, "isom")
                        || asciiAt(header, 8, "iso2"));
    }

    private boolean isWebpHeader(Path file, byte[] header) throws IOException {
        return header.length >= 16 && asciiAt(header, 0, "RIFF") && asciiAt(header, 8, "WEBP")
                && Integer.toUnsignedLong(ByteBuffer.wrap(header, 4, 4)
                        .order(ByteOrder.LITTLE_ENDIAN).getInt()) == Files.size(file) - 8
                && (asciiAt(header, 12, "VP8 ") || asciiAt(header, 12, "VP8L")
                        || asciiAt(header, 12, "VP8X"));
    }

    private byte[] readHeader(Path file, int maximumBytes) throws IOException {
        try (var input = Files.newInputStream(file)) {
            return input.readNBytes(maximumBytes);
        }
    }

    private boolean startsWith(byte[] bytes, int... signature) {
        if (bytes.length < signature.length) {
            return false;
        }
        for (int index = 0; index < signature.length; index++) {
            if ((bytes[index] & 0xFF) != signature[index]) {
                return false;
            }
        }
        return true;
    }

    private boolean asciiAt(byte[] bytes, int offset, String value) {
        if (bytes.length < offset + value.length()) {
            return false;
        }
        for (int index = 0; index < value.length(); index++) {
            if ((char) bytes[offset + index] != value.charAt(index)) {
                return false;
            }
        }
        return true;
    }

    private String safeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            throw new MediaValidationException("The uploaded file must have a filename.");
        }
        String baseName = filename.replace('\\', '/');
        baseName = baseName.substring(baseName.lastIndexOf('/') + 1).trim();
        if (baseName.isBlank() || baseName.length() > 255 || baseName.equals(".") || baseName.equals("..")) {
            throw new MediaValidationException("The uploaded filename is invalid.");
        }
        return baseName;
    }

    private String extensionOf(String filename) {
        int separator = filename.lastIndexOf('.');
        if (separator <= 0 || separator == filename.length() - 1) {
            throw new MediaValidationException("The uploaded filename must include a supported extension.");
        }
        return filename.substring(separator + 1).toLowerCase(Locale.ROOT);
    }

    enum MediaKind {
        AUDIO("audio", "MP3, WAV, or M4A"),
        IMAGE("cover image", "JPG, JPEG, PNG, or WEBP");

        private final String label;
        private final String allowedFormats;

        MediaKind(String label, String allowedFormats) {
            this.label = label;
            this.allowedFormats = allowedFormats;
        }
    }

    record ValidatedFile(Path path, long sizeBytes, String originalFilename, String detectedMimeType) {
    }
}
