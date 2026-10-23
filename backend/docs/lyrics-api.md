# Lyrics API

All responses use the existing `ApiResponse` envelope (`data`, `error`, `message`). Persistence entities are mapped to DTOs; credentials, administrator relationships, and revision snapshots are never included in public responses.

## Public

`GET /api/v1/lyrics?page=0&size=20&category=naat-sharif&reciter=owais&poet=imam-ahmed-raza-khan&language=roman`

Filters are optional. Page is zero-based and size is 1–100. Only lyrics whose parent status is `PUBLISHED` are returned. Every valid saved language version for those lyrics is available regardless of its legacy language-level status. A successful list has this shape:

```json
{
  "data": {
    "items": [
      {
        "id": "mustafa-jaan-e-rehmat",
        "title": "Mustafa Jaan-e-Rehmat",
        "languageVersions": [
          {
            "code": "roman",
            "label": "Roman English",
            "script": "Roman",
            "dir": "ltr",
            "document": { "type": "doc", "content": [] },
            "text": "..."
          }
        ]
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

`GET /api/v1/lyrics/{reference}` accepts the stable frontend `legacyId`, slug, or numeric database ID. Draft lyrics and lyrics without public status return 404.

Public language versions retain their stored format: legacy Tiptap entries return `contentFormat: "TIPTAP_JSON"` and a `document`; HTML entries return `contentFormat: "HTML"` and sanitized `content`, with `document: null`. Both include the language metadata and plain-text `text` field.

```json
{
  "code": "ur",
  "dir": "rtl",
  "document": null,
  "contentFormat": "HTML",
  "content": "<p><strong>...</strong></p>",
  "text": "..."
}
```

## Admin

All `/api/v1/admin/lyrics/**` routes use the existing JWT filter and require `ADMIN` or `SUPER_ADMIN`.

- `POST /api/v1/admin/lyrics` creates metadata as `DRAFT` and returns 201.
- `GET /api/v1/admin/lyrics?page=0&size=20&status=DRAFT&query=naat` lists drafts and published records.
- `GET /api/v1/admin/lyrics/{reference}` loads metadata and saved language versions.
- `PUT /api/v1/admin/lyrics/{reference}` replaces editable metadata while retaining status and all language versions.
- `PUT /api/v1/admin/lyrics/{reference}/languages/{languageCode}` saves exactly one language document. Codes are `ur`, `hi`, and `roman`; saving a translation does not change parent publication status.
- `PATCH /api/v1/admin/lyrics/{reference}/status` publishes a lyric only when at least one valid, non-empty language version exists; setting it to draft immediately hides all its translations publicly.
- `GET /api/v1/admin/lyrics/{reference}/languages/{languageCode}/revisions` returns that language's prior snapshots, newest first.
- `DELETE /api/v1/admin/lyrics/{reference}` returns 204 only when no language versions exist. Otherwise it returns 409 to preserve content and revision history; unpublish instead.

Admin metadata requests accept the existing lyric identifiers and fields: title, slug, artist/writer IDs, reciter names, category/subject IDs, tags, book ID, image URL, featured state, and related media references. Unknown category or subject IDs are rejected. The server derives audit administrators from the authenticated JWT principal and ignores administrator IDs from request bodies.

A language request contains `{ "document": <Tiptap JSON>, "changeNote": "optional" }`. The server enforces the documented node, mark, font, color, size, alignment, paragraph spacing, document-size, text-size, and non-empty-content rules before storage. JSON is never treated as HTML. The request body limit for lyric admin writes is 512 KiB; each document is limited to 256 KiB.

The metadata create/update routes also accept the combined HTML request contract:

```json
{
  "title": "Lyric title",
  "slug": "lyric-title",
  "writerId": 123,
  "reciterIds": [456],
  "categoryIds": [12],
  "subjectIds": [34],
  "tags": ["tag"],
  "bookId": "book-key",
  "featured": false,
  "mediaReferences": [],
  "translations": [
    {"languageCode": "ur", "content": "<p>...</p>", "contentFormat": "HTML"}
  ]
}
```

Numeric writer/reciter IDs are `artists.id` values preserved from V12's artist mapping table; categories and subjects use their respective V12 mappings. Unknown IDs, inactive artists, incompatible artist roles, and duplicate numeric references are rejected. Omitted optional metadata on a combined update is preserved; explicitly supplied empty reference/tag/media arrays replace those collections with empty values. Omitted translations and an empty `translations` array both leave all current translations unchanged; translations are never deleted by this operation. Submitted HTML is sanitized before any writes. Translation saves create format-aware revisions and never change the parent lyric's publication status. The legacy language status column is retained for schema compatibility and revision snapshots but is not used for public visibility or returned in the admin language-version DTO. An optional `expectedRowVersion` on a translation enables an explicit stale-write check; Hibernate optimistic locking remains active when it is omitted. Existing string-key metadata requests and standalone Tiptap language requests remain supported.

Artist create, list, get, and update responses expose the numeric `artists.id` as `id` and preserve the string key as `artistKey`; `numericId` remains as an alias. Admin routes accept either numeric IDs or the existing string keys, and delete remains `204 No Content`. Artist option responses retain their string-key `id` for existing option consumers and provide `numericId` for numeric lyric references. The selected artist's configured roles determine whether it can be assigned as a writer, reciter, or both. Explicitly supplied `writerId: null` or `reciterIds: []` clears that role's assignments; omitting either field preserves the existing assignments.

Validation failures return 400, missing records 404, uniqueness/optimistic conflicts and unsafe deletes 409, unauthenticated requests 401, unauthorized roles 403, and oversized requests 413. Unexpected failures return the existing generic error envelope without database details or stack traces.
