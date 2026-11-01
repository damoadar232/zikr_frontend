package com.zikrelahi.api.ebooks;

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
@Table(name = "ebooks")
@Getter
@Setter
@NoArgsConstructor
public class Ebook {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 255)
    @Column(nullable = false, length = 255)
    private String title;

    @NotBlank
    @Size(max = 1200)
    @Column(nullable = false, length = 1200)
    private String description;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "language_code",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_ebooks_language"))
    private Language language;

    @NotBlank
    @Size(max = 255)
    @Column(name = "original_cover_filename", nullable = false, length = 255)
    private String originalCoverFilename;

    @NotBlank
    @Size(max = 1000)
    @Column(name = "cover_image_url", nullable = false, length = 1000)
    private String coverImageUrl;

    @NotBlank
    @Size(max = 255)
    @Column(name = "cover_image_public_id", nullable = false, length = 255)
    private String coverImagePublicId;

    @NotBlank
    @Size(max = 20)
    @Column(name = "cover_image_format", nullable = false, length = 20)
    private String coverImageFormat;

    @NotNull
    @Positive
    @Column(name = "cover_image_size", nullable = false)
    private Long coverImageSize;

    @NotBlank
    @Size(max = 255)
    @Column(name = "original_book_filename", nullable = false, length = 255)
    private String originalBookFilename;

    @NotBlank
    @Size(max = 1000)
    @Column(name = "book_file_url", nullable = false, length = 1000)
    private String bookFileUrl;

    @NotBlank
    @Size(max = 255)
    @Column(name = "book_file_public_id", nullable = false, length = 255)
    private String bookFilePublicId;

    @NotBlank
    @Size(max = 20)
    @Column(name = "book_file_format", nullable = false, length = 20)
    private String bookFileFormat;

    @NotNull
    @Positive
    @Column(name = "book_file_size", nullable = false)
    private Long bookFileSize;

    @NotNull
    @Column(name = "published_date", nullable = false)
    private LocalDate publishedDate;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EbookStatus status = EbookStatus.DRAFT;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "ebook_category_assignments",
            joinColumns = @JoinColumn(
                    name = "ebook_id",
                    foreignKey = @ForeignKey(name = "fk_ebook_category_ebook")),
            inverseJoinColumns = @JoinColumn(
                    name = "category_key",
                    foreignKey = @ForeignKey(name = "fk_ebook_category_category")))
    private Set<EbookCategory> categories = new LinkedHashSet<>();

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
