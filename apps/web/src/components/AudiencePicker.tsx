'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  AUDIENCE_DIMENSIONS,
  type AudienceConditions,
  type AudienceKey,
} from '@/lib/audience'

interface Props {
  /** The conditions currently applied on the server (from the URL). */
  current: AudienceConditions
}

/**
 * Lets a visitor describe their audience along the `trial`, `site`, and
 * `variant` dimensions. Selections are written to the URL query string, which
 * the server reads to build the `variant` conditions for the GROQ fetch.
 */
export default function AudiencePicker({ current }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setCondition = useCallback(
    (key: AudienceKey, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const reset = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    for (const dimension of AUDIENCE_DIMENSIONS) params.delete(dimension.key)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [router, pathname, searchParams])

  const activeCount = AUDIENCE_DIMENSIONS.filter((d) => current[d.key]).length

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 hidden md:block">
        Audience
      </span>
      {AUDIENCE_DIMENSIONS.map((dimension) => (
        <select
          key={dimension.key}
          aria-label={dimension.label}
          value={current[dimension.key] ?? ''}
          onChange={(e) => setCondition(dimension.key, e.target.value)}
          className={`rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            current[dimension.key]
              ? 'border-blue-300 bg-blue-50 text-blue-800'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <option value="">{dimension.label}: Any</option>
          {dimension.options.map((option) => (
            <option key={option.value} value={option.value}>
              {dimension.label}: {option.label}
            </option>
          ))}
        </select>
      ))}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={reset}
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Reset
        </button>
      )}
    </div>
  )
}
