import { defineCliConfig } from "sanity/cli";

const dataset = process.env.SANITY_STUDIO_DATASET || "production";
const projectId = process.env.SANITY_STUDIO_PROJECT_ID || "s6y3amel";

export default defineCliConfig({
  api: {
    projectId,
    dataset,
  },
});
