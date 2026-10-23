# Admin Content API Contract

The frontend includes an authenticated Lyrics API client at `/api/v1/admin/lyrics`, but this repository contains no backend source. The client contract is not proof that those endpoints are deployed. Lyrics Management uses that client and shows API failures explicitly; Quran and Reciter demo views still use browser-local storage. Do not represent local demo changes as server-persisted.

## Required Authorization

Every `/api/v1/admin/*` endpoint must require a server-issued authenticated session and an administrator role. The server must validate authorization for every request; hiding a route or trusting `zikr-authenticated` in local storage is not authorization. Cookie-authenticated write requests must also enforce CSRF protection. Public endpoints must return published content only.

## Lyrics API Client Contract

The API client expects authenticated requests and a response envelope with the returned value in `data`. Page responses have `{ "items": [], "page": 0, "size": 20, "totalElements": 0, "totalPages": 0 }`.

- `GET /api/v1/admin/lyrics?page=&size=&query=&status=&categoryId=&language=&reciter=` lists admin records. The client forwards these filters; backend support for each filter must be verified/implemented.
- `GET /api/v1/admin/lyrics/:id` returns the editable record in `data`.
- `POST /api/v1/admin/lyrics` creates metadata; `PUT /api/v1/admin/lyrics/:id` updates metadata.
- `PUT /api/v1/admin/lyrics/:id/languages/:languageCode` saves `{ "document": TiptapJSON, "expectedRowVersion": 1, "changeNote": "..." }`.
- `PATCH /api/v1/admin/lyrics/:id/status` changes the lyric's publication status; a lyric can be published only when it has at least one valid, non-empty saved language version. Language saves do not change the parent status.
- `DELETE /api/v1/admin/lyrics/:id` deletes a record.
- `GET /api/v1/lyrics` is the unauthenticated public list client.

The frontend currently supports language codes `ur`, `hi`, and `roman` and sends structured Tiptap documents without converting them to HTML. The parent lyric status controls public visibility; saved translations are returned regardless of the legacy language-level status. The backend must preserve validated text color and other supported marks, enforce row-version conflicts, validate authorization on every admin request, and expose only parent-published lyrics publicly. Deployment, authorization, persistence, filter semantics, and color round-tripping are not verifiable from this frontend-only repository.

### Lyrics record shape

`LyricsRecord` payloads must preserve the existing model and add a multi-reciter list:

```json
{
  "id": "mustafa-jaan-e-rehmat",
  "slug": "mustafa-jaan-e-rehmat",
  "title": "Mustafa Jaan-e-Rehmat",
  "artistId": 17,
  "artistIds": [17],
  "reciters": ["Owais Raza Qadri"],
  "writerId": 23,
  "writer": "Imam Ahmed Raza Khan",
  "categoryIds": ["durood-o-salam"],
  "subjectIds": ["prophet", "madina"],
  "tags": ["love", "madina"],
  "bookId": "noor-e-sadaqat",
  "languageVersions": [{"code":"ur","label":"Urdu","script":"Urdu","dir":"rtl","text":"Verified lyrics"}],
  "relatedVideos": [{"url":"https://youtu.be/VIDEO_ID"}],
  "status": "draft",
  "createdAt": "2025-05-12T10:00:00Z"
}
```

`artistId`, `artistIds`, and `writerId` use numeric `artists.id` values for newly created or updated lyric records. `reciters` and `writer` remain display strings. Historical string references are retained separately for compatibility and are not backfilled by this change. Related video URLs are validated by the server; only verified YouTube IDs should be embedded.

## Portfolio Management API (Not Implemented)

No Portfolio persistence or API client exists in this repository. Admin Portfolio Management therefore shows the missing-backend state instead of offering browser-only create/edit controls that could be mistaken for real server changes. Backend implementation is required before enabling management.

Suggested authenticated admin operations:

- `GET /api/v1/admin/portfolio?query=&type=&status=&page=&size=` returns a paginated collection.
- `GET /api/v1/admin/portfolio/:id` returns one record.
- `POST /api/v1/admin/portfolio` and `PUT /api/v1/admin/portfolio/:id` create and update portfolio metadata.
- `PATCH /api/v1/admin/portfolio/:id/status` changes publication status.
- `DELETE /api/v1/admin/portfolio/:id` deletes a record.
- `GET /api/v1/portfolio?status=published` returns published records only.

Records should have a validated type (`AUDIO`, `VIDEO`, `SERVICE`, or `PROJECT`), title, description, media URL/provider metadata, display order, visibility/status, and timestamps. Only use media URLs supplied and verified by administrators; validate provider URLs before rendering embeds.

## Quran Ayah Records

The current local model supports a Surah number, Ayah number, Arabic text, per-language translations, and a draft/published status in the demo overlay. It has no transliteration field.

```json
{
  "id": "1:1",
  "surahNumber": 1,
  "ayahNumber": 1,
  "arabic": "Existing verified source text",
  "translations": {"en":"Existing attributed translation","ur":"Existing attributed translation"},
  "status": "published"
}
```

