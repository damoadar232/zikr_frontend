package com.zikrelahi.api.audio;

import com.zikrelahi.api.common.ConflictException;
import com.zikrelahi.api.common.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AudioCategoryService {

    private static final Pattern CATEGORY_KEY_PATTERN = Pattern.compile("[a-z0-9]+(?:-[a-z0-9]+)*");
    private final AudioCategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<AudioDtos.CategoryDto> listActive() {
        return categoryRepository.findAllByActiveTrueOrderByNameAsc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public AudioDtos.CategoryDto create(AudioDtos.CategoryRequest request) {
        String key = request.categoryKey().trim().toLowerCase(Locale.ROOT);
        if (!CATEGORY_KEY_PATTERN.matcher(key).matches()) {
            throw new IllegalArgumentException("Category key must contain lowercase letters, numbers, and hyphens.");
        }
        if (categoryRepository.existsById(key)) {
            throw new ConflictException("An Audio category with this key already exists.");
        }
        String name = request.name().trim();
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("An Audio category with this name already exists.");
        }

        AudioCategory category = new AudioCategory();
        category.setCategoryKey(key);
        category.setName(name);
        category.setDescription(request.description());
        category.setActive(request.active() == null || request.active());
        return toDto(categoryRepository.saveAndFlush(category));
    }

    @Transactional
    public AudioDtos.CategoryDto update(String key, AudioDtos.CategoryUpdateRequest request) {
        AudioCategory category = categoryRepository.findById(key)
                .orElseThrow(() -> new ResourceNotFoundException("Audio category was not found."));
        String name = request.name().trim();
        if (categoryRepository.existsByNameIgnoreCaseAndCategoryKeyNot(name, key)) {
            throw new ConflictException("An Audio category with this name already exists.");
        }
        category.setName(name);
        category.setDescription(request.description());
        if (request.active() != null) {
            category.setActive(request.active());
        }
        return toDto(categoryRepository.saveAndFlush(category));
    }

    private AudioDtos.CategoryDto toDto(AudioCategory category) {
        return new AudioDtos.CategoryDto(
                category.getCategoryKey(),
                category.getName(),
                category.getDescription(),
                category.isActive(),
                category.getCreatedAt(),
                category.getUpdatedAt());
    }
}
