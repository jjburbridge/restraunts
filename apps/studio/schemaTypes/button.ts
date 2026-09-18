import {LaunchIcon} from '@sanity/icons/Launch'
import {defineField, defineType} from 'sanity'

/**
 * Button schema. A call-to-action button with localized accessibility labels.
 */
export const button = defineType({
  name: 'button',
  title: 'Button',
  icon: LaunchIcon,
  type: 'document',
  fieldsets: [
    {
      name: 'accessibility',
      title: 'Accessibility Labels',
      description: 'Localized accessibility (aria) labels for the button.',
      options: {collapsible: true, collapsed: true},
    },
  ],
  fields: [
    defineField({
      name: 'buttonText',
      title: 'Button Text',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'pageName',
      title: 'Page Name',
      type: 'string',
    }),
    defineField({
      name: 'colourName',
      title: 'Colour Name',
      type: 'string',
    }),
    defineField({
      name: 'pageType',
      title: 'Page Type',
      type: 'string',
    }),
    defineField({
      name: 'accessibilityLabelEn',
      title: 'Accessibility Label (EN)',
      type: 'string',
      fieldset: 'accessibility',
    }),
    defineField({
      name: 'accessibilityLabelNl',
      title: 'Accessibility Label (NL)',
      type: 'string',
      fieldset: 'accessibility',
    }),
    defineField({
      name: 'accessibilityLabelDe',
      title: 'Accessibility Label (DE)',
      type: 'string',
      fieldset: 'accessibility',
    }),
    defineField({
      name: 'accessibilityLabelFr',
      title: 'Accessibility Label (FR)',
      type: 'string',
      fieldset: 'accessibility',
    }),
    defineField({
      name: 'accessibilityLabelEs',
      title: 'Accessibility Label (ES)',
      type: 'string',
      fieldset: 'accessibility',
    }),
    defineField({
      name: 'accessibilityLabelIt',
      title: 'Accessibility Label (IT)',
      type: 'string',
      fieldset: 'accessibility',
    }),
    defineField({
      name: 'accessibilityLabelDa',
      title: 'Accessibility Label (DA)',
      type: 'string',
      fieldset: 'accessibility',
    }),
    defineField({
      name: 'accessibilityLabelPl',
      title: 'Accessibility Label (PL)',
      type: 'string',
      fieldset: 'accessibility',
    }),
  ],
  preview: {
    select: {title: 'buttonText', subtitle: 'pageName'},
  },
})
