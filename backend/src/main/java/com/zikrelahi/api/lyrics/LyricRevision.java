package com.zikrelahi.api.lyrics;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.JsonNode;
import com.zikrelahi.api.admin.AdminUser;
import com.zikrelahi.api.common.ContentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "lyric_revisions", uniqueConstraints = @UniqueConstraint(name = "uq_lyric_revision_number", columnNames = {
        "language_version_id", "revision_number" }))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LyricRevision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lyric_id", nullable = false)
    private Lyric lyric;

    @JsonIgnore
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "language_version_id", nullable = false)
    private LyricLanguageVersion languageVersion;

    @NotNull
    @Column(name = "revision_number", nullable = false)
    private Integer revisionNumber;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "language_code", nullable = false, length = 10)
    private LyricLanguageCode languageCode;

    @NotNull
    @Column(name = "lyric_title_snapshot", nullable = false, length = 250)
    private String lyricTitleSnapshot;

    @NotNull
    @Column(name = "lyric_slug_snapshot", nullable = false, length = 180)
    private String lyricSlugSnapshot;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "content_format", nullable = false, length = 20)
    @Builder.Default
    private LyricContentFormat contentFormat = LyricContentFormat.TIPTAP_JSON;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "document_snapshot", nullable = true, columnDefinition = "json")
    private JsonNode documentSnapshot;

    @Column(name = "html_content_snapshot", columnDefinition = "longtext")
    private String htmlContentSnapshot;

    @Column(name = "plain_text_snapshot", columnDefinition = "TEXT")
    private String plainTextSnapshot;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status_snapshot", nullable = false, length = 20)
    private ContentStatus statusSnapshot;

    @NotNull
    @Column(name = "version_updated_at", nullable = false)
    private LocalDateTime versionUpdatedAt;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by")
    private AdminUser changedBy;

    @Size(max = 500)
    @Column(name = "change_note", length = 500)
    private String changeNote;

    @NotNull
    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    void onPersist() {
        if (createdAt == null)
            createdAt = LocalDateTime.now();
        LyricContentRules.requireValid(contentFormat, documentSnapshot, htmlContentSnapshot);
    }
}