package com.zikrelahi.api.languages;

import com.zikrelahi.api.audio.AudioDtos;
import com.zikrelahi.api.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/languages")
@RequiredArgsConstructor
public class AdminLanguageController {

    private final LanguageRepository languageRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AudioDtos.LanguageDto>>> listActive() {
        return ResponseEntity.ok(ApiResponse.ok(
                languageRepository.findAllByActiveTrueOrderByNameAsc().stream()
                        .map(language -> new AudioDtos.LanguageDto(
                                language.getCode(),
                                language.getName(),
                                language.getNativeName(),
                                language.isActive()))
                        .toList()));
    }
}
