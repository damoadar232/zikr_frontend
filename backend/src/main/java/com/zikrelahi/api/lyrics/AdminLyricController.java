package com.zikrelahi.api.lyrics;

import com.fasterxml.jackson.databind.JsonNode;
import com.zikrelahi.api.admin.AdminUser;
import com.zikrelahi.api.common.ApiResponse;
import com.zikrelahi.api.lyrics.LyricDtos.AdminLyricDto;
import com.zikrelahi.api.lyrics.LyricDtos.LanguageVersionRequest;
import com.zikrelahi.api.lyrics.LyricDtos.PageSlice;
import com.zikrelahi.api.lyrics.LyricDtos.RevisionDto;
import com.zikrelahi.api.security.AdminUserDetails;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static com.zikrelahi.api.lyrics.LyricDtos.StatusRequest;

@RestController
@Validated
@RequestMapping("/api/v1/admin/lyrics")
public class AdminLyricController {

    private final AdminLyricService lyricService;

    public AdminLyricController(AdminLyricService lyricService) {
        this.lyricService = lyricService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminLyricDto>> create(
            @RequestBody JsonNode request, Authentication authentication) {
        AdminLyricDto created = lyricService.createRequest(request, currentAdmin(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageSlice<AdminLyricDto>>> list(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String query) {
        return ResponseEntity.ok(ApiResponse.ok(lyricService.list(page, size, status, query)));
    }

    @GetMapping("/{reference}")
    public ResponseEntity<ApiResponse<AdminLyricDto>> get(@PathVariable String reference) {
        return ResponseEntity.ok(ApiResponse.ok(lyricService.get(reference)));
    }

    @PutMapping("/{reference}")
    public ResponseEntity<ApiResponse<AdminLyricDto>> update(
            @PathVariable String reference,
            @RequestBody JsonNode request,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(
                lyricService.updateRequest(reference, request, currentAdmin(authentication))));
    }

    @PutMapping("/{reference}/languages/{languageCode}")
    public ResponseEntity<ApiResponse<AdminLyricDto>> saveLanguage(
            @PathVariable String reference,
            @PathVariable String languageCode,
            @Valid @RequestBody LanguageVersionRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(lyricService.saveLanguage(
                reference, languageCode, request, currentAdmin(authentication))));
    }

    @PatchMapping("/{reference}/status")
    public ResponseEntity<ApiResponse<AdminLyricDto>> setLyricStatus(
            @PathVariable String reference,
            @Valid @RequestBody StatusRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(lyricService.setLyricStatus(
                reference, request.status(), currentAdmin(authentication))));
    }

    @GetMapping("/{reference}/languages/{languageCode}/revisions")
    public ResponseEntity<ApiResponse<List<RevisionDto>>> revisions(
            @PathVariable String reference,
            @PathVariable String languageCode) {
        return ResponseEntity.ok(ApiResponse.ok(lyricService.revisions(reference, languageCode)));
    }

    @DeleteMapping("/{reference}")
    public ResponseEntity<Void> delete(@PathVariable String reference) {
        lyricService.delete(reference);
        return ResponseEntity.noContent().build();
    }

    private static AdminUser currentAdmin(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof AdminUserDetails details) {
            return details.getAdminUser();
        }
        throw new AccessDeniedException("Administrator authentication is required.");
    }
}