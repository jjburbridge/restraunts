import {EarthGlobeIcon} from '@sanity/icons/EarthGlobe'
import {defineField, defineType} from 'sanity'

/**
 * Location schema. Define fields for the 'location' content type.
 */
export const location = defineType({
  name: 'location',
  title: 'Location',
  icon: EarthGlobeIcon,
  type: 'document',
  fields: [
    defineField({
      name: 'coordinates',
      title: 'Coordinates',
      type: 'geopoint',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'address',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'address.line1',
      subtitle: 'address.town',
    },
  },
})
