package com.zikrelahi.api.lyrics;

import com.zikrelahi.api.artists.ArtistDtos.ArtistProfileDto;
import com.zikrelahi.api.lyrics.LyricDtos.MediaReferenceDto;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

final class LyricRelations {
    final Set<String> categoryIds = new LinkedHashSet<>();
    final Set<String> subjectIds = new LinkedHashSet<>();
    final Set<Long> artistIds = new LinkedHashSet<>();
    final Set<Long> reciterIds = new LinkedHashSet<>();
    final Map<Long, ArtistProfileDto> artistProfiles = new LinkedHashMap<>();
    final List<String> reciters = new ArrayList<>();
    final Set<String> tags = new LinkedHashSet<>();
    final List<MediaReferenceDto> mediaReferences = new ArrayList<>();

    List<String> categoryIds() {
        return List.copyOf(categoryIds);
    }

    List<String> subjectIds() {
        return List.copyOf(subjectIds);
    }

    List<Long> artistIds() {
        return List.copyOf(artistIds);
    }

    List<Long> reciterIds() {
        return List.copyOf(reciterIds);
    }

    List<ArtistProfileDto> artistProfiles() {
        return List.copyOf(artistProfiles.values());
    }

    List<String> reciters() {
        return List.copyOf(reciters);
    }

    List<String> tags() {
        return List.copyOf(tags);
    }

    List<MediaReferenceDto> mediaReferences() {
        return List.copyOf(mediaReferences);
    }
}