Required operations:

- `GET /api/admin/quran/ayahs?query=&status=` returns `200 { "items": QuranAyahRecord[] }`.
- `GET /api/admin/quran/ayahs/:surahNumber/:ayahNumber` returns `200 { "item": QuranAyahRecord }` or `404`.
- `POST /api/admin/quran/ayahs` accepts a record and returns `201 { "item": QuranAyahRecord }`; duplicate Surah/Ayah pairs return `409`.
- `PUT /api/admin/quran/ayahs/:surahNumber/:ayahNumber` accepts the complete editable record and returns `200 { "item": QuranAyahRecord }` or `404`.
- `PATCH /api/admin/quran/ayahs/:surahNumber/:ayahNumber/status` accepts `{ "status": "draft" | "published" }` and returns `200 { "item": QuranAyahRecord }`.
- `DELETE /api/admin/quran/ayahs/:surahNumber/:ayahNumber` returns `204` or `404`.
- `GET /api/quran/ayahs?status=published` returns public records as `200 { "items": QuranAyahRecord[] }`.

The API must validate Surah/Ayah bounds against the authoritative Quran metadata, preserve Unicode/RTL, track translation source and attribution, and never synthesize missing text. The present local data contains only a sample at 1:1; production use requires verified source records and attribution.

## Artist Management API

Artist Management is available through authenticated frontend service calls and the Spring API. Admin routes require an authenticated `ADMIN` or `SUPER_ADMIN` JWT. Public artist role and active-option routes are read-only.

Role codes are `SINGER`, `WRITER`, `LYRICIST`, `POET`, `RECITER`, `NAAT_KHWAN`, `COMPOSER`, and `OTHER`. Artists can have multiple roles. IDs stay strings: existing slug IDs (`owais-raza-qadri`, `zohaib-ashrafi`, `traditional`) are preserved, and new IDs are generated as URL-safe slugs from the name. Non-Latin letters and combining marks remain in a Unicode slug; numeric IDs are not mixed in.

The Flyway history ends at `V10__create_artists.sql`. V10 creates `artists` and `artist_roles`, constrains status and role values, and seeds the three legacy artist IDs. It does not rewrite lyrics or remove associations. Flyway applies this forward-only migration for local, test, and production profiles; no development-only artist seeder is used. H2 test-profile migration and JPA schema validation are exercised by the backend tests. No live production database was available for inspection or migration.

All responses use the common `{ "data": ..., "error": null, "message": null }` envelope:

- `GET /api/v1/admin/artists?page=&size=&status=&role=&query=` returns a paginated artist list.
- `GET /api/v1/admin/artists/:id` returns one artist or `404`.
- `POST /api/v1/admin/artists` creates an artist (`201`); the server generates a slug ID and rejects duplicate IDs with `409`.
- `PUT /api/v1/admin/artists/:id` updates the name, display name, biography, roles, and optional status.
- `PATCH /api/v1/admin/artists/:id/status` accepts `{ "status": "ACTIVE" | "INACTIVE" }`.
- `DELETE /api/v1/admin/artists/:id` deletes an artist only when no lyric references it through `artist_id`, `writer_id`, or `lyric_artist_ids`; referenced artists return `409` and should be deactivated instead.
- `GET /api/v1/admin/artists/options?role=&query=` returns active artist options for authenticated admin forms.
- `GET /api/v1/admin/artists/roles` returns the supported role codes and labels.
- `GET /api/v1/artists/options?role=&query=` and `GET /api/v1/artists/roles` expose public, read-only options and role labels.

Artist option objects use the numeric database `id` for relationship assignments and expose the string `artistKey` separately for legacy string references.

Artist deletion and image upload are intentionally not implemented. Inactivation retains artist rows and does not delete lyric reference values.

### Lyrics associations and formatting

New lyric assignments use numeric artist IDs from `/api/v1/admin/artists/options`. The backend validates that IDs exist and that writer and reciter assignments have compatible roles. Historical string references remain in legacy columns and are not rewritten by the numeric-ID migration.

Keep the existing language-version document as structured Tiptap JSON and persist formatting marks, including validated `textStyle.color`, `textStyle.fontFamily`, `textStyle.fontSize`, highlight color, and paragraph attributes. The backend must accept only supported font-family names and safe color/size values; it must not persist executable HTML or arbitrary CSS. The public lyrics response must return the same sanitized document used by admin editing.

When these endpoints are approved and implemented, add them to a typed adapter behind the existing API configuration. Replace the browser-demo adapter only for the relevant collections after the backend contract is deployed; do not silently write demo records to production.

## Adapter Replacement

Implement the API adapter behind the existing `list`, `create`, `update`, `remove`, and `replace` repository operations, or add separate typed Lyrics/Quran methods. The public data hooks must then read published API responses and invalidate/refetch after successful admin mutations. Do not use the browser-demo adapter for production data.
