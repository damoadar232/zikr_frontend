export function filterSearchableOptions(options, query) {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return options.filter((option) => !normalizedQuery
        || `${option.label} ${option.description || ""}`.toLocaleLowerCase().includes(normalizedQuery));
}

export function toggleSelectedValue(values, selectedValue) {
    return values.includes(selectedValue)
        ? values.filter((value) => value !== selectedValue)
        : [...values, selectedValue];
}
