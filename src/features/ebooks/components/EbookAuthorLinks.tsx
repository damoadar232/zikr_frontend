import type { EbookAuthor } from "../services/ebooksApiService";

type EbookAuthorLinksProps = {
    authors: EbookAuthor[];
    fallbackName: string;
    onAuthorSelect?: (author: EbookAuthor) => void;
};

export function EbookAuthorLinks({ authors, fallbackName, onAuthorSelect }: EbookAuthorLinksProps) {
    if (!authors.length) return <>{fallbackName}</>;

    return <span className="ebook-author-links">
        {authors.map((author, index) => {
            const name = author.displayName?.trim() || author.fullName;
            const hasGlobalId = Number.isSafeInteger(author.id) && author.id > 0;
            return <span key={author.id || `${name}-${index}`}>
                {index > 0 && <span aria-hidden="true">, </span>}
                {hasGlobalId && onAuthorSelect
                    ? <button
                        type="button"
                        className="lyrics-artist-name-link"
                        onClick={() => onAuthorSelect(author)}
                    >
                        {name}
                    </button>
                    : name}
            </span>;
        })}
    </span>;
}
