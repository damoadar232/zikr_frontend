package com.zikrelahi.api.media;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.unit.DataSize;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CloudinaryMediaServiceTest {

    @Test
    void uploadsAudioWithServerSideResourceTypeAndExtractsMetadata() throws Exception {
        Cloudinary cloudinary = mock(Cloudinary.class);
        Uploader uploader = mock(Uploader.class);
        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(), anyMap())).thenReturn(Map.of(
                "secure_url", "https://res.cloudinary.com/test/video/upload/audio.mp3",
                "public_id", "zikr-e-ilahi/audio/audio-id",
                "format", "mp3",
                "bytes", 4096,
                "duration", 41.2));

        CloudinaryMediaService service = service(cloudinary, properties(DataSize.ofMegabytes(1)));
        MediaUploadResult result = service.uploadAudio(new MockMultipartFile(
                "audioFile",
                "client-track.mp3",
                "audio/mpeg",
                new byte[] { (byte) 0xFF, (byte) 0xFB, (byte) 0x90, 0x64 }));

        assertEquals("https://res.cloudinary.com/test/video/upload/audio.mp3", result.secureUrl());
        assertEquals("zikr-e-ilahi/audio/audio-id", result.publicId());
        assertEquals("mp3", result.format());
        assertEquals(4096, result.sizeBytes());
        assertEquals("client-track.mp3", result.originalFilename());
        assertEquals(42, result.durationSeconds());
        verify(uploader).upload(any(), org.mockito.ArgumentMatchers.argThat(options ->
                "video".equals(options.get("resource_type"))
                        && "zikr-e-ilahi/audio".equals(options.get("folder"))));
    }

    @Test
    void uploadsCoverImageToImageResourceAndRejectsOversizedAudioBeforeCloudinary() throws Exception {
        Cloudinary cloudinary = mock(Cloudinary.class);
        Uploader uploader = mock(Uploader.class);
        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(), anyMap())).thenReturn(Map.of(
                "secure_url", "https://res.cloudinary.com/test/image/upload/cover.png",
                "public_id", "zikr-e-ilahi/audio-covers/cover-id",
                "format", "png",
                "bytes", 128));
        CloudinaryMediaService service = service(cloudinary, properties(DataSize.ofBytes(3)));

        ByteArrayOutputStream image = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB), "png", image);
        MediaUploadResult cover = service.uploadCoverImage(new MockMultipartFile(
                "coverImage", "cover.png", "image/png", image.toByteArray()));
        assertEquals("png", cover.format());
        assertEquals("cover.png", cover.originalFilename());
        assertEquals("zikr-e-ilahi/audio-covers/cover-id", cover.publicId());
        verify(uploader).upload(any(), org.mockito.ArgumentMatchers.argThat(options ->
                "image".equals(options.get("resource_type"))
                        && "zikr-e-ilahi/audio-covers".equals(options.get("folder"))));

        assertThrows(MediaValidationException.class, () -> service.uploadAudio(new MockMultipartFile(
                "audioFile",
                "too-large.mp3",
                "audio/mpeg",
                new byte[] { (byte) 0xFF, (byte) 0xFB, (byte) 0x90, 0x64 })));
        verify(uploader, times(1)).upload(any(), anyMap());
    }

    @Test
    void removesCloudinaryAssetWhenUploadMetadataIsIncomplete() throws Exception {
        Cloudinary cloudinary = mock(Cloudinary.class);
        Uploader uploader = mock(Uploader.class);
        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(), anyMap())).thenReturn(Map.of(
                "secure_url", "https://res.cloudinary.com/test/video/upload/audio.mp3",
                "public_id", "zikr-e-ilahi/audio/incomplete",
                "format", "mp3",
                "bytes", 128));
        when(uploader.destroy(any(), anyMap())).thenReturn(Map.of("result", "ok"));

        CloudinaryMediaService service = service(cloudinary, properties(DataSize.ofMegabytes(1)));
        assertThrows(MediaValidationException.class, () -> service.uploadAudio(new MockMultipartFile(
                "audioFile",
                "client-track.mp3",
                "audio/mpeg",
                new byte[] { (byte) 0xFF, (byte) 0xFB, (byte) 0x90, 0x64 })));
        verify(uploader).destroy(
                org.mockito.ArgumentMatchers.eq("zikr-e-ilahi/audio/incomplete"),
                org.mockito.ArgumentMatchers.argThat(options -> "video".equals(options.get("resource_type"))));
    }

    private static CloudinaryMediaService service(Cloudinary cloudinary, MediaUploadProperties mediaProperties) {
        CloudinaryProperties cloudinaryProperties = new CloudinaryProperties();
        cloudinaryProperties.setCloudName("test-cloud");
        cloudinaryProperties.setApiKey("test-key");
        cloudinaryProperties.setApiSecret("test-secret");
        return new CloudinaryMediaService(
                cloudinary,
                cloudinaryProperties,
                new MediaFileValidator(mediaProperties));
    }

    private static MediaUploadProperties properties(DataSize maximumAudioSize) {
        MediaUploadProperties properties = new MediaUploadProperties();
        properties.setAudioMaxFileSize(maximumAudioSize);
        properties.setCoverMaxFileSize(DataSize.ofMegabytes(1));
        return properties;
    }
}
