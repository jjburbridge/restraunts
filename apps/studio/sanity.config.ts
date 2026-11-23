import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { ArrayClearInput } from "./components/ArrayClearInput";
import { unsetFieldAction } from "./fieldActions/unsetFieldAction";
import { tourPlugin } from "./plugins/studio-tour";
import { schemaTypes } from "./schemaTypes";
import { structure } from "./structure";
import { fieldExplorerTool } from "./tools/fieldExplorer";

export default defineConfig({
  name: "default",
  title: "Restaurants",

  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET!,

  plugins: [
    structureTool({ structure }),
    visionTool(),
    tourPlugin({
      docTypes: ["restaurant", "location", "cuisine"],
      fieldTargets: [
        { title: "Restaurant name", field: "restaurant_name" },
        { title: "Restaurant locations", field: "locations" },
        { title: "Average rating", field: "avg_rating" },
        { title: "Cuisines", field: "cuisines" },
        { title: "Features", field: "features" },
        { title: "Location latitude", field: "latitude" },
        { title: "Location address", field: "address" },
        { title: "Address postcode", field: "address.postcode" },
        { title: "Cuisine name", field: "name" },
      ],
    }),
  ],

  tools: [fieldExplorerTool()],

  schema: {
    types: schemaTypes,
  },

  document: {
    unstable_fieldActions: (prev) => [...prev, unsetFieldAction],
  },

  form: {
    components: {
      input: ArrayClearInput,
    },
  },
});
