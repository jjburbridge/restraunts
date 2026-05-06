export interface Address {
  line1: string
  line2?: string
  town: string
  county?: string
  postcode: string
  country: string
}

export interface RestaurantLocation {
  _id: string
  latitude: number
  longitude: number
  address: Address
}

export interface Cuisine {
  _id: string
  name: string
}

export interface Tag {
  _id: string
  name: string
}

export interface Feature {
  _id: string
  name: string
}

export interface Restaurant {
  _id: string
  restaurant_name: string
  avg_rating: number
  default_language: string
  gluten_free?: boolean
  locations: RestaurantLocation[]
  cuisines: Cuisine[]
  top_tags: Tag[]
  features: Feature[]
}
