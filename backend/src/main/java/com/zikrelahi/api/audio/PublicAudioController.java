package com.zikrelahi.api.audio;

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

import java.util.List;
import java.util.Set;

@RestController
@Validated
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicAudioController {

    private static final Set<String> SORT_FIELDS =
            Set.of("title", "publishedDate", "createdAt", "updatedAt", "id");

    private final PublicAudioService audioService;

    @GetMapping("/audios")
    public ResponseEntity<ApiResponse<PublicAudioDtos.PageSlice<PublicAudioDtos.AudioDto>>> list(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String categoryKey,
            @RequestParam(required = false) String languageCode,
            @RequestParam(defaultValue = "publishedDate") String sort,
            @RequestParam(defaultValue = "DESC") String direction) {
        String sortField = sort == null || sort.isBlank() ? "publishedDate" : sort.trim();
        if (!SORT_FIELDS.contains(sortField)) {
            throw new IllegalArgumentException(
                    "Sort must be one of title, publishedDate, createdAt, updatedAt, or id.");
        }
        Sort.Direction sortDirection;
        try {
            sortDirection = Sort.Direction.fromString(
                    direction == null || direction.isBlank() ? "DESC" : direction.trim());
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Sort direction must be ASC or DESC.");
        }
        return ResponseEntity.ok(ApiResponse.ok(audioService.list(
                query,
                languageCode,
                categoryKey,
                PageRequest.of(page, size, Sort.by(sortDirection, sortField)))));
    }

    @GetMapping("/audios/{id}")
    public ResponseEntity<ApiResponse<PublicAudioDtos.AudioDto>> get(@PathVariable @Min(1) Long id) {
        return ResponseEntity.ok(ApiResponse.ok(audioService.get(id)));
    }

    @GetMapping("/audio-categories")
    public ResponseEntity<ApiResponse<List<PublicAudioDtos.CategoryDto>>> categories() {
        return ResponseEntity.ok(ApiResponse.ok(audioService.categories()));
    }
}
