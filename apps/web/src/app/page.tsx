import { Suspense } from "react";
import {
  sanityFetch,
  getDynamicFetchOptions,
  type DynamicFetchOptions,
} from "@/sanity/lib/live";
import {
  cuisinesQuery,
  tagsQuery,
  featuresQuery,
  getRestaurantsForAudience,
} from "@/lib/queries";
import {
  parseAudienceConditions,
  toVariantConditions,
  type AudienceConditions,
} from "@/lib/audience";
import type { Restaurant, Cuisine, Tag, Feature } from "@/types";
import RestaurantApp from "@/components/RestaurantApp";
import AudiencePicker from "@/components/AudiencePicker";

// `searchParams` drives the audience conditions, so this route always renders
// through a Suspense boundary (no draftMode branch) per the Sanity Live + Cache
// Components three-layer pattern.
export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<HomeFallback />}>
      <DynamicHome searchParams={searchParams} />
    </Suspense>
  );
}

async function DynamicHome({
  searchParams,
}: Pick<PageProps<"/">, "searchParams">) {
  const [resolvedSearchParams, { perspective, stega }] = await Promise.all([
    searchParams,
    getDynamicFetchOptions(),
  ]);
  const conditions = parseAudienceConditions(resolvedSearchParams);
  return (
    <CachedHome conditions={conditions} perspective={perspective} stega={stega} />
  );
}

async function CachedHome({
  conditions,
  perspective,
  stega,
}: { conditions: AudienceConditions } & DynamicFetchOptions) {
  "use cache";
  const [restaurants, { data: cuisines }, { data: tags }, { data: features }] =
    await Promise.all([
      // Restaurants are resolved for the selected audience via Content Variants.
      getRestaurantsForAudience(toVariantConditions(conditions)),
      // Filter facets don't vary by audience, so they keep the live pipeline.
      sanityFetch({ query: cuisinesQuery, perspective, stega }),
      sanityFetch({ query: tagsQuery, perspective, stega }),
      sanityFetch({ query: featuresQuery, perspective, stega }),
    ]);

  return (
    <HomeShell toolbar={<AudiencePicker current={conditions} />}>
      <RestaurantApp
        restaurants={restaurants as unknown as Restaurant[]}
        cuisines={cuisines as unknown as Cuisine[]}
        tags={tags as unknown as Tag[]}
        features={features as unknown as Feature[]}
      />
    </HomeShell>
  );
}

function HomeShell({
  children,
  toolbar,
}: {
  children: React.ReactNode;
  toolbar?: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-5 py-3.5 flex items-center gap-3">
        <svg
          className="w-5 h-5 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <h1 className="text-lg font-semibold text-gray-900">
          Restaurants Near Me
        </h1>
        {toolbar && <div className="ml-auto">{toolbar}</div>}
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function HomeFallback() {
  return (
    <HomeShell>
      <div className="h-full flex items-center justify-center text-sm text-gray-500">
        Loading restaurants…
      </div>
    </HomeShell>
  );
}
