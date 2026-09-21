import { InlineIcon } from "@sanity/icons/Inline";
import { PanelLeftIcon } from "@sanity/icons/PanelLeft";
import { PanelRightIcon } from "@sanity/icons/PanelRight";
import { StarIcon } from "@sanity/icons/Star";
import { defineField, defineType } from "sanity";
import { Options } from "../components/Options";

export type Option = {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType;
};
const OptionsData: Option[] = [
  {
    title: "Small",
    value: "small",
    description: "Image: 30%, text: 70%",
    icon: PanelLeftIcon,
  },
  {
    title: "Medium",
    value: "medium",
    description: "Image: 50%, text: 50%",
    icon: InlineIcon,
  },
  {
    title: "Large",
    value: "large",
    description: "Image: 70%, text: 30%",
    icon: PanelRightIcon,
  },
];
/**
 * Feature schema. An amenity or feature offered by a restaurant.
 */
export const feature = defineType({
  name: "feature",
  title: "Feature",
  icon: StarIcon,
  type: "document",
  fields: [
    defineField({
      name: "name",
      type: "string",
      validation: (rule) => rule.required().error("A feature must have a name"),
    }),
    defineField({
      name: "width",
      type: "string",
      options: {
        list: OptionsData as Option[],
      },
      validation: (rule) =>
        rule.required().error("A feature must have an icon"),
      components: {
        input: Options,
      },
    }),
  ],
  preview: {
    select: { title: "name" },
  },
});
