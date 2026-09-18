import { StarIcon } from "@sanity/icons/Star";
import { defineField, defineType } from "sanity";

import { createDraftsCrossDatasetInput } from "./DraftsCrossDatasetInput";

const PRODUCTION_DATASET = "production";
const PRODUCTION_STUDIO_URL =
  process.env.SANITY_STUDIO_PRODUCTION_STUDIO_URL || "http://localhost:3333";

const restaurantInput = createDraftsCrossDatasetInput({
  type: "restaurant",
  preview: {
    select: {
      title: "restaurant_name",
      subtitle: "cuisines.name",
    },
  },
});

/**
 * Review schema. A private-dataset review of a restaurant, typically pending
 * moderation before being surfaced elsewhere.
 */
export const review = defineType({
  name: "review",
  title: "Review",
  icon: StarIcon,
  type: "document",
  fields: [
    defineField({
      name: "restaurant",
      title: "Restaurant",
      type: "crossDatasetReference",
      dataset: PRODUCTION_DATASET,
      weak: true,
      description:
        "Restaurants from the production dataset, including unpublished drafts.",
      studioUrl: ({ id, type }) =>
        `${PRODUCTION_STUDIO_URL}/structure/intent/edit/id=${id};type=${type}`,
      to: [
        {
          type: "restaurant",
          preview: {
            select: {
              title: "restaurant_name",
              subtitle: "cuisines.name",
            },
          },
        },
      ],
      components: {
        input: restaurantInput,
      },
      validation: (rule: { required: () => unknown }) => rule.required(),
    }),
    defineField({
      name: "reviewer_name",
      title: "Reviewer Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "rating",
      title: "Rating",
      type: "number",
      description: "1 (worst) to 5 (best).",
      validation: (rule) => rule.required().min(1).max(5).integer(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "text",
      rows: 6,
    }),
    defineField({
      name: "visit_date",
      title: "Visit Date",
      type: "date",
    }),
    defineField({
      name: "moderation_status",
      title: "Moderation Status",
      type: "string",
      initialValue: "pending",
      options: {
        list: [
          { title: "Pending", value: "pending" },
          { title: "Approved", value: "approved" },
          { title: "Rejected", value: "rejected" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "verified",
      title: "Verified Visit",
      type: "boolean",
      description:
        "Has this visit been verified (e.g. against a booking or receipt)?",
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      restaurant: "restaurant.restaurant_name",
      reviewer: "reviewer_name",
      rating: "rating",
      status: "moderation_status",
      title: "title",
    },
    prepare({ restaurant, reviewer, rating, status, title }) {
      const stars = typeof rating === "number" ? "★".repeat(rating) : "";
      const headline = title || `Review by ${reviewer || "Anonymous"}`;
      const date = new Date();
      return {
        title: `${date.toLocaleDateString()} · ${restaurant} · ${stars ? `${stars} · ` : ""}${headline}`,
        subtitle: `${reviewer || "Anonymous"}${status ? ` · ${status}` : ""}`,
      };
    },
  },
});
