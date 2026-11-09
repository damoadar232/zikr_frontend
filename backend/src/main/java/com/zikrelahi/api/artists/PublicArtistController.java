package com.zikrelahi.api.artists;

import com.zikrelahi.api.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
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

    @GetMapping("/roles")
    public ResponseEntity<ApiResponse<List<ArtistDtos.RoleDto>>> roles() {
        return ResponseEntity.ok(ApiResponse.ok(artistService.roles()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ArtistDtos.PublicArtistProfileDto>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(artistService.getPublicProfile(id)));
    }
}