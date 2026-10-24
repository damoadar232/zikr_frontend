package com.zikrelahi.api.quran.translator;

import com.zikrelahi.api.common.ResourceNotFoundException;
import com.zikrelahi.api.quran.translation.LanguageCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TranslatorService {

    private final TranslatorRepository translatorRepository;

    @Transactional(readOnly = true)
    public List<TranslatorDto> listAll(String languageCode) {
        if (languageCode == null || languageCode.isBlank()) {
            return translatorRepository.findAll().stream().map(TranslatorDto::from).toList();
        }
        LanguageCode language;
        try {
            language = LanguageCode.valueOf(languageCode);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Language '" + languageCode + "' is not supported. Use en, hi, or ur.");
        }
        return translatorRepository.findByLanguageCodeOrderByNameAsc(language)
                .stream()
                .map(TranslatorDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public TranslatorDto getById(Long id) {
        return translatorRepository.findById(id)
                .map(TranslatorDto::from)
                .orElseThrow(() -> new ResourceNotFoundException("Translator " + id + " not found."));
    }

    @Transactional
    public TranslatorDto create(TranslatorRequest req) {
        Translator translator = Translator.builder()
                .name(req.name())
                .languageCode(LanguageCode.valueOf(req.languageCode()))
                .sourceRef(req.sourceRef())
                .license(req.license())
                .licenseNotes(req.licenseNotes())
                .build();
        return TranslatorDto.from(translatorRepository.save(translator));
    }

    /** Resolve a translator for use during Ayah import — throws if not found. */
    @Transactional(readOnly = true)
    public Translator resolveOrThrow(Long id, LanguageCode expectedLang) {
        Translator t = translatorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Translator " + id + " not found."));
        if (t.getLanguageCode() != expectedLang) {
            throw new IllegalArgumentException(
                    "Translator " + id + " is for language '" + t.getLanguageCode()
                    + "', not '" + expectedLang + "'.");
        }
        return t;
    }
}
