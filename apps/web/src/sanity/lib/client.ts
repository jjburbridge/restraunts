import { createClient } from 'next-sanity'

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2026-05-29',
  useCdn: true,
  perspective: 'published',
  stega: {
    studioUrl: process.env.NEXT_PUBLIC_SANITY_STUDIO_URL || 'http://localhost:3333',
  },
})

/**
 * Content Variants are only served by the experimental `X` (vX) version of the
 * Content Lake API, and the CDN can't be used for it. This client reuses the
 * base configuration but pins `apiVersion: 'X'` and disables the CDN so we can
 * pass visitor conditions via the `variant` fetch option.
 *
 * @see https://www.sanity.io/docs/content-variants/querying-variants
 */
export const variantClient = client.withConfig({
  apiVersion: 'X',
  useCdn: false,
})
