package com.zikrelahi.api.ebooks;

import com.zikrelahi.api.media.SignedMediaUrl;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class PublicEbookService {

    private final EbookPersistenceService persistenceService;
    private final EbookMediaService mediaService;

    @Transactional(readOnly = true)
    public EbookPageResponse list(
            String search,
            String categoryKey,
            Long authorId,
            String languageCode,
            String status,
            Pageable pageable) {
        EbookStatus requestedStatus = parseOptionalStatus(status);
        if (requestedStatus != null && requestedStatus != EbookStatus.PUBLISHED) {
            return new EbookPageResponse(
                    List.of(),
                    pageable.getPageNumber(),
                    pageable.getPageSize(),
                    0,
                    0);
        }
        return persistenceService.listPublished(search, categoryKey, authorId, languageCode, pageable);
    }

    @Transactional(readOnly = true)
    public EbookListItemResponse get(Long id) {
        return persistenceService.getPublished(id);
    }

    @Transactional(readOnly = true)
    public PublicEbookDtos.DeliveryLink read(Long id) {
        EbookPdfAsset asset = persistenceService.getPublishedBookAsset(id);
        SignedMediaUrl signedUrl = mediaService.createBookReadUrl(asset.publicId());
        return new PublicEbookDtos.DeliveryLink(signedUrl.url(), signedUrl.expiresAt());
    }

    @Transactional(readOnly = true)
    public PublicEbookDtos.DeliveryLink download(Long id) {
        EbookPdfAsset asset = persistenceService.getPublishedBookAsset(id);
        SignedMediaUrl signedUrl =
                mediaService.createBookDownloadUrl(asset.publicId(), asset.originalFilename());
        return new PublicEbookDtos.DeliveryLink(signedUrl.url(), signedUrl.expiresAt());
    }

    private EbookStatus parseOptionalStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return EbookStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Status must be DRAFT, PUBLISHED, or INACTIVE.");
        }
    }
}
