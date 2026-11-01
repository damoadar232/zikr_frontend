package com.zikrelahi.api.ebooks;

import com.zikrelahi.api.common.ApiResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/public/ebooks")
@RequiredArgsConstructor
public class PublicEbookController {

    private final PublicEbookService ebookService;

    @GetMapping(path = {"", "/"})
    public ResponseEntity<ApiResponse<EbookPageResponse>> list(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String categoryKey,
            @RequestParam(required = false) @Min(1) Long authorId,
            @RequestParam(required = false) String languageCode,
            @RequestParam(required = false) String status) {
        Sort sort = Sort.by(Sort.Direction.DESC, "published_date")
                .and(Sort.by(Sort.Direction.DESC, "id"));
        return ResponseEntity.ok(ApiResponse.ok(ebookService.list(
                search,
                categoryKey,
                authorId,
                languageCode,
                status,
                PageRequest.of(page, size, sort))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EbookListItemResponse>> get(@PathVariable @Min(1) Long id) {
        return ResponseEntity.ok(ApiResponse.ok(ebookService.get(id)));
    }

    @GetMapping("/{id}/read")
    public ResponseEntity<ApiResponse<PublicEbookDtos.DeliveryLink>> read(@PathVariable @Min(1) Long id) {
        return ResponseEntity.ok(ApiResponse.ok(ebookService.read(id)));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<ApiResponse<PublicEbookDtos.DeliveryLink>> download(
            @PathVariable @Min(1) Long id) {
        return ResponseEntity.ok(ApiResponse.ok(ebookService.download(id)));
    }
}
