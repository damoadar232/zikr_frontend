package com.zikrelahi.api.lyrics;

import com.zikrelahi.api.lyrics.LyricDtos.AdminLanguageVersionDto;
import com.zikrelahi.api.lyrics.LyricDtos.AdminLyricDto;
import com.zikrelahi.api.lyrics.LyricDtos.MediaReferenceDto;
import com.zikrelahi.api.lyrics.LyricDtos.PublicLanguageVersionDto;
import com.zikrelahi.api.lyrics.LyricDtos.PublicLyricDto;
import com.zikrelahi.api.lyrics.LyricDtos.RevisionDto;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class LyricDtoAssembler {

    private final LyricMetadataBatchLoader metadataBatchLoader;
    private final LyricLanguageVersionRepository languageVersionRepository;

    public LyricDtoAssembler(LyricMetadataBatchLoader metadataBatchLoader,
            LyricLanguageVersionRepository languageVersionRepository) {
        this.metadataBatchLoader = metadataBatchLoader;
        this.languageVersionRepository = languageVersionRepository;
    }

    public List<PublicLyricDto> toPublic(List<Lyric> lyrics) {
        List<Long> ids = lyrics.stream().map(Lyric::getId).toList();
        Map<Long, LyricRelations> relations = metadataBatchLoader.load(ids);
        Map<Long, List<LyricLanguageVersion>> versions = groupVersions(
                languageVersionRepository.findAllForLyricIds(ids));
        return lyrics.stream().map(lyric -> toPublic(lyric,
                relations.getOrDefault(lyric.getId(), new LyricRelations()),
                versions.getOrDefault(lyric.getId(), List.of()))).toList();
    }

    public PublicLyricDto toPublic(Lyric lyric) {
        return toPublic(List.of(lyric)).getFirst();
    }

    public List<AdminLyricDto> toAdmin(List<Lyric> lyrics) {
        List<Long> ids = lyrics.stream().map(Lyric::getId).toList();
        Map<Long, LyricRelations> relations = metadataBatchLoader.load(ids);
        Map<Long, List<LyricLanguageVersion>> versions = groupVersions(
                languageVersionRepository.findAllForLyricIds(ids));
        return lyrics.stream().map(lyric -> toAdmin(lyric,
                relations.getOrDefault(lyric.getId(), new LyricRelations()),
                versions.getOrDefault(lyric.getId(), List.of()))).toList();
    }

    public AdminLyricDto toAdmin(Lyric lyric) {
        return toAdmin(List.of(lyric)).getFirst();
    }

    public RevisionDto toRevision(LyricRevision revision) {
        return new RevisionDto(revision.getId(), revision.getRevisionNumber(), revision.getLanguageCode(),
                revision.getLyricTitleSnapshot(), revision.getLyricSlugSnapshot(), revision.getDocumentSnapshot(),
                revision.getContentFormat(), revision.getHtmlContentSnapshot(), revision.getPlainTextSnapshot(),
                revision.getStatusSnapshot(), revision.getVersionUpdatedAt(),
                revision.getCreatedAt(),
                revision.getChangedBy() == null ? null : revision.getChangedBy().getDisplayName(),
                revision.getChangeNote());
    }

    private PublicLyricDto toPublic(Lyric lyric, LyricRelations relations,
            List<LyricLanguageVersion> versions) {
        List<MediaReferenceDto> audio = mediaOfType(relations, LyricMediaType.AUDIO);
        List<MediaReferenceDto> video = mediaOfType(relations, LyricMediaType.VIDEO);
        return new PublicLyricDto(lyric.getLegacyId(), lyric.getTitle(), lyric.getSlug(), lyric.getArtistId(),
                relations.artistIds(), relations.reciters(), lyric.getWriterId(), lyric.getWriterName(),
                relations.categoryIds(), relations.subjectIds(), relations.tags(), lyric.getBookId(),
                lyric.getCoverImageUrl(), lyric.isFeatured(), lyric.getCreatedAt(),
                versions.stream().map(this::toPublicVersion).toList(), audio, video);
    }

    private AdminLyricDto toAdmin(Lyric lyric, LyricRelations relations,
            List<LyricLanguageVersion> versions) {
        return new AdminLyricDto(lyric.getId(), lyric.getLegacyId(), lyric.getTitle(), lyric.getSlug(),
                lyric.getArtistId(), relations.artistIds(), relations.reciters(), lyric.getWriterId(),
                lyric.getWriterName(), relations.categoryIds(), relations.subjectIds(), relations.tags(),
                lyric.getBookId(), lyric.getCoverImageUrl(), lyric.isFeatured(), lyric.getStatus(),
                lyric.getCreatedAt(), lyric.getUpdatedAt(),
                versions.stream().map(this::toAdminVersion).toList(), relations.mediaReferences());
    }

    private PublicLanguageVersionDto toPublicVersion(LyricLanguageVersion version) {
        LyricLanguageCode language = version.getLanguageCode();
        boolean html = version.getContentFormat() == LyricContentFormat.HTML;
        String content = html
                ? HtmlTranslationSanitizer.validatePersisted(version.getHtmlContent()).html()
                : null;
        return new PublicLanguageVersionDto(language, label(language), script(language), direction(language),
                html ? null : TiptapDocumentValidator.validatePersisted(version.getDocument()).document(),
                version.getContentFormat(), content, version.getPlainText());
    }

    private AdminLanguageVersionDto toAdminVersion(LyricLanguageVersion version) {
        boolean html = version.getContentFormat() == LyricContentFormat.HTML;
        String content = html
                ? HtmlTranslationSanitizer.validatePersisted(version.getHtmlContent()).html()
                : null;
        return new AdminLanguageVersionDto(version.getId(), version.getLanguageCode(),
                html ? null : TiptapDocumentValidator.validatePersisted(version.getDocument()).document(),
                version.getContentFormat(), content, version.getPlainText(),
                version.getCreatedAt(), version.getUpdatedAt(), version.getRowVersion());
    }

    private Map<Long, List<LyricLanguageVersion>> groupVersions(List<LyricLanguageVersion> versions) {
        return versions.stream().collect(Collectors.groupingBy(version -> version.getLyric().getId(), HashMap::new,
                Collectors.toCollection(ArrayList::new)));
    }

    private static List<MediaReferenceDto> mediaOfType(LyricRelations relations, LyricMediaType mediaType) {
        return relations.mediaReferences().stream()
                .filter(reference -> mediaType.name().equals(reference.mediaType())).toList();
    }

    private static String label(LyricLanguageCode code) {
        return switch (code) {
            case ur -> "Urdu";
            case hi -> "Hindi";
            case roman -> "Roman English";
        };
    }

    private static String script(LyricLanguageCode code) {
        return switch (code) {
            case ur -> "Urdu";
            case hi -> "Devanagari";
            case roman -> "Roman";
        };
    }

    private static String direction(LyricLanguageCode code) {
        return code == LyricLanguageCode.ur ? "rtl" : "ltr";
    }
}