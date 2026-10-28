package com.zikrelahi.api.quran.translator;

import com.zikrelahi.api.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/quran/translators")
@RequiredArgsConstructor
public class TranslatorController {

    private final TranslatorService translatorService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PublicTranslatorDto>>> listTranslators(
            @RequestParam(required = false) String language) {
        return ResponseEntity.ok(ApiResponse.ok(
                translatorService.listPublic(language)));
    }
}
