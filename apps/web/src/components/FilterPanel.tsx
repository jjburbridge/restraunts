'use client'

import type { Cuisine, Tag, Feature } from '@/types'

interface SectionProps {
  title: string
  items: { _id: string; name: string }[]
  selected: Set<string>
  onToggle: (id: string) => void
}

function FilterSection({ title, items, selected, onToggle }: SectionProps) {
  if (items.length === 0) return null
  return (
    <div className="px-4 py-3 border-b border-gray-100 last:border-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item._id}>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selected.has(item._id)}
                onChange={() => onToggle(item._id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 select-none">
                {item.name}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface Props {
  cuisines: Cuisine[]
  tags: Tag[]
  features: Feature[]
  selectedCuisines: Set<string>
  selectedTags: Set<string>
  selectedFeatures: Set<string>
  onToggleCuisine: (id: string) => void
  onToggleTag: (id: string) => void
  onToggleFeature: (id: string) => void
  onClear: () => void
  activeCount: number
}

export default function FilterPanel({
  cuisines,
  tags,
  features,
  selectedCuisines,
  selectedTags,
  selectedFeatures,
  onToggleCuisine,
  onToggleTag,
  onToggleFeature,
  onClear,
  activeCount,
}: Props) {
  return (
    <div>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="font-semibold text-gray-900 text-sm">Filters</span>
        {activeCount > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all
          </button>
        )}
      </div>
      <FilterSection
        title="Cuisine"
        items={cuisines}
        selected={selectedCuisines}
        onToggle={onToggleCuisine}
      />
      <FilterSection
        title="Tags"
        items={tags}
        selected={selectedTags}
        onToggle={onToggleTag}
      />
      <FilterSection
        title="Features"
        items={features}
        selected={selectedFeatures}
        onToggle={onToggleFeature}
      />
    </div>
  )
}
