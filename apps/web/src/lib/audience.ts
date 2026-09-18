/**
 * Audience targeting for Content Variants.
 *
 * The picker lets a visitor describe themselves along three condition
 * dimensions — `trial`, `site`, and `variant`. Those selections are sent to the
 * Content Lake as a `variant` conditions object on the fetch (NOT as GROQ
 * query params); the API finds variant definitions whose conditions are a
 * subset of what we send and overlays the best match per document, falling back
 * to base (published) content otherwise.
 *
 * @see https://www.sanity.io/docs/content-variants/querying-variants
 *
 * The option lists below are intentionally simple placeholders — edit them to
 * match the condition values your variant definitions actually use.
 */

export interface AudienceOption {
  value: string;
  label: string;
}

export interface AudienceDimension {
  key: AudienceKey;
  label: string;
  options: AudienceOption[];
}

export type AudienceKey = "trial" | "site" | "variant";

export const AUDIENCE_KEYS: readonly AudienceKey[] = [
  "trial",
  "site",
  "variant",
];

export const AUDIENCE_DIMENSIONS: readonly AudienceDimension[] = [
  {
    key: "trial",
    label: "Trial",
    options: [
      { value: "1", label: "Trial 1" },
      { value: "2", label: "Trial 2" },
    ],
  },
  {
    key: "site",
    label: "Site",
    options: [
      { value: "1", label: "Site 1" },
      { value: "2", label: "Site 2" },
      { value: "3", label: "Site 3" },
    ],
  },
  {
    key: "variant",
    label: "Variant",
    options: [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ],
  },
];

/** Only the condition keys a visitor has actually selected. */
export type AudienceConditions = Partial<Record<AudienceKey, string>>;

function isValidValue(dimension: AudienceDimension, value: string): boolean {
  return dimension.options.some((option) => option.value === value);
}

/**
 * Parse a Next.js `searchParams` object into validated audience conditions.
 * Unknown keys and values that don't match a configured option are dropped, so
 * arbitrary query strings can't be injected into the `variant` conditions.
 */
export function parseAudienceConditions(
  searchParams: Record<string, string | string[] | undefined>,
): AudienceConditions {
  const conditions: AudienceConditions = {};
  for (const dimension of AUDIENCE_DIMENSIONS) {
    const raw = searchParams[dimension.key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === "string" && isValidValue(dimension, value)) {
      conditions[dimension.key] = value;
    }
  }
  return conditions;
}

/**
 * Shape the selected conditions for `@sanity/client`'s `variant` fetch option.
 * Returns `undefined` when nothing is selected so queries return base content.
 */
export function toVariantConditions(
  conditions: AudienceConditions,
): Record<string, string> | undefined {
  const entries = Object.entries(conditions).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === "string" && entry[1] !== "",
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
