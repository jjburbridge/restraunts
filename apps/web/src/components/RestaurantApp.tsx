'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { Restaurant, Cuisine, Tag, Feature } from '@/types'
import { nearestKm } from '@/lib/distance'
import FilterPanel from './FilterPanel'
import RestaurantCard from './RestaurantCard'

const MapView = dynamic(() => import('./MapView'), { ssr: false })

type SortBy = 'distance' | 'rating'
type ViewMode = 'list' | 'map'

interface Props {
  restaurants: Restaurant[]
  cuisines: Cuisine[]
  tags: Tag[]
  features: Feature[]
}

export default function RestaurantApp({ restaurants, cuisines, tags, features }: Props) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [selectedCuisines, setSelectedCuisines] = useState<Set<string>>(new Set())
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<SortBy>('rating')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setSortBy('distance')
      },
      () => {},
    )
  }, [])

  const toggle = useCallback(
    (setFn: (s: Set<string>) => void, current: Set<string>, id: string) => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      setFn(next)
    },
    [],
  )

  const clearAll = useCallback(() => {
    setSelectedCuisines(new Set())
    setSelectedTags(new Set())
    setSelectedFeatures(new Set())
  }, [])

  const activeFilterCount = selectedCuisines.size + selectedTags.size + selectedFeatures.size

  const filtered = useMemo(
    () =>
      restaurants.filter((r) => {
        if (
          selectedCuisines.size > 0 &&
          !(r.cuisines?._id ? selectedCuisines.has(r.cuisines._id) : false)
        )
          return false
        if (
          selectedTags.size > 0 &&
          !(r.top_tags ?? []).some((t) => selectedTags.has(t._id))
        )
          return false
        if (
          selectedFeatures.size > 0 &&
          !(r.features ?? []).some((f) => selectedFeatures.has(f._id))
        )
          return false
        return true
      }),
    [restaurants, selectedCuisines, selectedTags, selectedFeatures],
  )

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (sortBy === 'distance' && userLocation) {
          return (
            nearestKm(userLocation.lat, userLocation.lon, a.locations ?? []) -
            nearestKm(userLocation.lat, userLocation.lon, b.locations ?? [])
          )
        }
        return (b.avg_rating ?? 0) - (a.avg_rating ?? 0)
      }),
    [filtered, sortBy, userLocation],
  )

  const distanceFn = useCallback(
    (r: Restaurant) =>
      userLocation ? nearestKm(userLocation.lat, userLocation.lon, r.locations ?? []) : null,
    [userLocation],
  )

  const filterPanel = (
    <FilterPanel
      cuisines={cuisines}
      tags={tags}
      features={features}
      selectedCuisines={selectedCuisines}
      selectedTags={selectedTags}
      selectedFeatures={selectedFeatures}
      onToggleCuisine={(id) => toggle(setSelectedCuisines, selectedCuisines, id)}
      onToggleTag={(id) => toggle(setSelectedTags, selectedTags, id)}
      onToggleFeature={(id) => toggle(setSelectedFeatures, selectedFeatures, id)}
      onClear={clearAll}
      activeCount={activeFilterCount}
    />
  )

  return (
    <div className="h-full flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-gray-200 bg-white overflow-y-auto flex-shrink-0">
        {filterPanel}
      </aside>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Controls bar */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
          {/* Mobile filter toggle */}
          <button
            onClick={() => setMobileFiltersOpen((o) => !o)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M11 20h2" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>

          <span className="text-sm text-gray-400 hidden sm:block">
            {sorted.length} restaurant{sorted.length !== 1 ? 's' : ''}
          </span>

          <div className="flex-1" />

          {/* Sort toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-sm">
            <button
              onClick={() => setSortBy('distance')}
              disabled={!userLocation}
              title={!userLocation ? 'Enable location access to sort by distance' : undefined}
              className={`px-3 py-1 rounded-md font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                sortBy === 'distance'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Nearest
            </button>
            <button
              onClick={() => setSortBy('rating')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                sortBy === 'rating'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Top rated
            </button>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Map
            </button>
          </div>
        </div>

        {/* Mobile filter drawer */}
        {mobileFiltersOpen && (
          <div className="lg:hidden bg-white border-b border-gray-200 overflow-y-auto max-h-72">
            {filterPanel}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-auto">
          {viewMode === 'map' ? (
            <div className="h-full">
              <MapView
                restaurants={sorted}
                userLocation={userLocation}
                distanceFn={distanceFn}
              />
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <p className="text-gray-500 text-sm">No restaurants match the selected filters.</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAll}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {sorted.map((r) => (
                <RestaurantCard key={r._id} restaurant={r} distance={distanceFn(r)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
