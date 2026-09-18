import { defineLocations, type PresentationPluginOptions } from 'sanity/presentation'

export const resolve: PresentationPluginOptions['resolve'] = {
  locations: {
    restaurant: defineLocations({
      select: {
        _id: '_id',
        restaurant_name: 'restaurant_name',
      },
      resolve: (doc) => ({
        locations: [
          {
            title: doc?.restaurant_name || 'Untitled restaurant',
            href: `/restaurants/${doc?._id}`,
          },
          { title: 'All restaurants', href: '/' },
        ],
      }),
    }),
  },
}
