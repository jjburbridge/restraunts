import { getRestaurants, getCuisines, getTags, getFeatures } from '@/lib/queries'
import RestaurantApp from '@/components/RestaurantApp'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [restaurants, cuisines, tags, features] = await Promise.all([
    getRestaurants(),
    getCuisines(),
    getTags(),
    getFeatures(),
  ])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-5 py-3.5 flex items-center gap-3">
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h1 className="text-lg font-semibold text-gray-900">Restaurants Near Me</h1>
      </header>
      <div className="flex-1 min-h-0">
        <RestaurantApp
          restaurants={restaurants}
          cuisines={cuisines}
          tags={tags}
          features={features}
        />
      </div>
    </div>
  )
}
