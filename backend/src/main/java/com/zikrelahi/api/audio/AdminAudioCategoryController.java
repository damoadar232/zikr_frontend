package com.zikrelahi.api.audio;

import com.zikrelahi.api.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/audio-categories")
@RequiredArgsConstructor
public class AdminAudioCategoryController {

    private final AudioCategoryService categoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AudioDtos.CategoryDto>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.listActive()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AudioDtos.CategoryDto>> create(
            @Valid @RequestBody AudioDtos.CategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(categoryService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AudioDtos.CategoryDto>> update(
            @PathVariable String id,
            @Valid @RequestBody AudioDtos.CategoryUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.update(id, request)));
    }
}
