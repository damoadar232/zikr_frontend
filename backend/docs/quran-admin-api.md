# Quran administration API

All `/api/v1/admin/quran/**` routes require an authenticated `ADMIN` or
`SUPER_ADMIN` token. Public Quran reading remains under `/api/v1/quran/**`.

## Existing-content management

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/admin/quran/surahs` | List canonical Surah metadata, including publication status |
| GET | `/api/v1/admin/quran/surahs/{number}` | View one Surah |
| PUT | `/api/v1/admin/quran/surahs/{number}` | Update names and optional revelation metadata; the Surah number, Ayah count, and revelation order are immutable here |
| PATCH | `/api/v1/admin/quran/surahs/{number}/status` | Publish or unpublish an existing Surah |
| GET | `/api/v1/admin/quran/ayahs?surah={number}` | List all Ayahs, including drafts |
| GET | `/api/v1/admin/quran/ayahs/{surah}/{ayah}` | View one Ayah |
| POST | `/api/v1/admin/quran/ayahs` | Create an Ayah; status defaults to `DRAFT` |
| PUT | `/api/v1/admin/quran/ayahs/{surah}/{ayah}` | Update Arabic text and optionally status; request address must match the URL |
| PATCH | `/api/v1/admin/quran/ayahs/{surah}/{ayah}/status` | Publish or unpublish an Ayah |
| GET | `/api/v1/admin/quran/ayahs/{surah}/{ayah}/translations` | List the existing translations |
| PUT | `/api/v1/admin/quran/ayahs/{surah}/{ayah}/translations/{language}` | Create or update a translation |
| PATCH | `/api/v1/admin/quran/ayahs/{surah}/{ayah}/translations/{language}/status` | Publish or unpublish a translation |
| GET | `/api/v1/admin/quran/translators?language={en\|hi\|ur}` | List translators, optionally filtered by language |
| POST | `/api/v1/admin/quran/translators` | Add translator metadata |

Only `en`, `hi`, and `ur` are accepted translation languages. A translator's
registered language must match the translation route. The existing schema
uniquely permits one translation for each `(surah_number, ayah_number,
language_code)`. This phase does not change that constraint or support
multiple translators for the same Ayah and language.

## JSON bulk-import workflow

The JSON envelope is:

```json
{
  "rows": [
    {
      "surahNumber": 2,
      "ayahNumber": 1,
      "arabicText": "<verified Arabic text>",
      "translationEn": "<verified English translation>",
      "translatorIdEn": 123
    }
  ]
}
```

Translations are optional. If a translation is provided, its translator ID is
required and must belong to the same language. Translator names, source
references, license terms, and content must be verified by the administrator;
the API does not supply or infer any of these.

1. `POST /api/v1/admin/quran/import/validate` validates the full batch without
   writing. It returns row numbers, fields, error codes, and messages. A valid
   preview reports `totalRows`, `validRows`, and `errorCount`.
2. `POST /api/v1/admin/quran/import/commit` validates again and commits the
   whole request in one transaction. Invalid batches return `422` and write
   nothing; database or uniqueness failures roll back the transaction.

The commit policy is append-only. Arabic text is mandatory on every row. New
Ayahs and translations are created as drafts. An existing Ayah may be included
only with exactly matching Arabic text, to allow adding a missing translation;
existing translations for the same language cause a validation conflict.
Imports never replace existing Arabic text or translations, and they never
change publication status. Use the explicit admin editor endpoints for an
intentional update. This preserves the existing IDs and avoids partial or
silent replacement.

No Quran content is bundled or imported by this API change. The current corpus
must be populated from a separately approved and verified source before the
application can provide complete Quran reading.

## Persistence and audio

These endpoints use the existing `surahs`, `ayahs`, `translations`, and
`translators` tables. No migration is required for the supported operations.
No audio URLs or reciter licensing metadata are introduced; audio management
remains out of scope until an approved source is confirmed.
