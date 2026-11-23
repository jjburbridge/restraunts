import { useState, type ReactNode } from "react";
import { TrashIcon } from "@sanity/icons/Trash";
import { Box, Button, Dialog, Flex, Stack, Text } from "@sanity/ui";
import {
  isArrayOfObjectsInputProps,
  isArrayOfPrimitivesInputProps,
  unset,
  type ArrayOfObjectsInputProps,
  type ArrayOfPrimitivesInputProps,
  type InputProps,
} from "sanity";

type ArrayInputProps = ArrayOfObjectsInputProps | ArrayOfPrimitivesInputProps;

function ClearableArrayInput({
  props,
  renderDefault,
}: {
  props: ArrayInputProps;
  renderDefault: () => ReactNode;
}) {
  const { id, onChange, readOnly, schemaType, value } = props;
  const [isConfirming, setIsConfirming] = useState(false);
  const itemCount = value?.length ?? 0;
  const fieldTitle = schemaType.title ?? "this field";

  const handleClear = () => {
    onChange(unset());
    setIsConfirming(false);
  };

  return (
    <Stack gap={3}>
      {renderDefault()}

      {itemCount > 0 && !readOnly && (
        <Flex justify="flex-end">
          <Button
            icon={TrashIcon}
            mode="bleed"
            tone="critical"
            fontSize={1}
            padding={2}
            text="Clear all"
            onClick={() => setIsConfirming(true)}
          />
        </Flex>
      )}

      {isConfirming && (
        <Dialog
          id={`${id}-clear-all`}
          header={`Clear ${fieldTitle}?`}
          width={1}
          onClose={() => setIsConfirming(false)}
          footer={
            <Flex justify="flex-end" gap={2} padding={3}>
              <Button
                mode="bleed"
                text="Cancel"
                onClick={() => setIsConfirming(false)}
              />
              <Button tone="critical" text="Clear all" onClick={handleClear} />
            </Flex>
          }
        >
          <Box padding={4}>
            <Text size={1}>
              This removes all {itemCount} {itemCount === 1 ? "item" : "items"}{" "}
              from {fieldTitle}.
            </Text>
          </Box>
        </Dialog>
      )}
    </Stack>
  );
}

export function ArrayClearInput(props: InputProps) {
  if (
    !isArrayOfObjectsInputProps(props) &&
    !isArrayOfPrimitivesInputProps(props)
  ) {
    return props.renderDefault(props);
  }

  return (
    <ClearableArrayInput
      props={props}
      renderDefault={() => props.renderDefault(props)}
    />
  );
}
