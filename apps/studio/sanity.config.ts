import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { presentationTool } from "sanity/presentation";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./schemaTypes";
import { resolve } from "./presentation/resolve";
import { media } from "sanity-plugin-media";
// import { restaurantsTool } from "./tools/RestaurantsTool";

const PREVIEW_URL =
  process.env.SANITY_STUDIO_PREVIEW_URL || "http://localhost:3000";

export default defineConfig({
  name: "default",
  title: "Restaurants",

  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET!,

  plugins: [
    structureTool(),
    presentationTool({
      resolve,
      previewUrl: {
        origin: PREVIEW_URL,
        previewMode: {
          enable: "/api/draft-mode/enable",
        },
      },
    }),
    media(),
    visionTool(),
  ],
  // advancedVersionControl: {
  //   enabled: true,
  // },
  // tools: [restaurantsTool()],
  // beta: {
  //   variants: {
  //     enabled: true,
  //   },
  // },

  schema: {
    types: schemaTypes,
  },
});
