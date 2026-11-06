package com.zikrelahi.api.artists;

import com.zikrelahi.api.media.CloudinaryMediaService;
import com.zikrelahi.api.media.MediaUploadResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArtistProfileImageService {

    private final AdminArtistService artistService;
    private final CloudinaryMediaService mediaService;

    public ArtistDtos.AdminArtistDto upload(String artistId, MultipartFile profileImageFile) {
        artistService.get(artistId);
        MediaUploadResult uploadedImage = mediaService.uploadArtistProfileImage(profileImageFile);
        AdminArtistService.ProfileImageChange change;
        try {
            change = artistService.updateProfileImage(artistId, uploadedImage);
        } catch (RuntimeException exception) {
            safelyDelete(uploadedImage.publicId(), "Failed cleanup of a newly uploaded Artist profile image.");
            throw exception;
        }

        deleteReplacedImage(change.previousPublicId(), uploadedImage.publicId());
        return change.artist();
    }

    public ArtistDtos.AdminArtistDto remove(String artistId) {
        AdminArtistService.ProfileImageChange change = artistService.removeProfileImage(artistId);
        safelyDelete(change.previousPublicId(), "Post-commit Artist profile image cleanup failed.");
        return change.artist();
    }

    private void deleteReplacedImage(String previousPublicId, String replacementPublicId) {
        if (previousPublicId == null || previousPublicId.isBlank()
                || previousPublicId.equals(replacementPublicId)) {
            return;
        }
        safelyDelete(previousPublicId, "Post-commit Artist profile image cleanup failed.");
    }

    private void safelyDelete(String publicId, String warning) {
        if (publicId == null || publicId.isBlank()) {
            return;
        }
        try {
            mediaService.deleteArtistProfileImage(publicId);
        } catch (RuntimeException exception) {
            log.warn(warning);
        }
    }
}
