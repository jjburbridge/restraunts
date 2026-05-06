import { defineQuery } from 'next-sanity'
import { client } from './sanity'
import type { Restaurant, Cuisine, Tag, Feature } from '@/types'

const restaurantsQuery = defineQuery(`*[_type == "restaurant"] {
  _id,
  restaurant_name,
  avg_rating,
  default_language,
  gluten_free,
  "locations": locations[]-> {
    _id,
    latitude,
    longitude,
    address
  },
  "cuisines": cuisines[]-> { _id, name },
  "top_tags": top_tags[]-> { _id, name },
  "features": features[]-> { _id, name }
}`)

const cuisinesQuery = defineQuery(`*[_type == "cuisine"] | order(name asc) { _id, name }`)

const tagsQuery = defineQuery(`*[_type == "tag"] | order(name asc) { _id, name }`)

const featuresQuery = defineQuery(`*[_type == "feature"] | order(name asc) { _id, name }`)

export async function getRestaurants(): Promise<Restaurant[]> {
  return client.fetch(restaurantsQuery)
}

export async function getCuisines(): Promise<Cuisine[]> {
  return client.fetch(cuisinesQuery)
}

export async function getTags(): Promise<Tag[]> {
  return client.fetch(tagsQuery)
}

export async function getFeatures(): Promise<Feature[]> {
  return client.fetch(featuresQuery)
}
