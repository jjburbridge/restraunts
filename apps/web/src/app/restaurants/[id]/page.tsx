import { Suspense } from "react";
import { notFound } from "next/navigation";
import { draftMode } from "next/headers";
import Link from "next/link";
import {
  sanityFetch,
  sanityFetchStaticParams,
  sanityFetchMetadata,
  getDynamicFetchOptions,
  type DynamicFetchOptions,
} from "@/sanity/lib/live";
import {
  restaurantByIdQuery,
  restaurantIdsQuery,
  restaurantNameByIdQuery,
} from "@/lib/queries";
import type { Restaurant } from "@/types";

export async function generateStaticParams() {
  const { data } = await sanityFetchStaticParams({ query: restaurantIdsQuery });
  const rows = (data ?? []) as { id: string }[];
  return rows.map((row) => ({ id: row.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/restaurants/[id]">) {
  const [{ id }, { perspective }] = await Promise.all([
    params,
    getDynamicFetchOptions(),
  ]);
  const { data } = await sanityFetchMetadata({
    query: restaurantNameByIdQuery,
    params: { id: decodeURIComponent(id) },
    perspective,
  });
  const name = (data as { restaurant_name?: string } | null)?.restaurant_name;
  if (!name) return { title: "Restaurant not found" };
  return { title: `${name} · Restaurants Near Me` };
}

export default async function RestaurantPage({
  params,
}: PageProps<"/restaurants/[id]">) {
  const { isEnabled: isDraftMode } = await draftMode();

  if (!isDraftMode) {
    const { id } = await params;
    return (
      <CachedRestaurant
        id={decodeURIComponent(id)}
        perspective="published"
        stega={false}
      />
    );
  }

  return (
    <Suspense fallback={<RestaurantFallback />}>
      <DynamicRestaurant params={params} />
    </Suspense>
  );
}

async function DynamicRestaurant({
  params,
}: Pick<PageProps<"/restaurants/[id]">, "params">) {
  const [{ id }, { perspective, stega }] = await Promise.all([
    params,
    getDynamicFetchOptions(),
  ]);
  return (
    <CachedRestaurant
      id={decodeURIComponent(id)}
      perspective={perspective}
      stega={stega}
    />
  );
}

async function CachedRestaurant({
  id,
  perspective,
  stega,
}: { id: string } & DynamicFetchOptions) {
  "use cache";
  console.log("CachedRestaurant ran at", new Date().toISOString());
  const { data } = await sanityFetch({
    query: restaurantByIdQuery,
    params: { id },
    perspective,
    stega,
  });

  if (!data) notFound();

  const restaurant = data as unknown as Restaurant;
  const {
    restaurant_name,
    avg_rating,
    gluten_free,
    cuisines,
    top_tags,
    features,
    locations,
  } = restaurant;

  return (
    <RestaurantShell>
      <section className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {restaurant_name}
          </h1>
          {avg_rating != null && (
            <div className="flex items-center gap-1 bg-amber-50 rounded-full px-3 py-1">
              <span className="text-amber-400">★</span>
              <span className="text-sm font-semibold text-amber-700">
                {avg_rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {cuisines?.name && (
            <span
              key={cuisines._id}
              className="text-xs bg-orange-50 text-orange-700 border border-orange-100 rounded-full px-2.5 py-1"
            >
              {cuisines.name}
            </span>
          )}
          {gluten_free && (
            <span className="text-xs bg-green-50 text-green-700 border border-green-100 rounded-full px-2.5 py-1">
              Gluten-free
            </span>
          )}
        </div>
      </section>

      {top_tags && top_tags.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Tags
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {top_tags.map((t) => (
              <span
                key={t._id}
                className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1"
              >
                {t.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {features && features.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Features
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {features.map((f) => (
              <span
                key={f._id}
                className="text-xs bg-blue-50 text-blue-700 rounded-full px-2.5 py-1"
              >
                {f.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {locations && locations.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Locations
          </h2>
          <ul className="flex flex-col gap-3">
            {locations.map((loc) => (
              <li
                key={loc._id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-1"
              >
                <p className="text-sm font-medium text-gray-900">
                  {loc.address?.line1}
                </p>
                {loc.address?.line2 && (
                  <p className="text-sm text-gray-700">{loc.address.line2}</p>
                )}
                <p className="text-sm text-gray-700">
                  {[
                    loc.address?.town,
                    loc.address?.county,
                    loc.address?.postcode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="text-sm text-gray-500">{loc.address?.country}</p>
                {loc.latitude != null && loc.longitude != null && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
                  >
                    Open in Google Maps →
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </RestaurantShell>
  );
}

function RestaurantShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-5 py-3.5 flex items-center gap-3">
        <Link
          href="/"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
        {children}
      </main>
    </div>
  );
}

function RestaurantFallback() {
  return (
    <RestaurantShell>
      <p aria-busy className="text-sm text-gray-500">
        Loading restaurant…
      </p>
    </RestaurantShell>
  );
}
