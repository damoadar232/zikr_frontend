package com.zikrelahi.api.audio;

import com.zikrelahi.api.languages.Language;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "audios")
@Getter
@Setter
@NoArgsConstructor
public class Audio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 250)
    @Column(nullable = false, length = 250)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "language_code",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_audios_language"))
    private Language language;

    @Size(max = 255)
    @NotBlank
    @Column(name = "original_audio_filename", length = 255)
    private String originalAudioFilename;

    @Size(max = 2048)
    @NotBlank
    @Column(name = "audio_url", length = 2048)
    private String audioUrl;

    @Size(max = 255)
    @NotBlank
    @Column(name = "audio_public_id", length = 255)
    private String audioPublicId;

    @Size(max = 20)
    @NotBlank
    @Column(name = "audio_format", length = 20)
    private String audioFormat;

    @NotNull
    @Positive
    @Column(name = "audio_size")
    private Long audioSize;

    @NotNull
    @Positive
    @Column(name = "audio_duration_seconds")
    private Integer audioDurationSeconds;

    @Size(max = 255)
    @NotBlank
    @Column(name = "original_cover_filename", length = 255)
    private String originalCoverFilename;

    @Size(max = 2048)
    @NotBlank
    @Column(name = "cover_image_url", length = 2048)
    private String coverImageUrl;

    @Size(max = 255)
    @NotBlank
    @Column(name = "cover_image_public_id", length = 255)
    private String coverImagePublicId;

    @Size(max = 20)
    @NotBlank
    @Column(name = "cover_image_format", length = 20)
    private String coverImageFormat;

    @Column(name = "published_date")
    private LocalDate publishedDate;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AudioStatus status = AudioStatus.DRAFT;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "audio_category_assignments",
            joinColumns = @JoinColumn(
                    name = "audio_id",
                    foreignKey = @ForeignKey(name = "fk_audio_category_audio")),
            inverseJoinColumns = @JoinColumn(
                    name = "category_id",
                    foreignKey = @ForeignKey(name = "fk_audio_category_category")))
    private Set<AudioCategory> categories = new LinkedHashSet<>();

    @NotNull
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @NotNull
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PrePersist
    void onPersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
