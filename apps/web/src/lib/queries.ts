import { defineQuery } from 'next-sanity'
import { client, variantClient } from '@/sanity/lib/client'
import type { Restaurant, Cuisine, Tag, Feature } from '@/types'

const restaurantFields = `
  _id,
  restaurant_name,
  avg_rating,
  default_language,
  gluten_free,
  "locations": locations[]-> {
    _id,
    "latitude": coordinates.lat,
    "longitude": coordinates.lng,
    address
  },
  "cuisines": cuisines-> { _id, name },
  "top_tags": top_tags[]-> { _id, name },
  "features": features[]-> { _id, name }
`

const restaurantProjection = `{${restaurantFields}}`

export const restaurantsQuery = defineQuery(
  `*[_type == "restaurant"] ${restaurantProjection}`,
)

export const restaurantByIdQuery = defineQuery(
  `*[_type == "restaurant" && _id == $id][0] ${restaurantProjection}`,
)

// Restaurants with at least one location within `$maxMeters` of the given
// `$lat`/`$lng`, ordered nearest-first. Locations store their position as a
// `geopoint`, which `geo::distance` accepts directly; the origin is built with
// `geo::latLng`. `geo::distance` returns meters. `distanceMeters` is the
// distance to the restaurant's closest location.
export const restaurantsNearbyQuery = defineQuery(
  `*[
    _type == "restaurant" &&
    count(
      locations[]->[
        defined(coordinates) &&
        geo::distance(coordinates, geo::latLng($lat, $lng)) <= $maxMeters
      ]
    ) > 0
  ]{
    ${restaurantFields},
    "distanceMeters": math::min(
      locations[]->{
        "d": geo::distance(coordinates, geo::latLng($lat, $lng))
      }.d
    )
  } | order(distanceMeters asc)`,
)

export const restaurantIdsQuery = defineQuery(
  `*[_type == "restaurant" && defined(_id)]{ "id": _id }`,
)

export const restaurantNameByIdQuery = defineQuery(
  `*[_type == "restaurant" && _id == $id][0]{ restaurant_name }`,
)

export const cuisinesQuery = defineQuery(
  `*[_type == "cuisine"] | order(name asc) { _id, name }`,
)

export const tagsQuery = defineQuery(
  `*[_type == "tag"] | order(name asc) { _id, name }`,
)

export const featuresQuery = defineQuery(
  `*[_type == "feature"] | order(name asc) { _id, name }`,
)

// Browser-safe helpers used by the client component. Stega encoding is disabled
// because the data is rendered as JSON, not surfaced through Visual Editing.
export async function getRestaurants(): Promise<Restaurant[]> {
  return client.fetch(restaurantsQuery, {}, { stega: false })
}

export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  return client.fetch(restaurantByIdQuery, { id }, { stega: false })
}

export type RestaurantWithDistance = Restaurant & { distanceMeters: number }

/**
 * Restaurants within `maxKm` of the given latitude/longitude, nearest first.
 * `distanceMeters` on each result is the distance to its closest location.
 */
export async function getRestaurantsNearby(
  lat: number,
  lng: number,
  maxKm: number,
): Promise<RestaurantWithDistance[]> {
  return client.fetch(
    restaurantsNearbyQuery,
    { lat, lng, maxMeters: maxKm * 1000 },
    { stega: false },
  )
}

/**
 * Restaurants resolved for a given audience, using Content Variants.
 *
 * The visitor's conditions are passed via the `variant` fetch option (served
 * only by the `vX` API — see `variantClient`). When `conditions` is undefined
 * or empty this returns base (published) content, identical to a normal fetch.
 *
 * @see https://www.sanity.io/docs/content-variants/querying-variants
 */
export async function getRestaurantsForAudience(
  conditions?: Record<string, string>,
): Promise<Restaurant[]> {
  return variantClient.fetch(
    restaurantsQuery,
    {},
    {
      variant: conditions && Object.keys(conditions).length > 0 ? conditions : undefined,
      stega: false,
    },
  )
}

export async function getCuisines(): Promise<Cuisine[]> {
  return client.fetch(cuisinesQuery, {}, { stega: false })
}

export async function getTags(): Promise<Tag[]> {
  return client.fetch(tagsQuery, {}, { stega: false })
}

export async function getFeatures(): Promise<Feature[]> {
  return client.fetch(featuresQuery, {}, { stega: false })
}
