import type { Restaurant } from '@/types'
import { formatDistance } from '@/lib/distance'

interface Props {
  restaurant: Restaurant
  distance: number | null
}

export default function RestaurantCard({ restaurant, distance }: Props) {
  const { restaurant_name, avg_rating, cuisines, top_tags, features, gluten_free } = restaurant

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold text-gray-900 leading-snug">
          {restaurant_name ?? 'Unnamed Restaurant'}
        </h2>
        {avg_rating != null && (
          <div className="flex items-center gap-0.5 flex-shrink-0 bg-amber-50 rounded-full px-2 py-0.5">
            <span className="text-amber-400 text-xs">★</span>
            <span className="text-xs font-semibold text-amber-700">{avg_rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {distance !== null && isFinite(distance) && (
        <p className="text-xs text-blue-600 font-medium">{formatDistance(distance)} away</p>
      )}

      <div className="flex flex-wrap gap-1">
        {cuisines?.map((c) => (
          <span
            key={c._id}
            className="text-xs bg-orange-50 text-orange-700 border border-orange-100 rounded-full px-2 py-0.5"
          >
            {c.name}
          </span>
        ))}
        {gluten_free && (
          <span className="text-xs bg-green-50 text-green-700 border border-green-100 rounded-full px-2 py-0.5">
            GF
          </span>
        )}
      </div>

      {top_tags && top_tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {top_tags.map((t) => (
            <span key={t._id} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
              {t.name}
            </span>
          ))}
        </div>
      )}

      {features && features.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {features.map((f) => (
            <span key={f._id} className="text-xs bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">
              {f.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
