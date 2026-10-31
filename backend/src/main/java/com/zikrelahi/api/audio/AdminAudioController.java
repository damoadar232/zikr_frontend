package com.zikrelahi.api.audio;

import com.zikrelahi.api.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@Validated
@RequestMapping("/api/admin/audios")
@RequiredArgsConstructor
public class AdminAudioController {

    private final AdminAudioService audioService;

    @GetMapping
    public ResponseEntity<ApiResponse<AudioDtos.PageSlice<AudioDtos.AudioDetailsDto>>> list(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String languageCode,
            @RequestParam(required = false) String categoryKey,
            @RequestParam(defaultValue = "updatedAt") String sort,
            @RequestParam(defaultValue = "DESC") String direction) {
        return ResponseEntity.ok(ApiResponse.ok(audioService.list(
                page, size, query, status, languageCode, categoryKey, sort, direction)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AudioDtos.AudioDetailsDto>> get(@PathVariable @Min(1) Long id) {
        return ResponseEntity.ok(ApiResponse.ok(audioService.get(id)));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AudioDtos.AudioDetailsDto>> create(
            @Valid @RequestPart("data") AudioDtos.AudioRequest request,
            @RequestPart("audioFile") MultipartFile audioFile,
            @RequestPart("coverImage") MultipartFile coverImage) {
        AudioDtos.AudioDetailsDto created = audioService.create(request, audioFile, coverImage);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AudioDtos.AudioDetailsDto>> update(
            @PathVariable @Min(1) Long id,
            @Valid @RequestPart("data") AudioDtos.AudioRequest request,
            @RequestPart(value = "audioFile", required = false) MultipartFile audioFile,
            @RequestPart(value = "coverImage", required = false) MultipartFile coverImage) {
        return ResponseEntity.ok(ApiResponse.ok(audioService.update(id, request, audioFile, coverImage)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<AudioDtos.AudioDetailsDto>> updateStatus(
            @PathVariable @Min(1) Long id,
            @Valid @RequestBody AudioDtos.StatusRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(audioService.updateStatus(id, request.status())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable @Min(1) Long id) {
        audioService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
