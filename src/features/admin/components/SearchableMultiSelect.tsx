import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

export type SearchableMultiSelectOption = {
    value: string;
    label: string;
    description?: string;
};

type SearchableMultiSelectProps = {
    label: string;
    options: SearchableMultiSelectOption[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder: string;
    emptyMessage: string;
    isLoading?: boolean;
    error?: string;
    onRetry?: () => void;
    disabled?: boolean;
};

export function SearchableMultiSelect({
    label,
    options,
    value,
    onChange,
    placeholder,
    emptyMessage,
    isLoading = false,
    error = "",
    onRetry,
    disabled = false,
}: SearchableMultiSelectProps) {
    const listboxId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const selectedOptions = useMemo(
        () => value.map((selectedValue) => options.find((option) => option.value === selectedValue))
            .filter((option): option is SearchableMultiSelectOption => !!option),
        [options, value],
    );
    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        return options.filter((option) => !normalizedQuery
            || `${option.label} ${option.description || ""}`.toLocaleLowerCase().includes(normalizedQuery));
    }, [options, query]);

    useEffect(() => {
        const closeOnOutsidePointer = (event: PointerEvent) => {
            if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener("pointerdown", closeOnOutsidePointer);
        return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
    }, []);

    useEffect(() => {
        setActiveIndex((current) => Math.min(current, Math.max(filteredOptions.length - 1, 0)));
    }, [filteredOptions.length]);

    const toggleOption = (optionValue: string) => {
        onChange(value.includes(optionValue)
            ? value.filter((selectedValue) => selectedValue !== optionValue)
            : [...value, optionValue]);
        setQuery("");
        setActiveIndex(0);
        setOpen(true);
        inputRef.current?.focus();
    };

    const removeOption = (optionValue: string) => {
        onChange(value.filter((selectedValue) => selectedValue !== optionValue));
        inputRef.current?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            return;
        }
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => Math.min(current + 1, Math.max(filteredOptions.length - 1, 0)));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => Math.max(current - 1, 0));
        } else if (event.key === "Enter" && open && filteredOptions[activeIndex]) {
            event.preventDefault();
            toggleOption(filteredOptions[activeIndex].value);
        } else if (event.key === "Backspace" && !query && value.length) {
            removeOption(value[value.length - 1]);
        }
    };

    return (
        <div className={`searchable-multi-select${open ? " is-open" : ""}`} ref={rootRef}>
            <label className="searchable-multi-select-label">{label}</label>
            <div className="searchable-multi-select-control" onClick={() => {
                if (!disabled) {
                    setOpen(true);
                    inputRef.current?.focus();
                }
            }}>
                <div className="searchable-multi-select-chips">
                    {selectedOptions.map((option) => (
                        <span className="searchable-multi-select-chip" key={option.value}>
                            <span title={option.label}>{option.label}</span>
                            <button
                                type="button"
                                aria-label={`Remove ${option.label}`}
                                disabled={disabled}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    removeOption(option.value);
                                }}
                            >×</button>
                        </span>
                    ))}
                    <input
                        ref={inputRef}
                        type="text"
                        role="combobox"
                        aria-label={`Search ${label.toLocaleLowerCase()}`}
                        aria-autocomplete="list"
                        aria-expanded={open}
                        aria-controls={listboxId}
                        aria-activedescendant={open && filteredOptions.length ? `${listboxId}-option-${activeIndex}` : undefined}
                        placeholder={selectedOptions.length ? "" : placeholder}
                        value={query}
                        disabled={disabled}
                        onFocus={() => setOpen(true)}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setActiveIndex(0);
                            setOpen(true);
                        }}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                {value.length > 0 && (
                    <button type="button" className="searchable-multi-select-clear" disabled={disabled} onClick={(event) => {
                        event.stopPropagation();
                        onChange([]);
                        setQuery("");
                        inputRef.current?.focus();
                    }}>Clear all</button>
                )}
                <span className="searchable-multi-select-chevron" aria-hidden="true">{open ? "▴" : "▾"}</span>
            </div>
            {open && (
                <div className="searchable-multi-select-menu">
                    {isLoading ? <p className="searchable-multi-select-message" role="status">Loading {label.toLocaleLowerCase()}…</p>
                        : error ? (
                            <div className="searchable-multi-select-error" role="alert">
                                <span>{error}</span>
                                {onRetry && <button type="button" onClick={onRetry}>Retry</button>}
                            </div>
                        ) : filteredOptions.length ? (
                            <ul id={listboxId} role="listbox" aria-label={label} aria-multiselectable="true">
                                {filteredOptions.map((option, index) => {
                                    const selected = value.includes(option.value);
                                    return (
                                        <li key={option.value} role="presentation">
                                            <button
                                                type="button"
                                                id={`${listboxId}-option-${index}`}
                                                role="option"
                                                aria-selected={selected}
                                                className={`searchable-multi-select-option${index === activeIndex ? " is-active" : ""}`}
                                                onMouseEnter={() => setActiveIndex(index)}
                                                onMouseDown={(event) => event.preventDefault()}
                                                onClick={() => toggleOption(option.value)}
                                            >
                                                <span className={`searchable-multi-select-check${selected ? " is-selected" : ""}`} aria-hidden="true">{selected ? "✓" : ""}</span>
                                                <span className="searchable-multi-select-option-copy">
                                                    <span>{option.label}</span>
                                                    {option.description && <small>{option.description}</small>}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : <p className="searchable-multi-select-message">{emptyMessage}</p>}
                </div>
            )}
        </div>
    );
}
