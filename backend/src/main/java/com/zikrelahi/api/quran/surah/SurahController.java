package com.zikrelahi.api.quran.surah;

import com.zikrelahi.api.common.ApiResponse;
import com.zikrelahi.api.quran.ayah.AyahService;
import com.zikrelahi.api.quran.ayah.PublicAyahDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/quran/surahs")
@RequiredArgsConstructor
public class SurahController {

    private final SurahService surahService;
    private final AyahService ayahService;

    /**
     * GET /api/v1/quran/surahs
     * GET /api/v1/quran/surahs?revelation=Makki
     * GET /api/v1/quran/surahs?revelation=Madani
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<SurahDto>>> listSurahs(
            @RequestParam(required = false) String revelation) {

        RevelationType filter = null;
        if (revelation != null && !revelation.isBlank()) {
            try {
                filter = RevelationType.valueOf(revelation);
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body(
                        ApiResponse.error("INVALID_PARAMETER",
                                "revelation must be 'Makki' or 'Madani'."));
            }
        }

        List<SurahDto> surahs = surahService.listPublished(filter);
        return ResponseEntity.ok(ApiResponse.ok(surahs));
    }

    /**
     * GET /api/v1/quran/surahs/{number}
     */
    @GetMapping("/{number}")
    public ResponseEntity<ApiResponse<SurahDto>> getSurah(
            @PathVariable int number) {
        SurahDto surah = surahService.getPublished(number);
        return ResponseEntity.ok(ApiResponse.ok(surah));
    }

    /**
     * GET /api/v1/quran/surahs/{number}/ayahs?translation=en
     * Returns every published Ayah for a published Surah. The requested translation
     * is null when no published translation exists for that Ayah.
     */
    @GetMapping("/{number}/ayahs")
    public ResponseEntity<ApiResponse<List<PublicAyahDto>>> getSurahAyahs(
            @PathVariable int number,
            @RequestParam(defaultValue = "en") String translation) {
        List<PublicAyahDto> ayahs = ayahService.listPublishedWithTranslation(number, translation);
        return ResponseEntity.ok(ApiResponse.ok(ayahs));
    }
}
