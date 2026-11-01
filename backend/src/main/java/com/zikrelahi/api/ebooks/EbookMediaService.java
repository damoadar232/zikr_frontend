package com.zikrelahi.api.ebooks;

import com.zikrelahi.api.media.CloudinaryMediaService;
import com.zikrelahi.api.media.MediaUploadResult;
import com.zikrelahi.api.media.SignedMediaUrl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Slf4j
public class EbookMediaService {

    private final CloudinaryMediaService cloudinaryMediaService;

    public EbookMediaMetadata uploadCoverImage(MultipartFile coverImage) {
        return metadata(cloudinaryMediaService.uploadEbookCoverImage(coverImage));
    }

    public EbookMediaMetadata uploadBookFile(MultipartFile bookFile) {
        return metadata(cloudinaryMediaService.uploadEbookPdf(bookFile));
    }

    public EbookMediaFiles uploadFiles(MultipartFile coverImage, MultipartFile bookFile) {
        EbookMediaMetadata uploadedCover = uploadCoverImage(coverImage);
        try {
            return new EbookMediaFiles(uploadedCover, uploadBookFile(bookFile));
        } catch (RuntimeException exception) {
            safelyDeleteCover(uploadedCover.publicId());
            throw exception;
        }
    }

    public SignedMediaUrl createBookDownloadUrl(String publicId, String originalFilename) {
        return cloudinaryMediaService.createEbookPdfDownloadLink(publicId, originalFilename);
    }

    public SignedMediaUrl createBookReadUrl(String publicId) {
        return cloudinaryMediaService.createEbookPdfReadUrl(publicId);
    }

    public void deleteCoverImage(String publicId) {
        cloudinaryMediaService.deleteEbookCoverImage(publicId);
    }

    public void deleteBookFile(String publicId) {
        cloudinaryMediaService.deleteEbookPdf(publicId);
    }

    public void cleanupUploaded(EbookMediaFiles uploadedFiles) {
        if (uploadedFiles == null) {
            return;
        }
        if (uploadedFiles.coverImage() != null) {
            safelyDeleteCover(uploadedFiles.coverImage().publicId());
        }
        if (uploadedFiles.bookFile() != null) {
            safelyDeleteBook(uploadedFiles.bookFile().publicId());
        }
    }

    public void deleteReplacedMediaAfterCommit(
            String previousCoverPublicId,
            String previousBookPublicId,
            EbookMediaFiles replacements) {
        requireActiveTransaction();

        String newCoverPublicId = replacements == null || replacements.coverImage() == null
                ? null
                : replacements.coverImage().publicId();
        String newBookPublicId = replacements == null || replacements.bookFile() == null
                ? null
                : replacements.bookFile().publicId();

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                if (isReplaced(previousCoverPublicId, newCoverPublicId)) {
                    safelyDeleteCover(previousCoverPublicId);
                }
                if (isReplaced(previousBookPublicId, newBookPublicId)) {
                    safelyDeleteBook(previousBookPublicId);
                }
            }
        });
    }

    public void deleteMediaAfterCommit(String coverPublicId, String bookPublicId) {
        requireActiveTransaction();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                safelyDeleteCover(coverPublicId);
                safelyDeleteBook(bookPublicId);
            }
        });
    }

    private void requireActiveTransaction() {
        if (!TransactionSynchronizationManager.isSynchronizationActive()
                || !TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Ebook media cleanup requires an active transaction.");
        }
    }

    private EbookMediaMetadata metadata(MediaUploadResult result) {
        return new EbookMediaMetadata(
                result.originalFilename(),
                result.secureUrl(),
                result.publicId(),
                result.format(),
                result.sizeBytes());
    }

    private boolean isReplaced(String previousPublicId, String replacementPublicId) {
        return previousPublicId != null && !previousPublicId.isBlank()
                && replacementPublicId != null
                && !previousPublicId.equals(replacementPublicId);
    }

    private void safelyDeleteCover(String publicId) {
        try {
            cloudinaryMediaService.deleteEbookCoverImage(publicId);
        } catch (RuntimeException exception) {
            log.warn("Best-effort cleanup of an ebook cover asset failed.");
        }
    }

    private void safelyDeleteBook(String publicId) {
        try {
            cloudinaryMediaService.deleteEbookPdf(publicId);
        } catch (RuntimeException exception) {
            log.warn("Best-effort cleanup of an ebook PDF asset failed.");
        }
    }
}
