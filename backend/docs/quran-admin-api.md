# Quran administration API

All `/api/v1/admin/quran/**` routes require an authenticated `ADMIN` or
`SUPER_ADMIN` token. Public Quran reading remains under `/api/v1/quran/**`.

## Public translator selection and translations

The public reader can use these unauthenticated `GET` routes:

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/quran/translators?language={en\|hi\|ur}` | List public-safe translator IDs, names, and language codes; the language filter is optional |
| GET | `/api/v1/quran/surahs/{number}/translations?languages=en&languages=ur` | List published translation rows for selected languages in a published Surah |
| GET | `/api/v1/quran/juz/{number}/translations?languages=en&languages=ur` | List published translation rows for selected languages in a Juz |

Translation rows identify the Surah, Ayah, language, translator ID, translator
name, and text. The public response omits publication status and excludes
unpublished translations, Ayahs, and Surahs. Translator responses omit
administrative source and license metadata. These additive endpoints leave
the existing single-language `/ayahs?translation=...` response unchanged.
That legacy response still emits one row per Ayah and uses the lowest
translator ID when several published translations exist for its language;
the new translation routes are required to retrieve all selected translators.

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
| PATCH | `/api/v1/admin/quran/ayahs/{surah}/{ayah}/translations/{language}/{translatorId}/status` | Publish or unpublish one translator's translation |
| GET | `/api/v1/admin/quran/translators?language={en\|hi\|ur}` | List translators, optionally filtered by language |
| POST | `/api/v1/admin/quran/translators` | Add translator metadata |

Only `en`, `hi`, and `ur` are accepted translation languages. A translator's
registered language must match the translation route. Translation rows are
unique by `(surah_number, ayah_number, language_code, translator_id)`, so
multiple translators can have separate translations for one Ayah and language.
The legacy status route remains compatible when only one translation exists
for that Ayah and language; it returns a conflict rather than updating an
arbitrary translator when multiple rows exist. Use the translator-ID route in
that case.

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
required and must belong to the same language. Existing translations from that
same translator are rejected without replacing the row, while another
translator's translation in that language can be added. Each import row still
contains at most one translation per language. Translator names, source
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
an existing translation from the same translator and language causes a
validation conflict, while a different translator may be added.
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
