export type SearchableOption = {
    value: string;
    label: string;
    description?: string;
};

export function filterSearchableOptions(
    options: SearchableOption[],
    query: string,
): SearchableOption[];

export function toggleSelectedValue(values: string[], selectedValue: string): string[];
