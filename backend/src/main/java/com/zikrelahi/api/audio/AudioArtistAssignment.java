package com.zikrelahi.api.audio;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Entity
@Table(name = "audio_artist_ids")
@Getter
@Setter
@NoArgsConstructor
public class AudioArtistAssignment {

    @EmbeddedId
    private AssignmentId id;

    @Column(name = "position", nullable = false)
    private int position;

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @EqualsAndHashCode
    public static class AssignmentId implements Serializable {

        @Column(name = "audio_id", nullable = false)
        private Long audioId;

        @Column(name = "artist_id", nullable = false)
        private Long artistId;

        @Column(name = "role", nullable = false, length = 20)
        private String role;
    }
}
