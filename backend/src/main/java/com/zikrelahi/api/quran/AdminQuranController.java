package com.zikrelahi.api.quran;

import com.zikrelahi.api.common.ApiResponse;
import com.zikrelahi.api.common.ContentStatus;
import com.zikrelahi.api.quran.ayah.*;
import com.zikrelahi.api.quran.translation.TranslationDto;
import com.zikrelahi.api.quran.translation.TranslationRequest;
import com.zikrelahi.api.quran.translation.TranslationService;
import com.zikrelahi.api.quran.surah.AdminSurahDto;
import com.zikrelahi.api.quran.surah.SurahService;
import com.zikrelahi.api.quran.surah.SurahUpdateRequest;
import com.zikrelahi.api.quran.translator.TranslatorDto;
import com.zikrelahi.api.quran.translator.TranslatorRequest;
import com.zikrelahi.api.quran.translator.TranslatorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin Quran management — all endpoints require ADMIN or SUPER_ADMIN role
 * (enforced by SecurityConfig: /api/v1/admin/** → hasAnyRole("ADMIN","SUPER_ADMIN")).
 */
@RestController
@RequestMapping("/api/v1/admin/quran")
@RequiredArgsConstructor
public class AdminQuranController {

    private final AyahService ayahService;
    private final TranslationService translationService;
    private final TranslatorService translatorService;
    private final SurahService surahService;

    @GetMapping("/surahs")
    public ResponseEntity<ApiResponse<List<AdminSurahDto>>> listSurahs() {
        return ResponseEntity.ok(ApiResponse.ok(surahService.listAllForAdmin()));
    }

    @GetMapping("/surahs/{number}")
    public ResponseEntity<ApiResponse<AdminSurahDto>> getSurah(@PathVariable int number) {
        return ResponseEntity.ok(ApiResponse.ok(surahService.getForAdmin(number)));
    }

    @PutMapping("/surahs/{number}")
    public ResponseEntity<ApiResponse<AdminSurahDto>> updateSurah(
            @PathVariable int number,
            @Valid @RequestBody SurahUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(surahService.updateForAdmin(number, request)));
    }

    @PatchMapping("/surahs/{number}/status")
    public ResponseEntity<ApiResponse<AdminSurahDto>> patchSurahStatus(
            @PathVariable int number,
            @Valid @RequestBody StatusRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                surahService.updateStatus(number, request.status())));
    }

    // ─── Ayah CRUD ───────────────────────────────────────────────────────────

    /** GET /api/v1/admin/quran/ayahs */
    @GetMapping("/ayahs")
    public ResponseEntity<ApiResponse<List<AyahDto>>> listAyahs(
            @RequestParam(defaultValue = "1") int surah) {
        return ResponseEntity.ok(ApiResponse.ok(ayahService.listBySurah(surah)));
    }

    /** GET /api/v1/admin/quran/ayahs/{surah}/{ayah} */
    @GetMapping("/ayahs/{surah}/{ayah}")
    public ResponseEntity<ApiResponse<AyahDto>> getAyah(
            @PathVariable int surah,
            @PathVariable int ayah) {
        return ResponseEntity.ok(ApiResponse.ok(ayahService.getOne(surah, ayah)));
    }

    /** POST /api/v1/admin/quran/ayahs → 201 */
    @PostMapping("/ayahs")
    public ResponseEntity<ApiResponse<AyahDto>> createAyah(
            @Valid @RequestBody AyahRequest request) {
        AyahDto created = ayahService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    /** PUT /api/v1/admin/quran/ayahs/{surah}/{ayah} — update Arabic text */
    @PutMapping("/ayahs/{surah}/{ayah}")
    public ResponseEntity<ApiResponse<AyahDto>> updateAyah(
            @PathVariable int surah,
            @PathVariable int ayah,
            @Valid @RequestBody AyahRequest request) {
        AyahDto updated = ayahService.update(surah, ayah, request);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    /** PATCH /api/v1/admin/quran/ayahs/{surah}/{ayah}/status */
    @PatchMapping("/ayahs/{surah}/{ayah}/status")
    public ResponseEntity<ApiResponse<AyahDto>> patchAyahStatus(
            @PathVariable int surah,
            @PathVariable int ayah,
            @Valid @RequestBody StatusRequest request) {
        AyahDto updated = ayahService.updateStatus(surah, ayah, request.status());
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    /** DELETE /api/v1/admin/quran/ayahs/{surah}/{ayah} */
    @DeleteMapping("/ayahs/{surah}/{ayah}")
    public ResponseEntity<Void> deleteAyah(
            @PathVariable int surah,
            @PathVariable int ayah) {
        ayahService.delete(surah, ayah);
        return ResponseEntity.noContent().build();
    }

    // ─── Translation endpoints ────────────────────────────────────────────────

    /**
     * PUT /api/v1/admin/quran/ayahs/{surah}/{ayah}/translations/{lang}
     * Creates or replaces the translation for exactly one language.
     * Other languages are never touched.
     */
    @PutMapping("/ayahs/{surah}/{ayah}/translations/{lang}")
    public ResponseEntity<ApiResponse<TranslationDto>> upsertTranslation(
            @PathVariable int surah,
            @PathVariable int ayah,
            @PathVariable String lang,
            @Valid @RequestBody TranslationRequest request) {
        TranslationDto dto = translationService.upsert(surah, ayah, lang, request);
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    @GetMapping("/ayahs/{surah}/{ayah}/translations")
    public ResponseEntity<ApiResponse<List<TranslationDto>>> listTranslations(
            @PathVariable int surah,
            @PathVariable int ayah) {
        return ResponseEntity.ok(ApiResponse.ok(
                translationService.listByAyah(surah, ayah)));
    }

    /**
     * PATCH /api/v1/admin/quran/ayahs/{surah}/{ayah}/translations/{lang}/status
     * Publish or draft a single language translation independently.
     */
    @PatchMapping("/ayahs/{surah}/{ayah}/translations/{lang}/status")
    public ResponseEntity<ApiResponse<TranslationDto>> patchTranslationStatus(
            @PathVariable int surah,
            @PathVariable int ayah,
            @PathVariable String lang,
            @Valid @RequestBody StatusRequest request) {
        TranslationDto dto = translationService.patchStatus(surah, ayah, lang, request.status());
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    // ─── Translator management ────────────────────────────────────────────────

    /** GET /api/v1/admin/quran/translators */
    @GetMapping("/translators")
    public ResponseEntity<ApiResponse<List<TranslatorDto>>> listTranslators(
            @RequestParam(required = false) String language) {
        return ResponseEntity.ok(ApiResponse.ok(translatorService.listAll(language)));
    }

    /** POST /api/v1/admin/quran/translators → 201 */
    @PostMapping("/translators")
    public ResponseEntity<ApiResponse<TranslatorDto>> createTranslator(
            @Valid @RequestBody TranslatorRequest request) {
        TranslatorDto created = translatorService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }
}
