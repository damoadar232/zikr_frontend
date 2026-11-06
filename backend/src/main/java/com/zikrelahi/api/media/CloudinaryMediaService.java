package com.zikrelahi.api.media;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryMediaService {

    private static final String AUDIO_FOLDER = "zikr-e-ilahi/audio";
    private static final String COVER_FOLDER = "zikr-e-ilahi/audio-covers";
    private static final String ARTIST_PROFILE_FOLDER = "zikr-e-ilahi/artist-profiles";
    private static final String EBOOK_COVER_FOLDER = "zikr-e-ilahi/ebook-covers";
    private static final String EBOOK_FOLDER = "zikr-e-ilahi/ebooks";
    private static final String AUDIO_RESOURCE_TYPE = "video";
    private static final String IMAGE_RESOURCE_TYPE = "image";
    private static final String UPLOAD_DELIVERY_TYPE = "upload";
    private static final String AUTHENTICATED_DELIVERY_TYPE = "authenticated";
    private static final Duration EBOOK_DOWNLOAD_URL_TTL = Duration.ofMinutes(5);

    private final Cloudinary cloudinary;
    private final CloudinaryProperties cloudinaryProperties;
    private final MediaFileValidator fileValidator;

    public MediaUploadResult uploadAudio(MultipartFile upload) {
        return upload(upload, true);
    }

    public MediaUploadResult uploadCoverImage(MultipartFile upload) {
        return upload(upload, false, COVER_FOLDER);
    }

    public MediaUploadResult uploadArtistProfileImage(MultipartFile upload) {
        return upload(upload, false, ARTIST_PROFILE_FOLDER);
    }

    public void deleteAudio(String publicId) {
        deleteAsset(publicId, AUDIO_RESOURCE_TYPE);
    }

    public void deleteCoverImage(String publicId) {
        deleteAsset(publicId, "image");
    }

    public void deleteArtistProfileImage(String publicId) {
        deleteAsset(publicId, IMAGE_RESOURCE_TYPE, UPLOAD_DELIVERY_TYPE);
    }

    public MediaUploadResult uploadEbookCoverImage(MultipartFile upload) {
        return uploadEbookMedia(upload, false);
    }

    public MediaUploadResult uploadEbookPdf(MultipartFile upload) {
        return uploadEbookMedia(upload, true);
    }

    public void deleteEbookCoverImage(String publicId) {
        deleteAsset(publicId, IMAGE_RESOURCE_TYPE, UPLOAD_DELIVERY_TYPE);
    }

    public void deleteEbookPdf(String publicId) {
        deleteAsset(publicId, IMAGE_RESOURCE_TYPE, AUTHENTICATED_DELIVERY_TYPE);
    }

    public String createEbookPdfDownloadUrl(String publicId) {
        return createEbookPdfDownloadLink(publicId).url();
    }

    public SignedMediaUrl createEbookPdfDownloadLink(String publicId) {
        return createEbookPdfDeliveryUrl(publicId, true, null);
    }

    public SignedMediaUrl createEbookPdfDownloadLink(String publicId, String originalFilename) {
        return createEbookPdfDeliveryUrl(publicId, true, originalFilename);
    }

    public SignedMediaUrl createEbookPdfReadUrl(String publicId) {
        return createEbookPdfDeliveryUrl(publicId, false, null);
    }

    private SignedMediaUrl createEbookPdfDeliveryUrl(
            String publicId,
            boolean attachment,
            String originalFilename) {
        ensureConfigured();
        if (publicId == null || publicId.isBlank()) {
            throw new IllegalArgumentException("An ebook PDF public ID is required.");
        }
        try {
            Instant expiresAt = Instant.now().plus(EBOOK_DOWNLOAD_URL_TTL).truncatedTo(ChronoUnit.SECONDS);
            Object attachmentOption = attachment
                    ? safeAttachmentFilename(originalFilename)
                    : false;
            String url = cloudinary.privateDownload(
                    publicId,
                    "pdf",
                    ObjectUtils.asMap(
                            "resource_type", IMAGE_RESOURCE_TYPE,
                            "type", AUTHENTICATED_DELIVERY_TYPE,
                            "expires_at", expiresAt.getEpochSecond(),
                            "attachment", attachmentOption));
            if (url == null || !url.startsWith("https://")) {
                throw new MediaStorageException("A secure ebook download URL could not be generated.");
            }
            return new SignedMediaUrl(url, expiresAt);
        } catch (MediaStorageException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new MediaStorageException("A secure ebook download URL could not be generated.");
        }
    }

    private String safeAttachmentFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "ebook.pdf";
        }
        String baseName = filename.replace('\\', '/');
        baseName = baseName.substring(baseName.lastIndexOf('/') + 1);
        return baseName.replaceAll("[\\p{Cntrl}\"\\\\]", "_");
    }

    private MediaUploadResult uploadEbookMedia(MultipartFile upload, boolean pdf) {
        ensureConfigured();
        MediaFileValidator.ValidatedFile validatedFile;
        try {
            validatedFile = pdf ? fileValidator.validateEbookBook(upload) : fileValidator.validateEbookCover(upload);
        } catch (MediaValidationException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new MediaStorageException("The ebook media file could not be read for upload.");
        }

        String publicId = null;
        try {
            String folder = pdf ? EBOOK_FOLDER : EBOOK_COVER_FOLDER;
            String deliveryType = pdf ? AUTHENTICATED_DELIVERY_TYPE : UPLOAD_DELIVERY_TYPE;
            Map<?, ?> response = cloudinary.uploader().upload(
                    validatedFile.path().toFile(),
                    ObjectUtils.asMap(
                            "resource_type", IMAGE_RESOURCE_TYPE,
                            "type", deliveryType,
                            "folder", folder,
                            "use_filename", false,
                            "unique_filename", true,
                            "overwrite", false));
            publicId = stringValue(response.get("public_id"));
            String secureUrl = stringValue(response.get("secure_url"));
            String format = stringValue(response.get("format"));
            long bytes = numberValue(response.get("bytes"));
            String responseType = stringValue(response.get("type"));
            String responseResourceType = stringValue(response.get("resource_type"));
            String expectedFormat = pdf ? "pdf" : expectedImageFormat(validatedFile.detectedMimeType());

            if (secureUrl == null || !secureUrl.startsWith("https://")
                    || publicId == null || publicId.isBlank()
                    || format == null || !format.equalsIgnoreCase(expectedFormat)
                    || bytes <= 0 || bytes != validatedFile.sizeBytes()
                    || !IMAGE_RESOURCE_TYPE.equals(responseResourceType)
                    || !deliveryType.equals(responseType)
                    || (pdf && !secureUrl.contains("/image/authenticated/"))) {
                throw new MediaValidationException(
                        "Cloudinary did not confirm the expected ebook media upload.");
            }
            return new MediaUploadResult(
                    secureUrl,
                    publicId,
                    format.toLowerCase(Locale.ROOT),
                    bytes,
                    validatedFile.originalFilename(),
                    null);
        } catch (MediaValidationException exception) {
            deleteAfterFailedEbookUpload(publicId, pdf);
            throw exception;
        } catch (Exception exception) {
            deleteAfterFailedEbookUpload(publicId, pdf);
            throw new MediaStorageException("The ebook media upload could not be completed.");
        } finally {
            deleteTemporaryFile(validatedFile.path());
        }
    }

    private String expectedImageFormat(String detectedMimeType) {
        return switch (detectedMimeType) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "";
        };
    }

    private MediaUploadResult upload(MultipartFile upload, boolean audio) {
        return upload(upload, audio, audio ? AUDIO_FOLDER : COVER_FOLDER);
    }

    private MediaUploadResult upload(MultipartFile upload, boolean audio, String folder) {
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

    private void deleteAsset(String publicId, String resourceType, String deliveryType) {
        ensureConfigured();
        if (publicId == null || publicId.isBlank()) {
            return;
        }
        try {
            cloudinary.uploader().destroy(
                    publicId,
                    ObjectUtils.asMap(
                            "resource_type", resourceType,
                            "type", deliveryType,
                            "invalidate", true));
        } catch (Exception exception) {
            throw new MediaStorageException("The Cloudinary asset could not be deleted.");
        }
    }

    private void deleteAfterFailedEbookUpload(String publicId, boolean pdf) {
        if (publicId == null || publicId.isBlank()) {
            return;
        }
        try {
            if (pdf) {
                deleteEbookPdf(publicId);
            } else {
                deleteEbookCoverImage(publicId);
            }
        } catch (RuntimeException exception) {
            log.warn("Cleanup of an incomplete ebook media upload failed.");
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
