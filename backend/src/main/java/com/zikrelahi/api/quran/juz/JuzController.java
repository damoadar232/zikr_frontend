package com.zikrelahi.api.quran.juz;

import com.zikrelahi.api.common.ApiResponse;
import com.zikrelahi.api.quran.ayah.PublicAyahDto;
import com.zikrelahi.api.quran.ayah.PublicAyahTranslationDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/quran/juz")
@RequiredArgsConstructor
public class JuzController {

    private final JuzService juzService;

    /**
     * GET /api/v1/quran/juz
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<JuzDto>>> listJuz() {
        return ResponseEntity.ok(ApiResponse.ok(juzService.listAll()));
    }

    /**
     * GET /api/v1/quran/juz/{number}
     */
    @GetMapping("/{number}")
    public ResponseEntity<ApiResponse<JuzDto>> getJuz(
            @PathVariable int number) {
        return ResponseEntity.ok(ApiResponse.ok(juzService.getOne(number)));
    }

    /**
     * GET /api/v1/quran/juz/{number}/ayahs?translation=en
     */
    @GetMapping("/{number}/ayahs")
    public ResponseEntity<ApiResponse<List<PublicAyahDto>>> getJuzAyahs(
            @PathVariable int number,
            @RequestParam(defaultValue = "en") String translation) {
        return ResponseEntity.ok(ApiResponse.ok(
                juzService.listPublishedAyahs(number, translation)));
    }

    /**
     * GET /api/v1/quran/juz/{number}/translations?languages=en&languages=ur
     */
    @GetMapping("/{number}/translations")
    public ResponseEntity<ApiResponse<List<PublicAyahTranslationDto>>> getJuzTranslations(
            @PathVariable int number,
            @RequestParam(required = false) List<String> languages) {
        return ResponseEntity.ok(ApiResponse.ok(
                juzService.listPublishedTranslations(number, languages)));
    }
}
