import { DocumentTextIcon } from "@sanity/icons/DocumentText";
import { defineArrayMember, defineField, defineType } from "sanity";
import { BodyStyle, TitleStyle } from "../components/text";

/**
 * Restaurant schema. Define and edit the fields for the 'restaurant' content type.
 */
export const restaurant = defineType({
  name: "restaurant",
  title: "Restaurant",
  icon: DocumentTextIcon,
  type: "document",
  fields: [
    defineField({
      name: "restaurant_name",
      title: "Restaurant Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "locations",
      title: "Locations",
      type: "array",
      of: [
        defineArrayMember({ type: "reference", to: [{ type: "location" }] }),
      ],
    }),
    defineField({
      name: "avg_rating",
      title: "Average Rating",
      type: "number",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "default_language",
      title: "Default Language",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "gluten_free",
      title: "Gluten Free",
      type: "boolean",
    }),
    defineField({
      name: "cuisines",
      title: "Cuisines",
      type: "reference",
      to: [{ type: "cuisine" }],
    }),
    defineField({
      name: "top_tags",
      title: "Top Tags",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "tag" }] })],
    }),
    defineField({
      name: "features",
      title: "Features",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "feature" }] })],
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "array",
      of: [
        defineArrayMember({
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "H1", value: "h1" },
            { title: "H2", value: "h2" },
            { title: "H3", value: "h3" },
            { title: "Quote", value: "blockquote" },
            {
              title: "Title",
              value: "title",
              component: TitleStyle,
            },
            {
              title: "Body",
              value: "body",
              component: BodyStyle,
            },
          ],
        }),
        defineArrayMember({
          type: "table",
        }),
      ],
      components: {
        portableText: {
          plugins: (props) => {
            return props.renderDefault({
              ...props,
              plugins: {
                ...props.plugins,
                table: {
                  enabled: true,
                },
              },
            });
          },
        },
      },
    }),
  ],
  preview: {
    select: {
      title: "restaurant_name",
      subtitle: "cuisines.name",
      language: "default_language",
    },
    prepare({ title, subtitle }) {
      return { title, subtitle };
    },
  },
});

export const table = defineType({
  type: "object",
  name: "table",
  fields: [
    defineField({ type: "number", name: "headerRows" }),
    defineField({
      type: "array",
      name: "rows",
      of: [
        defineArrayMember({
          type: "object",
          name: "row",
          fields: [
            defineField({
              type: "array",
              name: "cells",
              of: [
                defineArrayMember({
                  type: "object",
                  name: "cell",
                  fields: [
                    defineField({
                      type: "array",
                      name: "value",
                      of: [defineArrayMember({ type: "block" })],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ],
});
