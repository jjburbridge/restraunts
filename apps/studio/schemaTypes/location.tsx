import { EarthGlobeIcon } from "@sanity/icons/EarthGlobe";
import InlineIcon from "@sanity/icons/Inline";
import PanelLeftIcon from "@sanity/icons/PanelLeft";
import PanelRightIcon from "@sanity/icons/PanelRight";
import { defineField, defineType, StringInputProps } from "sanity";
import { OptionsAsProps } from "../components/OptionsAsProps";

const Options = [
  {
    title: "Left",
    value: "left",
    description: "Left aligned",
    icon: PanelLeftIcon,
  },
  {
    title: "Inline",
    value: "inline",
    description: "Image: 50%, text: 50%",
    icon: InlineIcon,
  },
  {
    title: "Right",
    value: "right",
    description: "Image: 70%, text: 30%",
    icon: PanelRightIcon,
  },
];
/**
 * Location schema. Define fields for the 'location' content type.
 */
export const location = defineType({
  name: "location",
  title: "Location",
  icon: EarthGlobeIcon,
  type: "document",
  fields: [
    defineField({
      name: "latitude",
      title: "Latitude",
      type: "number",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "longitude",
      title: "Longitude",
      type: "number",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "address",
      title: "Address",
      type: "address",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "options",
      type: "string",
      components: {
        input: (props: StringInputProps) => (
          <OptionsAsProps options={Options} {...props} />
        ),
      },
    }),
  ],
  preview: {
    select: {
      title: "address.line1",
      subtitle: "address.town",
    },
  },
});
