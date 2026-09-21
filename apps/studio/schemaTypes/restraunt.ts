import { DocumentTextIcon } from "@sanity/icons/DocumentText";
import { defineArrayMember, defineField, defineType } from "sanity";
import { ImageAlt } from "../components/ImageAlt";

function hasImageAltText(
  value: string | Record<string, string> | null | undefined,
) {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (value && typeof value === "object") {
    return Object.values(value).some(
      (part) => typeof part === "string" && part.trim().length > 0,
    );
  }

  return false;
}

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
          validation: (rule) =>
            rule.custom(async (value, context) => {
              const documentAlt =
                typeof value === "string" ? value.trim() : "";
              if (documentAlt) {
                return true;
              }

              const parent = context.parent as
                | {
                    asset?: { _ref?: string };
                    altCheckNonce?: number;
                  }
                | undefined;
              const assetId = parent?.asset?._ref;
              if (!assetId) {
                return "An Alt Text is required";
              }

              const client = context
                .getClient({ apiVersion: "2026-09-18" })
                .withConfig({ useCdn: false });
              const imageAsset = await client.fetch<{
                altText?: string | Record<string, string> | null;
              } | null>(
                `*[_type == "sanity.imageAsset" && _id == $id][0]{altText}`,
                {
                  id: assetId,
                  nonce: parent?.altCheckNonce ?? 0,
                },
              );

              return hasImageAltText(imageAsset?.altText)
                ? true
                : "An Alt Text is required";
            }),
        }),
        defineField({
          name: "altCheckNonce",
          type: "number",
          hidden: true,
        }),
      ],
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
