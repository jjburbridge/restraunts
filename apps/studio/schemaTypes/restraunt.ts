import { DocumentTextIcon } from "@sanity/icons/DocumentText";
import { defineArrayMember, defineField, defineType } from "sanity";
import { ImageAlt } from "../components/ImageAlt";

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
      name: "image",
      title: "Image",
      type: "image",
      fields: [
        defineField({
          name: "alt",
          title: "Alt",
          type: "string",
          description:
            "Overrides the alt text stored on the image in Media. Leave empty to use the image's alt text.",
          components: {
            input: ImageAlt,
          },
        }),
      ],
    }),
    defineField({
      name: "locations",
      title: "Locations",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "location" }] })],
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
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "cuisine" }] })],
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
  ],
});
