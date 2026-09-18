import {defineMigration, at, set, unset} from 'sanity/migrate'

/**
 * The `location` schema used to store position as two separate `number` fields,
 * `latitude` and `longitude`. It now uses a single `geopoint` field named
 * `coordinates` (shape: `{ _type: 'geopoint', lat, lng }`).
 *
 * This migration copies each location's existing `latitude`/`longitude` into a
 * new `coordinates` geopoint and removes the old fields.
 *
 * Audit before writing: all 33 location documents (including drafts) define
 * both `latitude` and `longitude`, and none has `coordinates` yet, so the
 * conversion is lossless and idempotent (docs already migrated no longer match
 * the filter).
 *
 * Shape moves from:
 *   { latitude: 53.8008, longitude: -1.5491 }
 * to:
 *   { coordinates: { _type: 'geopoint', lat: 53.8008, lng: -1.5491 } }
 */
export default defineMigration({
  title: 'Convert location latitude/longitude to a geopoint',
  documentTypes: ['location'],
  filter: 'defined(latitude) && defined(longitude)',
  migrate: {
    document(doc) {
      const lat = doc.latitude as number | undefined
      const lng = doc.longitude as number | undefined
      if (typeof lat !== 'number' || typeof lng !== 'number') return

      return [
        at('coordinates', set({_type: 'geopoint', lat, lng})),
        at('latitude', unset()),
        at('longitude', unset()),
      ]
    },
  },
})
