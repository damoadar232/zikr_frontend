package com.zikrelahi.api.lyrics;

import com.zikrelahi.api.common.ContentStatus;
import com.zikrelahi.api.common.ResourceNotFoundException;
import com.zikrelahi.api.lyrics.LyricDtos.PageSlice;
import com.zikrelahi.api.lyrics.LyricDtos.PublicSubjectDto;
import com.zikrelahi.api.lyrics.LyricDtos.PublicLyricDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class PublicLyricService {

    private final LyricRepository lyricRepository;
    private final LyricSubjectRepository subjectRepository;
    private final LyricDtoAssembler assembler;

    public PublicLyricService(
            LyricRepository lyricRepository,
            LyricSubjectRepository subjectRepository,
            LyricDtoAssembler assembler) {
        this.lyricRepository = lyricRepository;
        this.subjectRepository = subjectRepository;
        this.assembler = assembler;
    }

    @Transactional(readOnly = true)
    public PageSlice<PublicLyricDto> list(int page, int size, String category,
            String reciter, Long reciterId, String poet, String language) {
        requirePageBounds(page, size);
        String languageCode = StringUtils.hasText(language)
                ? LyricLanguageCode.fromApiCode(language).name()
                : null;
        Page<Lyric> results = lyricRepository.findPublicPage(
                clean(category), clean(reciter), reciterId, clean(poet), numericId(poet),
                languageCode, PageRequest.of(page, size));
        return new PageSlice<>(assembler.toPublic(results.getContent()), results.getNumber(),
                results.getSize(), results.getTotalElements(), results.getTotalPages());
    }

    @Transactional(readOnly = true)
    public List<PublicSubjectDto> listAvailableSubjects() {
        return subjectRepository.findByLyricStatus(ContentStatus.PUBLISHED).stream()
                .map(subject -> new PublicSubjectDto(subject.getId(), subject.getName()))
                .toList();
    }

    @Transactional(readOnly = true)
    public PublicLyricDto get(String reference) {
        Lyric lyric = findPublished(reference)
                .orElseThrow(() -> new ResourceNotFoundException("Published lyric not found."));
        return assembler.toPublic(lyric);
    }

    private java.util.Optional<Lyric> findPublished(String reference) {
        if (reference == null || reference.isBlank())
            return java.util.Optional.empty();
        java.util.Optional<Lyric> lyric = lyricRepository.findByLegacyIdAndStatus(reference, ContentStatus.PUBLISHED);
        if (lyric.isPresent())
            return lyric;
        lyric = lyricRepository.findBySlugAndStatus(reference, ContentStatus.PUBLISHED);
        if (lyric.isPresent())
            return lyric;
        try {
            return lyricRepository.findByIdAndStatus(Long.parseLong(reference), ContentStatus.PUBLISHED);
        } catch (NumberFormatException ignored) {
            return java.util.Optional.empty();
        }
    }

    static void requirePageBounds(int page, int size) {
        if (page < 0)
            throw new IllegalArgumentException("page must be zero or greater.");
        if (size < 1 || size > 100)
            throw new IllegalArgumentException("size must be between 1 and 100.");
    }

    private static String clean(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static Long numericId(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return Long.valueOf(value.trim());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}