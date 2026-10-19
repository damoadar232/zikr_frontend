# Admin Content API Contract

The repository currently contains no content API, database client, server-side session, or administrator role model. `AdminContentPage` therefore uses `contentRepository` in `browser-demo` mode only. Its records persist in this browser's local storage and are not a production content-management backend.

## Required Authorization

Every `/api/admin/*` endpoint must require a server-issued authenticated session and an administrator role. The server must validate authorization for every request; hiding a route or trusting `zikr-authenticated` in local storage is not authorization. Cookie-authenticated write requests must also enforce CSRF protection. Public endpoints must return published content only.

## Lyrics Records

`LyricsRecord` payloads must preserve the existing model and add a multi-reciter list:

```json
{
  "id": "mustafa-jaan-e-rehmat",
  "slug": "mustafa-jaan-e-rehmat",
  "title": "Mustafa Jaan-e-Rehmat",
  "artistId": "owais-raza-qadri",
  "artistIds": ["owais-raza-qadri"],
  "reciters": ["Owais Raza Qadri"],
  "writerId": "imam-ahmed-raza-khan",
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

Required operations:

- `GET /api/admin/lyrics?query=&status=` returns `200 { "items": LyricsRecord[] }`.
- `GET /api/admin/lyrics/:id` returns `200 { "item": LyricsRecord }` or `404`.
- `POST /api/admin/lyrics` accepts a complete record without a server-generated `id` when preferred; returns `201 { "item": LyricsRecord }`. The server must reject duplicate IDs/slugs with `409`.
- `PUT /api/admin/lyrics/:id` accepts the complete editable record and returns `200 { "item": LyricsRecord }` or `404`.
- `PATCH /api/admin/lyrics/:id/status` accepts `{ "status": "draft" | "published" }` and returns `200 { "item": LyricsRecord }`.
- `DELETE /api/admin/lyrics/:id` returns `204` or `404`.
- `GET /api/lyrics?status=published` returns public published records as `200 { "items": LyricsRecord[] }`.

`reciters` is the canonical display list. Keep `artistId` for legacy records and `artistIds` for normalized directory filtering. Migrate without dropping the legacy field or names. Related video URLs are validated by the server; only verified YouTube IDs should be embedded.

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

## Adapter Replacement

Implement the API adapter behind the existing `list`, `create`, `update`, `remove`, and `replace` repository operations, or add separate typed Lyrics/Quran methods. The public data hooks must then read published API responses and invalidate/refetch after successful admin mutations. Do not use the browser-demo adapter for production data.
