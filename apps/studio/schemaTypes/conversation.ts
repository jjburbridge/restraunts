import {CommentIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const conversation = defineType({
  name: 'conversation',
  title: 'Conversation',
  icon: CommentIcon,
  type: 'document',
  fields: [
    defineField({
      name: 'sessionId',
      title: 'Session ID',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'classification',
      title: 'Classification',
      type: 'string',
      options: {
        list: [
          {title: 'Recommendation', value: 'recommendation'},
          {title: 'Booking', value: 'booking'},
          {title: 'Menu', value: 'menu'},
          {title: 'Location', value: 'location'},
          {title: 'Complaint', value: 'complaint'},
          {title: 'General', value: 'general'},
        ],
      },
    }),
    defineField({
      name: 'messages',
      title: 'Messages',
      type: 'array',
      readOnly: true,
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'role', type: 'string', title: 'Role'}),
            defineField({name: 'content', type: 'text', title: 'Content'}),
          ],
          preview: {
            select: {title: 'role', subtitle: 'content'},
            prepare({title, subtitle}) {
              return {
                title: title === 'user' ? '👤 User' : '🤖 Assistant',
                subtitle,
              }
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'startedAt',
      title: 'Started At',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'updatedAt',
      title: 'Last Updated',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      classification: 'classification',
      startedAt: 'startedAt',
      msg0: 'messages.0.content',
    },
    prepare({classification, startedAt, msg0}) {
      return {
        title: classification
          ? classification.charAt(0).toUpperCase() + classification.slice(1)
          : 'Unclassified',
        subtitle: msg0
          ? msg0.slice(0, 60) + (msg0.length > 60 ? '…' : '')
          : startedAt
            ? new Date(startedAt).toLocaleString()
            : '',
      }
    },
  },
})
