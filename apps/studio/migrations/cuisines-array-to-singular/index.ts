import {defineMigration, at, set} from 'sanity/migrate'

/**
 * The `cuisines` field on the restaurant schema used to be an array of
 * references to `cuisine` documents, but has since been changed to a single
 * reference. This migration rewrites the existing array-shaped value on each
 * restaurant document to the singular reference shape.
 *
 * Audit before writing: every restaurant with an array-shaped `cuisines`
 * contains exactly one entry, so we can safely take `cuisines[0]` without any
 * data loss. Restaurants with no `cuisines` at all are ignored (they will not
 * match the filter and no patch will be produced for them).
 *
 * After running this migration the shape moves from:
 *   { cuisines: [{ _type: 'reference', _ref: '...', _key: '...' }] }
 * to:
 *   { cuisines: { _type: 'reference', _ref: '...' } }
 */
export default defineMigration({
  title: 'Convert cuisines from array of references to a single reference',
  documentTypes: ['restaurant'],
  filter: 'defined(cuisines[0])',
  migrate: {
    document(doc) {
      const cuisines = doc.cuisines as
        | {_ref?: string; _type?: string}[]
        | undefined
      const firstRef = cuisines?.[0]?._ref
      if (!firstRef) return
      return at('cuisines', set({_type: 'reference', _ref: firstRef}))
    },
  },
})
