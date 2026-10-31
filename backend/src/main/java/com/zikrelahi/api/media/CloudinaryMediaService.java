package com.zikrelahi.api.media;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryMediaService {

    private static final String AUDIO_FOLDER = "zikr-e-ilahi/audio";
    private static final String COVER_FOLDER = "zikr-e-ilahi/audio-covers";
    private static final String AUDIO_RESOURCE_TYPE = "video";

    private final Cloudinary cloudinary;
    private final CloudinaryProperties cloudinaryProperties;
    private final MediaFileValidator fileValidator;

    public MediaUploadResult uploadAudio(MultipartFile upload) {
        return upload(upload, true);
    }

    public MediaUploadResult uploadCoverImage(MultipartFile upload) {
        return upload(upload, false);
    }

    public void deleteAudio(String publicId) {
        deleteAsset(publicId, AUDIO_RESOURCE_TYPE);
    }

    public void deleteCoverImage(String publicId) {
        deleteAsset(publicId, "image");
    }

    private MediaUploadResult upload(MultipartFile upload, boolean audio) {
        ensureConfigured();

        MediaFileValidator.ValidatedFile validatedFile;
        try {
            validatedFile = audio
                    ? fileValidator.validateAudio(upload)
                    : fileValidator.validateCover(upload);
        } catch (MediaValidationException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new MediaStorageException("The media file could not be read for upload.");
        }

        Map<?, ?> response = null;
        String publicId = null;
        try {
            String resourceType = audio ? AUDIO_RESOURCE_TYPE : "image";
            String folder = audio ? AUDIO_FOLDER : COVER_FOLDER;
            response = cloudinary.uploader().upload(
                    validatedFile.path().toFile(),
                    ObjectUtils.asMap(
                            "resource_type", resourceType,
                            "folder", folder,
                            "use_filename", false,
                            "unique_filename", true,
                            "overwrite", false));
            publicId = stringValue(response.get("public_id"));
            return uploadResult(response, publicId, validatedFile, audio);
        } catch (MediaValidationException exception) {
            deleteAfterFailedUpload(publicId, audio);
            throw exception;
        } catch (Exception exception) {
            deleteAfterFailedUpload(publicId, audio);
            throw new MediaStorageException("The media upload could not be completed.");
        } finally {
            deleteTemporaryFile(validatedFile.path());
        }
    }

    private MediaUploadResult uploadResult(
            Map<?, ?> response,
            String publicId,
            MediaFileValidator.ValidatedFile file,
            boolean audio) {
        String secureUrl = stringValue(response.get("secure_url"));
        String format = stringValue(response.get("format"));
        long bytes = numberValue(response.get("bytes"));
        Integer durationSeconds = audio ? durationSeconds(response.get("duration")) : null;

        if (secureUrl == null || !secureUrl.startsWith("https://")
                || publicId == null || publicId.isBlank()
                || format == null || format.isBlank()
                || bytes <= 0
                || !isExpectedFormat(format, file.detectedMimeType(), audio)
                || (audio && durationSeconds == null)) {
            throw new MediaValidationException(
                    "Cloudinary did not confirm a complete, supported media upload.");
        }
        return new MediaUploadResult(
                secureUrl,
                publicId,
                format.toLowerCase(Locale.ROOT),
                bytes,
                file.originalFilename(),
                durationSeconds);
    }

    private boolean isExpectedFormat(String format, String detectedMimeType, boolean audio) {
        String normalized = format.toLowerCase(Locale.ROOT);
        if (audio) {
            return switch (detectedMimeType) {
                case "audio/mpeg" -> normalized.equals("mp3");
                case "audio/wav" -> normalized.equals("wav");
                case "audio/mp4" -> normalized.equals("m4a") || normalized.equals("mp4");
                default -> false;
            };
        }
        return switch (detectedMimeType) {
            case "image/jpeg" -> normalized.equals("jpg") || normalized.equals("jpeg");
            case "image/png" -> normalized.equals("png");
            case "image/webp" -> normalized.equals("webp");
            default -> false;
        };
    }

    private Integer durationSeconds(Object value) {
        if (!(value instanceof Number number)) {
            return null;
        }
        double duration = number.doubleValue();
        if (!Double.isFinite(duration) || duration <= 0 || duration > Integer.MAX_VALUE) {
            return null;
        }
        return (int) Math.ceil(duration);
    }

    private long numberValue(Object value) {
        return value instanceof Number number ? number.longValue() : -1;
    }

    private String stringValue(Object value) {
        return value instanceof String string ? string : null;
    }

    private void ensureConfigured() {
        if (!cloudinaryProperties.isConfigured()) {
            throw new MediaConfigurationException(
                    "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, "
                            + "CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
        }
    }

    private void deleteAsset(String publicId, String resourceType) {
        ensureConfigured();
        if (publicId == null || publicId.isBlank()) {
            return;
        }
        try {
            cloudinary.uploader().destroy(
                    publicId,
                    ObjectUtils.asMap("resource_type", resourceType, "invalidate", true));
        } catch (Exception exception) {
            throw new MediaStorageException("The Cloudinary asset could not be deleted.");
        }
    }

    private void deleteAfterFailedUpload(String publicId, boolean audio) {
        if (publicId == null || publicId.isBlank()) {
            return;
        }
        try {
            cloudinary.uploader().destroy(
                    publicId,
                    ObjectUtils.asMap(
                            "resource_type", audio ? AUDIO_RESOURCE_TYPE : "image",
                            "invalidate", true));
        } catch (Exception exception) {
            log.warn("Cleanup of an incomplete Cloudinary upload failed.");
        }
    }

    private void deleteTemporaryFile(java.nio.file.Path file) {
        try {
            Files.deleteIfExists(file);
        } catch (IOException exception) {
            log.warn("Cleanup of a temporary media upload file failed.");
        }
    }
}
