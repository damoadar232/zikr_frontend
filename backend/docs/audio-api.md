# Public Audio API

## List published audio

`GET /api/public/audios`

Returns a paginated list of published audio records. Existing query, category,
language, sorting, and paging parameters remain available:

| Parameter | Description |
| --- | --- |
| `page` | Zero-based page number (default `0`) |
| `size` | Page size from `1` to `100` (default `20`) |
| `query` | Optional title search |
| `categoryKey` | Optional active category filter |
| `languageCode` | Optional language filter |
| `artistId` | Optional global Artist ID; matches only the `SINGER` relationship |
| `sort` | `title`, `publishedDate`, `createdAt`, `updatedAt`, or `id` |
| `direction` | `ASC` or `DESC` |

The `artistId` filter uses the `audio_artist_ids` relationship table and returns
each published Audio record once, even if it has multiple singer assignments.
Writer assignments do not satisfy this filter. Audio records without a global
Singer assignment remain available in the unfiltered listing.

The public response includes singer and writer identity fields, including global
Artist IDs and profile image URLs. It does not expose Cloudinary public IDs,
original filenames, or upload metadata.

## Get published audio

`GET /api/public/audios/{id}`

Returns one published Audio record with the same public DTO shape as the list.
