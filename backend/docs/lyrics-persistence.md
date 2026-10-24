# Lyrics Persistence Contract

## Data and identifiers

`lyrics.id` is the internal numeric key. `lyrics.legacy_id` preserves the string identifiers used by the current frontend (for example, `786-durood`) and `slug` preserves its URL identifier. The migrations seed the category and subject taxonomies; V15 adds only missing categories and their numeric mappings, without importing or inventing lyric records. V15 validates the canonical category names and mapping IDs before inserting anything, and fails with a descriptive error rather than changing conflicting rows. There is no production lyric SQL dataset in this repository. Before importing browser-demo content, export and review it separately, map each frontend ID to `legacy_id`, and explicitly map frontend `en` to database `roman`.

Categories and subjects use the current stable string IDs and restrictive join-table foreign keys. Artists have a numeric primary key and a unique `artist_key` for legacy string-key compatibility. V16 adds a separate `books` catalog with database-generated numeric IDs and unique stable slugs. The lyric API continues to store and return the existing string `bookId` slug; the numeric book ID is only the catalog record ID. The migration seeds the 14 required books and the three known legacy catalog entries, then creates a compatibility catalog row for any other existing non-null `lyrics.book_id`. Such backfilled unknown references retain their exact string as the display name and have no invented author. Existing lyric references are not rewritten.

`artist_roles` describes which roles an artist may perform; it is not a lyric assignment table. `lyric_artist_ids` is the canonical lyric/artist relation and stores `lyric_id`, numeric `artist_id`, role (`WRITER` or `RECITER`), and reciter order. Its composite primary key prevents assigning the same artist and role twice to a lyric. An artist may have both role rows for one lyric. V13 preserves existing numeric artist mapping IDs as `artists.id`, gives previously unmapped artists IDs above the current maximum, and backfills resolvable writer/reciter assignments. The old generic artist relation is retained as `lyric_artist_ids_legacy` for compatibility; unresolved/ambiguous legacy artist IDs and free-text reciters remain in compatibility storage rather than being guessed or discarded.

## Language versions and document JSON

There is at most one current row per `(lyric_id, language_code)`. Database language codes are `ur`, `hi`, and `roman`; `LyricLanguageCode.fromEditorCode("en")` is the compatibility mapping for the existing Roman-English frontend code. Draft lyrics may have no language rows or only a subset of languages.

Documents are stored as MySQL `JSON` and mapped to Jackson `JsonNode`, not polymorphic Java objects or HTML. The configured editor contract is:

- Nodes: `doc`, `paragraph`, `text`, `hardBreak`.
- Marks: `bold`, `italic`, `underline`, `strike`, `textStyle`, `highlight`.
- `textStyle` attributes: `color` as a six-digit hex color, `fontFamily` from `Noto Nastaliq Urdu`, `Noto Sans Devanagari`, `DM Sans`, or `Georgia`, and `fontSize` from 14px through 36px in the supported steps.
- `highlight` attribute: optional six-digit hex `color`.
- Paragraph attributes: `textAlign` in `left`, `center`, `right`, `justify`; `paragraphSpacing` in 8px, 16px, 24px, or 32px.

The API validator and JPA lifecycle callbacks check the recursive node/mark/attribute allowlists, bounds, and normalized non-empty text, including when repositories are used directly. The database's JSON type guarantees syntactic JSON only; it does not make arbitrary JSON a valid editor document.

Language versions carry an explicit `content_format`: `TIPTAP_JSON` for existing editor documents and `HTML` for sanitized HTML content. Format is never inferred from the content value. V9 required each existing language version to have a JSON document, so V11 adds the format column with `TIPTAP_JSON` as its default, makes the document nullable for HTML rows, and adds the mutually exclusive HTML column. V11 applies the same format metadata and mutually exclusive snapshots to revisions, preserving existing JSON revisions as `TIPTAP_JSON`.

HTML is validated and sanitized before persistence and again before it is returned. Allowed elements are `p`, `span`, `br`, `strong`, `b`, `em`, `i`, `u`, `s`, and `del`; only `dir="rtl|ltr"` and validated inline text styles are retained. Style properties are limited to `color`, `font-size`, `font-family`, `font-weight`, `font-style`, and `text-decoration`; other CSS, attributes (including event handlers), links, and embedded elements are stripped. Color and style values are constrained to safe formats and project-supported font families, sizes, and weights. Script-capable content and unsafe URL schemes are never retained as markup.

## Numeric lyric reference IDs

V12 adds numeric mapping tables for artists, categories, and subjects. V13 promotes the artist mapping IDs to the `artists.id` primary key while preserving each string value in unique `artist_key`; category and subject mappings remain separate. Numeric IDs are stable because they are persisted and not recalculated. For categories, the canonical IDs are `1=durood-o-salam`, `2=hamd`, `3=manqabat`, `4=naat-sharif`, `5=qawwali`, `6=sufi-kalam`, `7=dua`, `8=other-kalam`, and `9=tazmeen`. V15 verifies existing mappings against this contract, inserts only missing mappings at their canonical IDs, and aborts before writing if a category ID, name, or numeric mapping conflicts. The Admin Lyrics form sends these numeric mapping IDs, while admin and public responses continue to return category string IDs.

New artists created through `AdminArtistService` receive their mapping in the same transaction as the artist. Lyric requests never create missing artists or mappings. There is currently no category or subject CRUD service; a future migration or approved creation workflow that inserts those records must also insert the corresponding numeric mapping in that same controlled operation.

`GET /api/v1/books` returns books ordered by name and then numeric ID. Its DTO exposes the numeric catalog ID, name, nullable author, and stable slug. Admin lyric create/update requests validate non-empty book references against this catalog; an empty reference clears the selection.

`writerId` and `reciterIds` use the numeric `artists.id` namespace, which remains aligned with `artist_numeric_mappings.id`. Writers require `WRITER`, `LYRICIST`, or `POET`; reciters require `RECITER` or `NAAT_KHWAN`. Explicit assignment of an inactive artist is rejected. An artist may be assigned in both roles when its configured roles permit it. Role changes that would invalidate existing lyric assignments are rejected. Categories and subjects have no active/inactive field in the current schema; they are validated by source record existence.

## Revisions and deletion policy

When a current language version is updated through `LyricPersistenceService`, the service and new version are written in one transaction. Before changing the current document, it snapshots the prior document, optional plain text, publication status, language, lyric title/slug, and prior update timestamp. Metadata-only changes to the lyric are not revisioned in this phase. Revision foreign keys use restrictive deletion; lyrics, language versions, categories, and subjects cannot be removed while referenced. Admin deletion sets attribution references to null without deleting snapshots.

Timestamps use the backend's existing `LocalDateTime` convention and database `DATETIME` columns. No REST endpoint or public response serializes these persistence entities; future APIs must map them to explicit DTOs.

## Validation status

The regular Spring Boot tests execute all Flyway migrations with the existing H2 MySQL-mode test profile and verify persistence constraints. `MySqlArtistRelationshipMigrationTest` covers representative legacy rows using MySQL 8.4 Testcontainers when Docker is available; `MySqlArtistRelationshipMigrationManualTest` supports running the same fixture against an explicitly configured disposable MySQL database.