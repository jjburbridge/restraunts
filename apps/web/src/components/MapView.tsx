'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Restaurant } from '@/types'
import { formatDistance } from '@/lib/distance'

function pinIcon(color: string) {
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.5 12 24 12 24S24 20.5 24 12C24 5.4 18.6 0 12 0z"
        fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4.5" fill="white" opacity="0.9"/>
    </svg>`,
    className: '',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -38],
  })
}

const restaurantPin = pinIcon('#2563eb')
const userPin = pinIcon('#dc2626')

function AutoFit({
  restaurants,
  userLocation,
}: {
  restaurants: Restaurant[]
  userLocation: { lat: number; lon: number } | null
}) {
  const map = useMap()

  useEffect(() => {
    const pts: [number, number][] = []
    restaurants.forEach((r) =>
      (r.locations ?? []).forEach((l) => {
        if (l.latitude && l.longitude) pts.push([l.latitude, l.longitude])
      }),
    )
    if (userLocation) pts.push([userLocation.lat, userLocation.lon])

    if (pts.length === 1) map.setView(pts[0], 14)
    else if (pts.length > 1) map.fitBounds(pts, { padding: [48, 48] })
  }, [restaurants, userLocation, map])

  return null
}

interface Props {
  restaurants: Restaurant[]
  userLocation: { lat: number; lon: number } | null
  distanceFn: (r: Restaurant) => number | null
}

export default function MapView({ restaurants, userLocation, distanceFn }: Props) {
  return (
    <MapContainer
      center={[51.5074, -0.1278]}
      zoom={10}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <AutoFit restaurants={restaurants} userLocation={userLocation} />

      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lon]} icon={userPin}>
          <Popup>
            <span className="font-medium text-sm">You are here</span>
          </Popup>
        </Marker>
      )}

      {restaurants.flatMap((r) =>
        (r.locations ?? [])
          .filter((l) => l.latitude && l.longitude)
          .map((l) => {
            const dist = distanceFn(r)
            return (
              <Marker
                key={`${r._id}-${l._id}`}
                position={[l.latitude, l.longitude]}
                icon={restaurantPin}
              >
                <Popup>
                  <div className="min-w-32">
                    <p className="font-semibold text-sm text-gray-900">{r.restaurant_name}</p>
                    {r.avg_rating != null && (
                      <p className="text-xs text-amber-600 mt-0.5">★ {r.avg_rating.toFixed(1)}</p>
                    )}
                    {dist !== null && isFinite(dist) && (
                      <p className="text-xs text-blue-600 mt-0.5">{formatDistance(dist)} away</p>
                    )}
                    {l.address && (
                      <p className="text-xs text-gray-400 mt-1">
                        {[l.address.line1, l.address.town].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          }),
      )}
    </MapContainer>
  )
}
