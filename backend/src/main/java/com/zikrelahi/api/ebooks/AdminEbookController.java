package com.zikrelahi.api.ebooks;

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
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@Validated
@RequestMapping("/api/admin/ebooks")
@RequiredArgsConstructor
public class AdminEbookController {

    private final AdminEbookService ebookService;

    @GetMapping
    public ResponseEntity<ApiResponse<EbookPageResponse>> list(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String categoryKey,
            @RequestParam(required = false) @Min(1) Long authorId,
            @RequestParam(required = false) String languageCode,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "publishedDate") String sort,
            @RequestParam(defaultValue = "DESC") String direction) {
        String searchQuery = search != null && !search.isBlank() ? search : query;
        return ResponseEntity.ok(ApiResponse.ok(ebookService.list(
                page, size, searchQuery, categoryKey, authorId, languageCode, status, sort, direction)));
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<EbookCategoryResponse>>> categories() {
        return ResponseEntity.ok(ApiResponse.ok(ebookService.activeCategories()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EbookResponse>> get(@PathVariable @Min(1) Long id) {
        return ResponseEntity.ok(ApiResponse.ok(ebookService.get(id)));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<EbookResponse>> create(
            @Valid @RequestPart("data") CreateEbookRequest request,
            @RequestPart("coverImage") MultipartFile coverImage,
            @RequestPart("bookFile") MultipartFile bookFile) {
        EbookResponse created = ebookService.create(request, coverImage, bookFile);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<EbookResponse>> update(
            @PathVariable @Min(1) Long id,
            @Valid @RequestPart("data") UpdateEbookRequest request,
            @RequestPart(value = "coverImage", required = false) MultipartFile coverImage,
            @RequestPart(value = "bookFile", required = false) MultipartFile bookFile) {
        return ResponseEntity.ok(ApiResponse.ok(ebookService.update(id, request, coverImage, bookFile)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<EbookResponse>> updateStatus(
            @PathVariable @Min(1) Long id,
            @Valid @RequestBody UpdateEbookStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(ebookService.updateStatus(id, request.status())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable @Min(1) Long id) {
        ebookService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
