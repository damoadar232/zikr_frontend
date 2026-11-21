package com.zikrelahi.api.lyrics;

import com.zikrelahi.api.common.ApiResponse;
import com.zikrelahi.api.lyrics.LyricDtos.PublicPageSlice;
import com.zikrelahi.api.lyrics.LyricDtos.PublicSubjectDto;
import com.zikrelahi.api.lyrics.LyricDtos.PublicLyricDto;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/lyrics")
public class PublicLyricController {

    private final PublicLyricService lyricService;

    public PublicLyricController(PublicLyricService lyricService) {
        this.lyricService = lyricService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PublicPageSlice<PublicLyricDto>>> list(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "false") boolean mainListing,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String reciter,
            @RequestParam(required = false) @Min(1) Long reciterId,
            @RequestParam(required = false) String poet,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) @Size(max = 250) String query,
            @RequestParam(required = false) String letter) {
        return ResponseEntity.ok(ApiResponse.ok(
                lyricService.list(page, size, mainListing, category, reciter, reciterId,
                        poet, language, query, letter)));
    }

    @GetMapping("/subjects")
    public ResponseEntity<ApiResponse<List<PublicSubjectDto>>> listAvailableSubjects() {
        return ResponseEntity.ok(ApiResponse.ok(lyricService.listAvailableSubjects()));
    }

    @GetMapping("/subjects/page")
    public ResponseEntity<ApiResponse<PublicPageSlice<PublicSubjectDto>>> listAvailableSubjectsPage(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "18") @Min(1) @Max(18) int size,
            @RequestParam(required = false) String letter,
            @RequestParam(required = false) @Size(max = 250) String query) {
        return ResponseEntity.ok(ApiResponse.ok(lyricService.listAvailableSubjectsPage(page, size, letter, query)));
    }

    @GetMapping("/{reference}")
    public ResponseEntity<ApiResponse<PublicLyricDto>> get(@PathVariable String reference) {
        return ResponseEntity.ok(ApiResponse.ok(lyricService.get(reference)));
    }
}