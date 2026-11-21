package com.zikrelahi.api.artists;

import com.zikrelahi.api.common.ApiResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@Validated
@RequestMapping("/api/v1/artists")
@RequiredArgsConstructor
public class PublicArtistController {

    private final AdminArtistService artistService;

    @GetMapping("/options")
    public ResponseEntity<ApiResponse<List<ArtistDtos.ArtistOptionDto>>> options(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String query) {
        return ResponseEntity.ok(ApiResponse.ok(artistService.options(role, query)));
    }

    @GetMapping("/reciters")
    public ResponseEntity<ApiResponse<ArtistDtos.PageSlice<ArtistDtos.ArtistProfileDto>>> reciters(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "18") @Min(1) @Max(18) int size,
            @RequestParam(required = false) String letter) {
        return ResponseEntity.ok(ApiResponse.ok(artistService.listPublicReciters(page, size, letter)));
    }

    @GetMapping("/poets")
    public ResponseEntity<ApiResponse<ArtistDtos.PageSlice<ArtistDtos.ArtistProfileDto>>> poets(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "18") @Min(1) @Max(18) int size,
            @RequestParam(required = false) String letter) {
        return ResponseEntity.ok(ApiResponse.ok(artistService.listPublicPoets(page, size, letter)));
    }

    @GetMapping("/roles")
    public ResponseEntity<ApiResponse<List<ArtistDtos.RoleDto>>> roles() {
        return ResponseEntity.ok(ApiResponse.ok(artistService.roles()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ArtistDtos.PublicArtistProfileDto>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(artistService.getPublicProfile(id)));
    }
}