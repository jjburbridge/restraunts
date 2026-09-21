import { set, StringInputProps } from "sanity";
import { Option } from "../schemaTypes/feature";
import { Card, Inline, Button } from "@sanity/ui";

export const OptionsAsProps = (
  props: StringInputProps & { options: Option[] },
) => {
  return (
    <Card padding={4} style={{ textAlign: "center" }}>
      <Inline gap={[3, 3, 4]}>
        {props.options.map((option) => (
          <Button
            key={option.value}
            value={option.value}
            icon={option.icon}
            text={option.title}
            tone={option.value === props.value ? "primary" : "default"}
            onClick={() => props.onChange(set(option.value))}
          />
        ))}
      </Inline>
    </Card>
  );
};
