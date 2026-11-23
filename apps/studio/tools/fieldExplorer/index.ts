import { DatabaseIcon } from "@sanity/icons/Database";
import type { Tool } from "sanity";

import { FieldExplorerTool } from "./FieldExplorerTool";

export const fieldExplorerTool = (): Tool => ({
  name: "field-explorer",
  title: "Field Explorer",
  icon: DatabaseIcon,
  component: FieldExplorerTool,
});
