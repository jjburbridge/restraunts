import { Card, Inline, Button } from "@sanity/ui";
import { set, StringInputProps, TitledListValue } from "sanity";
import { Option } from "../schemaTypes/feature";

export function Options(props: StringInputProps) {
  return (
    <Card padding={4} style={{ textAlign: "center" }}>
      <Inline gap={[3, 3, 4]}>
        {(props.schemaType.options?.list as Option[] | undefined)?.map(
          (option) => (
            <Button
              key={option.value}
              value={option.value}
              icon={option.icon}
              text={option.title}
              tone={option.value === props.value ? "primary" : "default"}
              onClick={() => props.onChange(set(option.value))}
            />
          ),
        )}
      </Inline>
    </Card>
  );
}
