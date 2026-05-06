import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { agentContextPlugin } from "@sanity/agent-context/studio";
import { schemaTypes } from "./schemaTypes";

export default defineConfig({
  name: "default",
  title: "Restaurants",

  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET!,

  plugins: [structureTool(), visionTool(), agentContextPlugin()],

  schema: {
    types: schemaTypes,
  },
});
