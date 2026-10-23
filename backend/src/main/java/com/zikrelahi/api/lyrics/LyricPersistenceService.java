package com.zikrelahi.api.lyrics;

import com.fasterxml.jackson.databind.JsonNode;
import com.zikrelahi.api.common.ConflictException;
import com.zikrelahi.api.admin.AdminUser;
import com.zikrelahi.api.common.ContentStatus;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class LyricPersistenceService {

    private final LyricRepository lyricRepository;
    private final LyricLanguageVersionRepository languageVersionRepository;
    private final LyricRevisionRepository revisionRepository;

    @Transactional
    public LyricLanguageVersion saveLanguageVersion(
            Long lyricId,
            LyricLanguageCode languageCode,
            JsonNode document,
            String plainText,
            ContentStatus status,
            AdminUser editor,
            String changeNote) {
        if (languageCode == null)
            throw new IllegalArgumentException("A supported language code is required.");
        if (status == null)
            throw new IllegalArgumentException("A publication status is required.");
        TiptapDocumentRules.requirePersistable(document);

        Lyric lyric = lyricRepository.findById(lyricId)
                .orElseThrow(() -> new EntityNotFoundException("Lyric not found: " + lyricId));
        LyricLanguageVersion version = languageVersionRepository
                .findByLyric_IdAndLanguageCode(lyricId, languageCode)
                .orElseGet(() -> LyricLanguageVersion.builder()
                        .lyric(lyric)
                        .languageCode(languageCode)
                        .build());

        saveRevisionIfExisting(lyric, version, editor, changeNote);

        version.setDocument(document.deepCopy());
        version.setHtmlContent(null);
        version.setContentFormat(LyricContentFormat.TIPTAP_JSON);
        version.setPlainText(StringUtils.hasText(plainText) ? plainText : null);
        version.setStatus(status);
        version.setUpdatedBy(editor);
        return languageVersionRepository.save(version);
    }

    @Transactional
    public LyricLanguageVersion saveHtmlLanguageVersion(
            Long lyricId,
            LyricLanguageCode languageCode,
            String html,
            ContentStatus status,
            AdminUser editor,
            String changeNote,
            Long expectedRowVersion) {
        if (languageCode == null)
            throw new IllegalArgumentException("A supported language code is required.");
        if (status == null)
            throw new IllegalArgumentException("A publication status is required.");
        HtmlTranslationSanitizer.ValidatedHtml validated = HtmlTranslationSanitizer.validate(html);

        Lyric lyric = lyricRepository.findById(lyricId)
                .orElseThrow(() -> new EntityNotFoundException("Lyric not found: " + lyricId));
        LyricLanguageVersion version = languageVersionRepository
                .findByLyric_IdAndLanguageCode(lyricId, languageCode)
                .orElse(null);
        if ((version == null && expectedRowVersion != null)
                || (version != null && (expectedRowVersion == null
                        || !expectedRowVersion.equals(version.getRowVersion())))) {
            throw new ConflictException("This language version changed after it was loaded. Reload before saving.");
        }
        if (version == null) {
            version = LyricLanguageVersion.builder()
                    .lyric(lyric)
                    .languageCode(languageCode)
                    .build();
        } else {
            saveRevisionIfExisting(lyric, version, editor, changeNote);
        }

        version.setContentFormat(LyricContentFormat.HTML);
        version.setDocument(null);
        version.setHtmlContent(validated.html());
        version.setPlainText(validated.plainText());
        version.setStatus(status);
        version.setUpdatedBy(editor);
        return languageVersionRepository.save(version);
    }

    private void saveRevisionIfExisting(
            Lyric lyric,
            LyricLanguageVersion version,
            AdminUser editor,
            String changeNote) {
        if (version.getId() == null) {
            return;
        }
        int nextRevision = revisionRepository
                .findTopByLanguageVersion_IdOrderByRevisionNumberDesc(version.getId())
                .map(LyricRevision::getRevisionNumber)
                .orElse(0) + 1;
        LyricRevision.LyricRevisionBuilder revision = LyricRevision.builder()
                .lyric(lyric)
                .languageVersion(version)
                .revisionNumber(nextRevision)
                .languageCode(version.getLanguageCode())
                .lyricTitleSnapshot(lyric.getTitle())
                .lyricSlugSnapshot(lyric.getSlug())
                .contentFormat(version.getContentFormat())
                .plainTextSnapshot(version.getPlainText())
                .statusSnapshot(version.getStatus())
                .versionUpdatedAt(version.getUpdatedAt())
                .changedBy(editor)
                .changeNote(StringUtils.hasText(changeNote) ? changeNote.trim() : null);
        if (version.getContentFormat() == LyricContentFormat.HTML) {
            revision.htmlContentSnapshot(
                    HtmlTranslationSanitizer.validatePersisted(version.getHtmlContent()).html());
        } else {
            revision.documentSnapshot(TiptapDocumentValidator.validatePersisted(version.getDocument()).document());
        }
        revisionRepository.save(revision.build());
    }
}